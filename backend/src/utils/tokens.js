const { JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRES_IN, JWT_REFRESH_TOKEN_EXPIRES_IN } = require('../config/env');

const jwt = require('jsonwebtoken');

const generateAccessToken = async (user) => {
    return jwt.sign(
        { id: user._id},
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN }
    );
}

const generateRefreshToken = async (user) => {
    return jwt.sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN}
    );
}

module.exports = { generateAccessToken, generateRefreshToken };

