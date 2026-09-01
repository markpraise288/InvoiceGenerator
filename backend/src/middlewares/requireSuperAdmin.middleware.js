const asyncHandler = require("../utils/asyncHandler");
const User = require("../modules/users/user.model");

// Must run after verifyToken. Loads the real User doc since role isn't in
// the JWT payload — same pattern as requireWorkspaceAdmin.middleware.js.
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "superadmin") {
    const error = new Error("Superadmin access required");
    error.statusCode = 403;
    throw error;
  }

  req.currentUser = user;
  next();
});

module.exports = requireSuperAdmin;