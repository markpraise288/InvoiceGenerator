// modules/settings/settings.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  validate,
  updateWorkspaceSchema,
  updateNotificationsSchema,
  updateFeaturesSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateMemberRoleSchema,
} = require("./settings.validate");
const {
  getSettings,
  updateWorkspace,
  updateNotifications,
  updateFeatures,
  getProfile,
  updateProfile,
  changePassword,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getApiKeys,
  createApiKey,
  revokeApiKey,
} = require("./settings.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── General settings ─────────────────────────────────────────────────────────

router.get("/", getSettings);                          // GET  /api/settings

// ─── Workspace settings ────────────────────────────────────────────────────────

router.patch(
  "/workspace/:id",
  validate(updateWorkspaceSchema),
  updateWorkspace                                       // PATCH /api/settings/workspace
);

// ─── Notification settings ─────────────────────────────────────────────────────

router.patch(
  "/notifications",
  validate(updateNotificationsSchema),
  updateNotifications                                   // PATCH /api/settings/notifications
);

// ─── Feature flags ─────────────────────────────────────────────────────────────

router.patch(
  "/features",
  validate(updateFeaturesSchema),
  updateFeatures                                        // PATCH /api/settings/features
);

// ─── Profile ───────────────────────────────────────────────────────────────────

router
  .route("/profile")
  .get(getProfile)                                      // GET   /api/settings/profile
  .patch(validate(updateProfileSchema), updateProfile); // PATCH /api/settings/profile

// ─── Password ──────────────────────────────────────────────────────────────────

router.patch(
  "/profile/password",
  validate(changePasswordSchema),
  changePassword                                        // PATCH /api/settings/profile/password
);

// ─── Team ──────────────────────────────────────────────────────────────────────

router.get("/team", getTeamMembers);                   // GET    /api/settings/team

router
  .route("/team/:userId")
  .patch(
    validate(updateMemberRoleSchema),
    updateMemberRole                                    // PATCH  /api/settings/team/:userId
  )
  .delete(removeMember);                               // DELETE /api/settings/team/:userId

// ─── Sessions ──────────────────────────────────────────────────────────────────

router.get("/sessions", getSessions);                  // GET    /api/settings/sessions

router.delete(
  "/sessions/all",
  revokeAllOtherSessions                               // DELETE /api/settings/sessions/all
);

router.delete(
  "/sessions/:sessionId",
  revokeSession                                        // DELETE /api/settings/sessions/:sessionId
);

// ─── API Keys ──────────────────────────────────────────────────────────────────

router
  .route("/api-keys")
  .get(getApiKeys)                                     // GET  /api/settings/api-keys
  .post(createApiKey);                                 // POST /api/settings/api-keys

router.delete(
  "/api-keys/:keyId",
  revokeApiKey                                         // DELETE /api/settings/api-keys/:keyId
);

module.exports = router;