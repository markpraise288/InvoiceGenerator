const User = require("../users/user.model");
const bcrypt = require("bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/tokens");
const crypto = require("crypto");
const { emailQueue } = require("../../infrastructure/queues/email.queue");

const signup = async ({ email, password, phone, name, companyName, address }) => {
  const userExistence = await User.findOne({ email });

  if (userExistence) {
    const error = new Error("User Already Exists");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    password: hashedPassword,
    phone,
    name,
    address,
    companyName
  });

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  await emailQueue.add(
    "Welcome Email",
    {
      email: user.email,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

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
  await emailQueue.add(
    "Password Reset Email",
    {
      email: user.email,
      resetLink: `http://localhost:3000/reset-password?token=${forgotPasswordToken}`,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

  return "Password reset email sent";
};

const resetPassword = async ({ token, newPassword }) => {
  console.log(new Date(Date.now() + 3600000));
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiry: { $gt: new Date(Date.now()) },
  });

  console.log(user);

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
  logout,
  forgotPassword,
  resetPassword,
};
