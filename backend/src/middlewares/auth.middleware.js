const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { JWT_SECRET } = require('../config/env');

const authMiddleware = asyncHandler((req, res, next) => {
 /* const authHearder = req.headers.authorization;
  if (!authHearder) {
    const error = new Error("Please provide token");
    error.statusCode = 401;
    throw error;
  }


  const token = authHearder.split(" ")[1];
*/

  const token = req.cookies.accessToken;
  try{
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }

  next();
  
});

module.exports = authMiddleware;
