module.exports = {
    PORT: process.env.PORT || 3000,
    MONGODB_URL: process.env.MONGODB_URL || 'mongodb://localhost:27017/invoice_generator',
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    JWT_REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
}
