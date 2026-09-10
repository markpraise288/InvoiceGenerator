const User = require("../users/user.model");
const bcrypt = require("bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/tokens");
const crypto = require("crypto");
const wecomeTemplate = require("../../infrastructure/templates/welcome.template");
const resetPasswordTemplate = require("../../infrastructure/templates/resetPassword.template");
const Workspace = require("../settings/workspace.model");
const sendEmail = require("../../infrastructure/email/email.service").sendEmail;

const signup = async ({ email, password, phone, name, companyName, address }) => {
  const userExistence = await User.findOne({ email });

  if (userExistence) {
    const error = new Error("User Already Exists");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const workspace = await Workspace.create({
    name: companyName,
  });

  const user = await User.create({
    email,
    password: hashedPassword,
    phone,
    name,
    address,
    companyName,
    workspaceId: workspace._id
  });

  // The workspace couldn't have an owner until the user existed — set it now
  workspace.ownerId = user._id;
  await workspace.save();

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Welcome",
    html: wecomeTemplate({
      name: user.name,
    }),
  });

  return { accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const error = new Error("Invalid credetials");
    error.statusCode = 403;
    throw error;
  }

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};

// Called by googleCallbackHandler with the verified Google profile
// (req.user, passed through untouched by passport.js). Mirrors signup():
// find-or-create a user + workspace, then issue tokens the same way.
//
// Note: if the callback carries an invitation token (state param), it tries
// invitation.service.js's acceptInvitationViaGoogle() FIRST and only falls
// back to this function if there's no invite or it didn't match — see
// auth.google.controller.js.
const loginWithGoogle = async (profile) => {
  const email = profile.emails?.[0]?.value;

  if (!email) {
    const error = new Error("Google account has no public email");
    error.statusCode = 400;
    throw error;
  }

  let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;

    // Placeholder name — Google doesn't give us a company. The user fills
    // in the real one on /profile right after this (see googleCallbackHandler).
    const workspace = await Workspace.create({
      name: `${profile.displayName || "My"}'s Workspace`,
    });

    user = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email,
      avatar: profile.photos?.[0]?.value,
      workspaceId: workspace._id,
      // no password — schema allows this when googleId is set
    });

    workspace.ownerId = user._id;
    await workspace.save();

    await sendEmail({
      to: user.email,
      subject: "Welcome",
      html: wecomeTemplate({
        name: user.name,
      }),
    });
  } else if (!user.googleId) {
    // Existing email/password account signing in with Google for the first time
    user.googleId = profile.id;
    await user.save();
  }

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  // Same as signup/login — refreshAccessToken() and logout() both look users
  // up by this field, so a Google session has to persist it too
  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken, isNewUser };
};

const logout = async ({ refreshToken }) => {
  const user = await User.findOne({ refreshToken });

  if (!user) {
    const error = new Error("Access deny");
    error.statusCode = 403;
    throw error;
  }

  user.refreshToken = null;
  await user.save();

  return "Logged out";
};

const refreshAccessToken = async ({ refreshToken }) => {
  const user = await User.findOne({ refreshToken });

  if (!user || user.refreshToken !== refreshToken) {
    const error = new Error("Invalid or Expired refresh token");
    error.statusCode = 403;
    throw error;
  }

  const accessToken = await generateAccessToken(user);

  return { accessToken };
};

const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const forgotPasswordToken = crypto.createHash("sha256").update(crypto.randomBytes(20)).digest("hex");
  user.resetPasswordToken = forgotPasswordToken;
  user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  // Here you would typically send an email with the reset link
  await sendEmail({
    to: user.email,
    subject: "Password Reset",
    html: resetPasswordTemplate({
      resetLink: `http://localhost:3000/reset-password?token=${forgotPasswordToken}`,
    }),
  });

  return "Password reset email sent";
};

const resetPassword = async ({ token, newPassword }) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiry: { $gt: new Date(Date.now()) },
  });

  if (!user) {
    const error = new Error("Invalid or expired reset token");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  return "Password reset successful";
};

module.exports = {
  signup,
  refreshAccessToken,
  login,
  loginWithGoogle,
  logout,
  forgotPassword,
  resetPassword,
};