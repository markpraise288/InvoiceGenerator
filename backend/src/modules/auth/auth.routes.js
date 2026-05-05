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

module.exports = router;
