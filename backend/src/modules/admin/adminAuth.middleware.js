const jwt = require("jsonwebtoken");
const User = require("../users/user.model");

const JWT_SECRET = process.env.JWT_SECRET;

// Verifies the JWT the same way your regular verifyToken does, but additionally
// enforces role === "superadmin" before allowing the request through. Kept as
// its own middleware (not a wrapper around verifyToken) so admin routes have
// zero dependency on however your regular auth middleware evolves later.
const verifySuperAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const error = new Error("Invalid or expired token");
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(decoded.id);
    
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 401;
      throw error;
    }

    if (user.role !== "superadmin") {
      const error = new Error("super-admin access required");
      error.statusCode = 403;
      throw error;
    }

    req.user = user;
    next();
  } catch (err) {
    const error = new Error("Authentication error");
    error.statusCode = 500;
    throw error;
  }
};

module.exports = verifySuperAdmin;