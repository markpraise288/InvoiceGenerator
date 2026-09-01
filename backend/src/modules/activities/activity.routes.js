// modules/activities/activity.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  validate,
  createActivitySchema,
  updateActivitySchema,
  queryRecordActivitiesSchema,
  queryWorkspaceFeedSchema,
  queryRecentActivitySchema,
} = require("./activity.validate");
const {
  createActivity,
  getRecordActivities,
  getWorkspaceFeed,
  getRecentActivity,
  getActivity,
  getRecordActivityStats,
  updateActivity,
  deleteActivity,
} = require("./activity.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Special routes first ─────────────────────────────────────────────────────
// Fixed-string routes declared before /:activityId to prevent Express from
// capturing "record", "recent", or "stats" as an activityId param.

router.get(
  "/record",
  validate(queryRecordActivitiesSchema, "query"),
  getRecordActivities                            // GET /api/activities/record?relatedTo=&relatedId=
);

router.get(
  "/record/stats",
  getRecordActivityStats                         // GET /api/activities/record/stats?relatedTo=&relatedId=
);

router.get(
  "/recent",
  validate(queryRecentActivitySchema, "query"),
  getRecentActivity                              // GET /api/activities/recent
);

// ─── Collection routes ─────────────────────────────────────────────────────────

router
  .route("/")
  .get(
    validate(queryWorkspaceFeedSchema, "query"),
    getWorkspaceFeed                             // GET  /api/activities (workspace-wide feed)
  )
  .post(
    validate(createActivitySchema),
    createActivity                               // POST /api/activities
  );

// ─── Individual activity routes ─────────────────────────────────────────────────

router
  .route("/:activityId")
  .get(getActivity)                              // GET    /api/activities/:activityId
  .patch(
    validate(updateActivitySchema),
    updateActivity                               // PATCH  /api/activities/:activityId
  )
  .delete(deleteActivity);                       // DELETE /api/activities/:activityId

module.exports = router;