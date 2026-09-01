const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../users/user.model");
const Workspace = require("../settings/workspace.model");
const Invitation = require("./invitation.model");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/tokens");
const sendEmail = require("../../infrastructure/email/email.service").sendEmail;
const invitationTemplate = require("../../infrastructure/templates/invitation.template");
const welcomeTemplate = require("../../infrastructure/templates/welcome.template");

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, as decided
const INVITABLE_ROLES = ["admin", "member", "viewer"]; // superadmin excluded

const generateToken = () =>
  crypto.createHash("sha256").update(crypto.randomBytes(20)).digest("hex");

const sendInvitationEmail = async ({ invitation, workspace, inviter }) => {
  const acceptUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitation.token}`;

  await sendEmail({
    to: invitation.email,
    subject: `${inviter?.name || "Someone"} invited you to join ${workspace.name} on BusinessFlow`,
    html: invitationTemplate({
      inviterName: inviter?.name || "A teammate",
      workspaceName: workspace.name,
      role: invitation.role,
      acceptUrl,
    }),
  });
};

// ─── Invite ──────────────────────────────────────────────────────────────────

const inviteMember = async ({ workspaceId, invitedByUserId, email, role }) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!INVITABLE_ROLES.includes(role)) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  // Already a member of this workspace? Nothing to invite.
  const existingMember = await User.findOne({ email: normalizedEmail, workspaceId });
  if (existingMember) {
    const error = new Error(`${normalizedEmail} is already a member of this workspace`);
    error.statusCode = 400;
    throw error;
  }

  const inviter = await User.findById(invitedByUserId);

  // Don't create a second pending invite for the same email — reuse and
  // resend the existing one instead (per the "invite twice" case).
  let invitation = await Invitation.findOne({
    email: normalizedEmail,
    workspaceId,
    status: "pending",
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  if (invitation) {
    invitation.token = token;
    invitation.expiresAt = expiresAt;
    invitation.role = role;
    invitation.invitedBy = invitedByUserId;
    await invitation.save();
  } else {
    invitation = await Invitation.create({
      email: normalizedEmail,
      workspaceId,
      role,
      invitedBy: invitedByUserId,
      status: "pending",
      token,
      expiresAt,
    });
  }

  await sendInvitationEmail({ invitation, workspace, inviter });

  return invitation;
};

// ─── Resend / Cancel / List ────────────────────────────────────────────────

const resendInvitation = async ({ invitationId, workspaceId }) => {
  const invitation = await Invitation.findOne({ _id: invitationId, workspaceId });
  if (!invitation) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status === "accepted") {
    const error = new Error("This invitation has already been accepted");
    error.statusCode = 400;
    throw error;
  }

  invitation.token = generateToken();
  invitation.expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
  invitation.status = "pending";
  await invitation.save();

  const [workspace, inviter] = await Promise.all([
    Workspace.findById(workspaceId),
    User.findById(invitation.invitedBy),
  ]);

  await sendInvitationEmail({ invitation, workspace, inviter });

  return invitation;
};

const cancelInvitation = async ({ invitationId, workspaceId }) => {
  const invitation = await Invitation.findOne({ _id: invitationId, workspaceId });
  if (!invitation) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status === "accepted") {
    const error = new Error("This invitation has already been accepted");
    error.statusCode = 400;
    throw error;
  }

  invitation.status = "cancelled";
  await invitation.save();

  return invitation;
};

// Flips any pending-but-past-expiry invites to "expired" before listing, so
// the status shown always reflects reality even if nothing else touched them
const syncExpiredInvitations = async (workspaceId) => {
  await Invitation.updateMany(
    { workspaceId, status: "pending", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
};

const listInvitations = async ({ workspaceId }) => {
  await syncExpiredInvitations(workspaceId);

  // Accepted invites are already represented by the member's own row in the
  // team list elsewhere — showing them again here would be redundant.
  return Invitation.find({ workspaceId, status: { $ne: "accepted" } })
    .sort({ createdAt: -1 })
    .populate("invitedBy", "name email");
};

// ─── Validate (public — powers the accept-invitation landing page) ──────────

const validateInvitationToken = async (token) => {
  const invitation = await Invitation.findOne({ token });

  if (!invitation) {
    const error = new Error("Invalid invitation link");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status === "cancelled") {
    const error = new Error("This invitation has been cancelled");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.status === "accepted") {
    const error = new Error("This invitation has already been accepted");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.status === "expired" || invitation.expiresAt < new Date()) {
    if (invitation.status !== "expired") {
      invitation.status = "expired";
      await invitation.save();
    }
    const error = new Error("This invitation has expired. Ask the workspace owner to resend it.");
    error.statusCode = 400;
    throw error;
  }

  const workspace = await Workspace.findById(invitation.workspaceId);
  if (!workspace) {
    const error = new Error("The workspace for this invitation no longer exists");
    error.statusCode = 404;
    throw error;
  }

  const existingUser = await User.findOne({ email: invitation.email });

  return {
    email: invitation.email,
    role: invitation.role,
    workspaceName: workspace.name,
    hasAccount: !!existingUser,
  };
};

// ─── Accept — existing logged-in user ───────────────────────────────────────

const acceptInvitationForExistingUser = async ({ token, userId }) => {
  const invitation = await Invitation.findOne({ token });

  if (!invitation || invitation.status !== "pending") {
    const error = new Error("This invitation is no longer valid");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = "expired";
    await invitation.save();
    const error = new Error("This invitation has expired. Ask the workspace owner to resend it.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Security: don't let someone accept an invite addressed to a different
  // email just because they happen to be logged in when they click the link
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    const error = new Error(
      "This invitation was sent to a different email address. Log in with that account to accept it."
    );
    error.statusCode = 403;
    throw error;
  }

  // Single-workspace-per-user model (per your current User schema): block
  // rather than silently move someone out of a workspace they already
  // belong to. Multi-workspace membership would need the WorkspaceMembership
  // model mentioned in the design doc — worth revisiting if this comes up.
  if (user.workspaceId && user.workspaceId.toString() !== invitation.workspaceId.toString()) {
    const error = new Error(
      "You're already a member of another workspace. Multi-workspace accounts aren't supported yet."
    );
    error.statusCode = 400;
    throw error;
  }

  user.workspaceId = invitation.workspaceId;
  user.role = invitation.role;

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();

  invitation.status = "accepted";
  invitation.acceptedAt = new Date();
  invitation.acceptedBy = user._id;
  await invitation.save();

  // New tokens matter here even for an "existing" user — their old JWT still
  // carries the OLD workspaceId, so without reissuing, they'd keep hitting
  // the previous workspace's data until that token happened to expire.
  return { accessToken, refreshToken };
};

// ─── Signup via invitation — no account yet ─────────────────────────────────

const signupViaInvitation = async ({ token, name, password, phone }) => {
  const invitation = await Invitation.findOne({ token });

  if (!invitation || invitation.status !== "pending") {
    const error = new Error("This invitation is no longer valid");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = "expired";
    await invitation.save();
    const error = new Error("This invitation has expired. Ask the workspace owner to resend it.");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: invitation.email });
  if (existingUser) {
    const error = new Error(
      "An account with this email already exists. Log in to accept the invitation instead."
    );
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email: invitation.email, // from the invitation, never from user input
    password: hashedPassword,
    name,
    phone,
    workspaceId: invitation.workspaceId,
    role: invitation.role,
  });

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();

  invitation.status = "accepted";
  invitation.acceptedAt = new Date();
  invitation.acceptedBy = user._id;
  await invitation.save();

  await sendEmail({
    to: user.email,
    subject: "Welcome",
    html: welcomeTemplate({ name: user.name }),
  });

  return { accessToken, refreshToken };
};

// ─── Accept via Google — called from googleCallbackHandler ─────────────────
// Returns null (never throws) when there's no usable invite, so the caller
// can cleanly fall back to normal loginWithGoogle().

const acceptInvitationViaGoogle = async ({ token, profile }) => {
  const invitation = await Invitation.findOne({ token });

  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return null;
  }

  const email = profile.emails?.[0]?.value;
  if (!email || email.toLowerCase() !== invitation.email.toLowerCase()) {
    // Google account doesn't match who this invite was sent to — don't
    // silently attach the wrong Google account to someone else's invite
    return null;
  }

  let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email,
      avatar: profile.photos?.[0]?.value,
      workspaceId: invitation.workspaceId,
      role: invitation.role,
    });

    await sendEmail({
      to: user.email,
      subject: "Welcome",
      html: welcomeTemplate({ name: user.name }),
    });
  } else {
    if (user.workspaceId && user.workspaceId.toString() !== invitation.workspaceId.toString()) {
      const error = new Error(
        "You're already a member of another workspace. Multi-workspace accounts aren't supported yet."
      );
      error.statusCode = 400;
      throw error;
    }
    if (!user.googleId) user.googleId = profile.id;
    user.workspaceId = invitation.workspaceId;
    user.role = invitation.role;
  }

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();

  invitation.status = "accepted";
  invitation.acceptedAt = new Date();
  invitation.acceptedBy = user._id;
  await invitation.save();

  return { accessToken, refreshToken, isNewUser };
};

module.exports = {
  inviteMember,
  resendInvitation,
  cancelInvitation,
  listInvitations,
  validateInvitationToken,
  acceptInvitationForExistingUser,
  signupViaInvitation,
  acceptInvitationViaGoogle,
};