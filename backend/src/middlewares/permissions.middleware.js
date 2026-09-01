// middlewares/permissions.middleware.js

// ─── Role → allowed actions map ────────────────────────────────────────────────
// Mirrors frontend lib/permissions.ts exactly — keep both in sync manually,
// or move this to a shared package if the project ever becomes a monorepo.

const ROLE_PERMISSIONS = {
  admin: [
    "create",
    "edit",
    "delete",
    "view",
    "export",
    "invite",
    "manageRoles",
    "manageBilling",
    "manageSettings",
  ],
  member: ["create", "edit", "delete", "view", "export"],
  viewer: ["view"],
};

// ─── Core checks ────────────────────────────────────────────────────────────────

/**
 * Can this role perform this action?
 */
const roleCan = (role, action) => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
};

/**
 * Can this role perform ALL of the given actions?
 */
const roleCanAll = (role, actions) =>
  actions.every((action) => roleCan(role, action));

/**
 * Can this role perform ANY of the given actions?
 */
const roleCanAny = (role, actions) =>
  actions.some((action) => roleCan(role, action));

/**
 * Returns the full list of actions a role is allowed to perform.
 */
const getAllowedActions = (role) => ROLE_PERMISSIONS[role] ?? [];

// ─── Express middleware factory ────────────────────────────────────────────────
// Usage: router.post("/", verifyToken, requirePermission("create"), createLead)
// Usage (any-of):  requirePermission(["edit", "manageSettings"], { mode: "any" })
// Usage (all-of):  requirePermission(["edit", "manageSettings"], { mode: "all" })

const requirePermission = (actionOrActions, options = {}) => {
  const { mode = "all" } = options;
  const actions = Array.isArray(actionOrActions)
    ? actionOrActions
    : [actionOrActions];

  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const allowed =
      mode === "any" ? roleCanAny(role, actions) : roleCanAll(role, actions);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to perform this action",
      });
    }

    next();
  };
};

module.exports = {
  ROLE_PERMISSIONS,
  roleCan,
  roleCanAll,
  roleCanAny,
  getAllowedActions,
  requirePermission,
};