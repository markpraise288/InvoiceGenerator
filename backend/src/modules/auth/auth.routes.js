const express = require('express');
const { loginSchema, registerSchema } = require('../../modules/auth/auth.validate');
const { signupHandler, loginHandler, logoutHandler, refreshAccessTokenHandler, forgotPasswordHandler, resetPasswordHandler } = require('./auth.controller');
const router = express.Router();
const validate = require('../../middlewares/validate');
const { loginLimiter } = require('../../middlewares/loginRateLimiter.middleware');


router.post('/login', loginLimiter, validate(loginSchema), loginHandler);
router.post('/signup', validate(registerSchema), signupHandler);
router.post('/logout', logoutHandler);
router.get('/accessToken', refreshAccessTokenHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

// Add these near the top of modules/auth/auth.routes.js, with your other requires:
const passport = require("../../config/passport");
const { googleCallbackHandler } = require("./auth.google.controller");

// Add these two routes alongside your existing /login, /signup, etc:

// Kicks off the OAuth flow — redirects the browser to Google's consent screen
router.get("/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: req.query.invitationToken || "",
  })(req, res, next);
});

// Google redirects back here after the user approves — passport verifies the
// response, runs the strategy callback in config/passport.js, then
// googleCallbackHandler issues the same cookies loginHandler does and
// redirects into the app
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google`,
  }),
  googleCallbackHandler
);
module.exports = router;
