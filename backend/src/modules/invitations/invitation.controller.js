const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const {
  inviteMember: inviteMemberService,
  resendInvitation: resendInvitationService,
  cancelInvitation: cancelInvitationService,
  listInvitations: listInvitationsService,
  validateInvitationToken,
  acceptInvitationForExistingUser,
  signupViaInvitation: signupViaInvitationService,
} = require("./invitation.service");

// Same cookie options auth.controller.js's loginHandler uses — kept in sync
// manually since it isn't exported from there. If that shape ever changes,
// update this too.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ── Protected: workspace admin/owner only (requireWorkspaceAdmin middleware) ──

exports.inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const invitation = await inviteMemberService({
    workspaceId: req.user.workspaceId,
    invitedByUserId: req.user.id,
    email,
    role,
  });
  res.status(201).json(new ApiResponse(true, "Invitation sent", invitation));
});

exports.listInvitations = asyncHandler(async (req, res) => {
  const invitations = await listInvitationsService({ workspaceId: req.user.workspaceId });
  res.status(200).json(new ApiResponse(true, "Invitations retrieved", invitations));
});

exports.resendInvitation = asyncHandler(async (req, res) => {
  const invitation = await resendInvitationService({
    invitationId: req.params.id,
    workspaceId: req.user.workspaceId,
  });
  res.status(200).json(new ApiResponse(true, "Invitation resent", invitation));
});

exports.cancelInvitation = asyncHandler(async (req, res) => {
  const invitation = await cancelInvitationService({
    invitationId: req.params.id,
    workspaceId: req.user.workspaceId,
  });
  res.status(200).json(new ApiResponse(true, "Invitation cancelled", invitation));
});

// ── Protected: any logged-in user (accepting an invite addressed to them) ──

exports.acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await acceptInvitationForExistingUser({ token, userId: req.user.id });

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
  res.cookie("accessToken", result.accessToken, COOKIE_OPTIONS);

  res.status(200).json(
    new ApiResponse(true, "Invitation accepted", { accessToken: result.accessToken })
  );
});

// ── Public: no auth ──

exports.validateInvitation = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const data = await validateInvitationToken(token);
  res.status(200).json(new ApiResponse(true, "Invitation is valid", data));
});

exports.signupViaInvitation = asyncHandler(async (req, res) => {
  const { token, name, password, phone } = req.body;
  const result = await signupViaInvitationService({ token, name, password, phone });

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
  res.cookie("accessToken", result.accessToken, COOKIE_OPTIONS);

  res.status(201).json(
    new ApiResponse(true, "Account created and invitation accepted", {
      accessToken: result.accessToken,
    })
  );
});