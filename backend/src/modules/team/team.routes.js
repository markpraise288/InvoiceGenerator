// modules/team/team.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  getTeamMembers,
  getTeamOverview,
  getMemberStats,
  getMemberRecentActivity,
  getTeamLeaderboard,
} = require("./team.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Team-level routes ────────────────────────────────────────────────────────
// Declared before /:userId to prevent param capture

router.get("/overview", getTeamOverview);       // GET /api/team/overview
router.get("/leaderboard", getTeamLeaderboard); // GET /api/team/leaderboard?metric=wonValue

// ─── Member list ──────────────────────────────────────────────────────────────

router.get("/", getTeamMembers);                // GET /api/team?search=&role=

// ─── Member-scoped routes ─────────────────────────────────────────────────────

router.get(
  "/:userId/stats",
  getMemberStats                                // GET /api/team/:userId/stats
);

router.get(
  "/:userId/activity",
  getMemberRecentActivity                       // GET /api/team/:userId/activity?limit=10
);

module.exports = router;