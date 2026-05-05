require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { PORT } = require("./config/validateEnv");
const connectDB = require("./infrastructure/database/db");
const logger = require("./utils/logger");

async function startServer() {
  try {
    // Connect database
    await connectDB();

    // Start API server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info("HTTP server closed.");
        await mongoose.connection.close(false);
        logger.info("MongoDB connection closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    logger.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

startServer();