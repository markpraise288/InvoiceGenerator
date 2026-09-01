// modules/team/team.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const teamService = require("./team.service");

// ─── Get team members ──────────────────────────────────────────────────────────

const getTeamMembers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;

  const members = await teamService.getTeamMembers({ search, role, user: req.user });

  return res.status(200).json(
    new ApiResponse(200, "Team members fetched successfully", members)
  );
});

// ─── Get team overview stats ───────────────────────────────────────────────────

const getTeamOverview = asyncHandler(async (req, res) => {
  const overview = await teamService.getTeamOverview(req.user);

  return res.status(200).json(
    new ApiResponse(200, "Team overview fetched successfully", overview)
  );
});

// ─── Get member stats ──────────────────────────────────────────────────────────

const getMemberStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const stats = await teamService.getMemberStats(userId);

  return res.status(200).json(
    new ApiResponse(200, "Member stats fetched successfully", stats)
  );
});

// ─── Get member recent activity ────────────────────────────────────────────────

const getMemberRecentActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  const activities = await teamService.getMemberRecentActivity({
    userId,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      "Member activity fetched successfully",
      activities
    )
  );
});

// ─── Get team leaderboard ──────────────────────────────────────────────────────

const getTeamLeaderboard = asyncHandler(async (req, res) => {
  const { metric = "wonValue" } = req.query;

  try {
    const leaderboard = await teamService.getTeamLeaderboard({ metric, user: req.user });

    return res.status(200).json(
      new ApiResponse(
        200,
        "Team leaderboard fetched successfully",
        leaderboard
      )
    );
  } catch (err) {
    if (err.message === "INVALID_METRIC") {
      return res.status(400).json(
        new ApiResponse(
          400,
          "Invalid metric. Must be one of: wonValue, wonDeals, totalLeads, conversionRate, totalActivities",
          null
        )
      );
    }
    throw err;
  }
});

module.exports = {
  getTeamMembers,
  getTeamOverview,
  getMemberStats,
  getMemberRecentActivity,
  getTeamLeaderboard,
};