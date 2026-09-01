// modules/reports/report.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  getOverviewReport,
  getDealsReport,
  getLeadsReport,
  getTasksReport,
  getActivityReport,
} = require("./report.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Report routes ─────────────────────────────────────────────────────────────
// All GET — reports are read-only aggregations
// Query params supported on all routes:
//   ?from=ISO_DATE   filter data from this date
//   ?to=ISO_DATE     filter data to this date
//   ?owner=userId    scope to a specific user

router.get("/overview", getOverviewReport);   // GET /api/reports/overview
router.get("/deals", getDealsReport);         // GET /api/reports/deals
router.get("/leads", getLeadsReport);         // GET /api/reports/leads
router.get("/tasks", getTasksReport);         // GET /api/reports/tasks
router.get("/activity", getActivityReport);   // GET /api/reports/activity

module.exports = router;