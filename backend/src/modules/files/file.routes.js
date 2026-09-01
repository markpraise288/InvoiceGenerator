// modules/files/file.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const { requirePermission } = require("../../middlewares/permissions.middleware");
const {
  validate,
  uploadFileSchema,
  updateFileSchema,
  attachFileSchema,
  queryFilesSchema,
} = require("./file.validate");
const {
  uploadMiddleware,
  uploadFile,
  uploadNewVersion,
  getFiles,
  getRecordFiles,
  getDownloadUrl,
  updateFile,
  attachToRecord,
  detachFromRecord,
  deleteFile,
  permanentlyDeleteFile,
  restoreFile,
  getStorageStats,
} = require("./file.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Special routes first ─────────────────────────────────────────────────────
// Fixed-string routes declared before /:fileId to prevent Express from
// capturing "record" or "stats" as a fileId param.

router.get(
  "/record",
  getRecordFiles                                 // GET /api/files/record?relatedTo=&relatedId=
);

router.get(
  "/stats",
  getStorageStats                                // GET /api/files/stats
);

// ─── Collection routes ─────────────────────────────────────────────────────────

router
  .route("/")
  .get(
    validate(queryFilesSchema, "query"),
    getFiles                                     // GET  /api/files
  )
  .post(
    requirePermission("create"),
    uploadMiddleware,
    validate(uploadFileSchema),
    uploadFile                                   // POST /api/files
  );

// ─── Individual file routes ─────────────────────────────────────────────────────

router
  .route("/:fileId")
  .patch(
    requirePermission("edit"),
    validate(updateFileSchema),
    updateFile                                   // PATCH  /api/files/:fileId
  )
  .delete(
    requirePermission("delete"),
    deleteFile                                    // DELETE /api/files/:fileId (soft delete)
  );

router.get(
  "/:fileId/download",
  getDownloadUrl                                  // GET /api/files/:fileId/download
);

router.post(
  "/:fileId/versions",
  requirePermission("create"),
  uploadMiddleware,
  uploadNewVersion                                // POST /api/files/:fileId/versions
);

router.patch(
  "/:fileId/attach",
  requirePermission("edit"),
  validate(attachFileSchema),
  attachToRecord                                  // PATCH /api/files/:fileId/attach
);

router.patch(
  "/:fileId/detach",
  requirePermission("edit"),
  detachFromRecord                                // PATCH /api/files/:fileId/detach
);

router.patch(
  "/:fileId/restore",
  requirePermission("edit"),
  restoreFile                                     // PATCH /api/files/:fileId/restore
);

router.delete(
  "/:fileId/permanent",
  requirePermission("delete"),
  permanentlyDeleteFile                           // DELETE /api/files/:fileId/permanent
);

module.exports = router;