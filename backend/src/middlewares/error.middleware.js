const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/apiResponse");

const errorMiddleware = (err, req, res, next) => {
    let { statusCode, message } = err;

    if (!statusCode) {
        statusCode = 500;
    }

    const response = new ApiResponse(false, message || "Internal Server Error", null);

    if (process.env.NODE_ENV === "development") {
        response.stack = err.stack;
        logger.error(`[${req.method}] ${req.url} - ${message}`, { stack: err.stack });
    } else {
        logger.error(`[${req.method}] ${req.url} - ${message}`);
    }

    res.status(statusCode).json(response);
}

module.exports = errorMiddleware;