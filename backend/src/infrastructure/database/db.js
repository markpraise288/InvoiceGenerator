const mongoose = require('mongoose');
const { MONGODB_URL } = require('../../config/validateEnv');
const logger = require('../../utils/logger');

const connectDB = async () => {
    try {
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(MONGODB_URI, options);
        logger.info('MongoDB connected successfully');
    } catch (err) {
        logger.error(`MongoDB connection error: ${err.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

module.exports = connectDB;
