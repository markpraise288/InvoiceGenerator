const asyncHandler = require("../utils/asyncHandler");
const User = require("../modules/users/user.model");
const Workspace = require("../modules/settings/workspace.model");

// Must run after verifyToken. req.user is just the JWT payload ({id,
// workspaceId, iat, exp}) — it has no role, so this loads the real User
// doc to check it fresh rather than trusting a possibly-stale token claim.
// Rejects unless the requester is the workspace owner or an admin.
// Attaches req.currentUser, req.workspace, req.isWorkspaceOwner for reuse.
const requireWorkspaceAdmin = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const workspace = await Workspace.findById(req.user.workspaceId);
  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = workspace.ownerId && workspace.ownerId.toString() === user._id.toString();
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You don't have permission to manage the team");
    error.statusCode = 403;
    throw error;
  }

  req.currentUser = user;
  req.workspace = workspace;
  req.isWorkspaceOwner = isOwner;
  next();
});

module.exports = requireWorkspaceAdmin;