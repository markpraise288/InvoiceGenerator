
const loginRateLimiter = require('express-rate-limit');

// Rate limiter middleware for login attempts   
const loginLimiter = loginRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
}); 

module.exports = {
    loginLimiter
};
