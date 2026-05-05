const {
  signup,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
} = require("./auth.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");

const signupHandler = asyncHandler(async (req, res) => {
  const { email, password, phone, name, companyName, address } = req.body;

  const response = await signup({ email, password, phone, name, companyName, address });

  res.cookie("refreshToken", response.refreshToken, {
    httpOnly: true,
    secure: true, // true in production (HTTPS)
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json(new ApiResponse(true, "Account Created", response));
});


const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const response = await login({ email, password });

  res.cookie("refreshToken", response.refreshToken, {
    httpOnly: true,
    secure: true, // true in production (HTTPS)
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie("accessToken", response.accessToken, {
    httpOnly: true,
    secure: true, // true in production (HTTPS)
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res
    .status(200)
    .json(
      new ApiResponse(true, "Logged in successfully", { accessToken: response.accessToken })
    );
});

const logoutHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  const response = await logout({ refreshToken: refreshToken});

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.status(200).json(new ApiResponse(true, response));
});

const refreshAccessTokenHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;      

  if (!refreshToken) {
    const error = new Error("Missing credentials");
    error.statusCode = 400;
    throw error;
  }

  const response = await refreshAccessToken({ refreshToken: refreshToken });

  console.log(response.accessToken);

  res.cookie("accessToken", response.accessToken, {
    httpOnly: true,
    secure: true, // true in production (HTTPS)
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json(new ApiResponse(true, "Refresh token given", response));
});

const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await forgotPassword({ email });
  res.status(200).json(new ApiResponse(true, "Reset password link sent"));
});

const resetPasswordHandler = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;

  await resetPassword({ token, newPassword: password });
  res.status(200).json(new ApiResponse(true, "Password reset successful"));
});

module.exports = {
  signupHandler,
  loginHandler,
  logoutHandler,
  refreshAccessTokenHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
};
