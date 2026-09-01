// modules/team/team.service.js

const mongoose = require("mongoose");
const User = require("../users/user.model");
const Lead = require("../leads/lead.model");
const { Deal } = require("../deals/deal.model");
const Task = require("../tasks/task.model");
const { Activity } = require("../activities/activity.model");

// Fields to select when populating Activity.relatedId — superset across all
// six possible related models, same constant used in activity.service.js.
// Requires activity.model.js's relatedId to have refPath: "relatedTo" set.
const RELATED_POPULATE_FIELDS = "name title company email";

// ─── Get all team members with basic stats ─────────────────────────────────────

const getTeamMembers = async ({ search, role, user } = {}) => {
  const query = {};
  query.workspaceId = user.workspaceId;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { position: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;

  const users = await User.find(query)
    .select("-password -apiKeys -sessions -__v")
    .sort({ createdAt: 1 })
    .lean();

  return users;
};

// ─── Get member performance stats ─────────────────────────────────────────────

const getMemberStats = async (userId) => {
  const id = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    leadStats,
    dealStats,
    taskStats,
    activityStats,
  ] = await Promise.all([

    // ── Lead stats ──────────────────────────────────────────────────────────
    // Fixed: "$converted" doesn't exist on Lead — conversion is tracked via
    // convertedCustomer (an ObjectId ref, null until a lead is actually
    // converted to a Customer). Same fix applied in report.service.js.
    Lead.aggregate([
      { $match: { owner: id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $ne: ["$convertedCustomer", null] }, 1, 0] },
          },
          totalValue: { $sum: "$value" },
          thisMonth: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", monthStart] }, 1, 0],
            },
          },
        },
      },
    ]),

    // ── Deal stats ──────────────────────────────────────────────────────────
    // Unchanged — stage, value, owner all exist exactly as-is on deal.model.js.
    Deal.aggregate([
      { $match: { owner: id } },
      {
        $group: {
          _id: null,
          totalDeals: { $sum: 1 },
          wonDeals: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_won"] }, 1, 0],
            },
          },
          lostDeals: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_lost"] }, 1, 0],
            },
          },
          openValue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$stage", "closed_won"] },
                    { $ne: ["$stage", "closed_lost"] },
                  ],
                },
                "$value",
                0,
              ],
            },
          },
          wonValue: {
            $sum: {
              $cond: [
                { $eq: ["$stage", "closed_won"] },
                "$value",
                0,
              ],
            },
          },
        },
      },
    ]),

    // ── Task stats ──────────────────────────────────────────────────────────
    // Unchanged — assignedTo, completed, dueDate all exist exactly as-is.
    Task.aggregate([
      { $match: { assignedTo: id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ["$completed", 1, 0] },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$completed", false] },
                    { $lt: ["$dueDate", now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // ── Activity stats ──────────────────────────────────────────────────────
    // Unchanged — createdBy and type both exist as-is, and this aggregation
    // never referenced the broken "lead" field to begin with.
    Activity.aggregate([
      { $match: { createdBy: id } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const activityBreakdown = activityStats.reduce(
    (acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    },
    {}
  );

  const totalActivities = Object.values(activityBreakdown).reduce(
    (sum, c) => sum + c,
    0
  );

  const leads = leadStats[0] ?? {
    total: 0,
    converted: 0,
    totalValue: 0,
    thisMonth: 0,
  };

  const deals = dealStats[0] ?? {
    totalDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    openValue: 0,
    wonValue: 0,
  };

  const tasks = taskStats[0] ?? {
    total: 0,
    completed: 0,
    overdue: 0,
  };

  const closedDeals = deals.wonDeals + deals.lostDeals;

  return {
    leads: {
      ...leads,
      conversionRate:
        leads.total > 0
          ? Math.round((leads.converted / leads.total) * 100)
          : 0,
    },
    deals: {
      ...deals,
      winRate:
        closedDeals > 0
          ? Math.round((deals.wonDeals / closedDeals) * 100)
          : 0,
    },
    tasks: {
      ...tasks,
      completionRate:
        tasks.total > 0
          ? Math.round((tasks.completed / tasks.total) * 100)
          : 0,
    },
    activities: {
      total: totalActivities,
      breakdown: activityBreakdown,
    },
  };
};

// ─── Get team leaderboard ──────────────────────────────────────────────────────
// Unchanged — reads only from getMemberStats' already-corrected output, so no
// direct schema references to fix here.

const getTeamLeaderboard = async ({ metric = "wonValue", user } = {}) => {
  const VALID_METRICS = [
    "wonValue",
    "wonDeals",
    "totalLeads",
    "conversionRate",
    "totalActivities",
  ];

  if (!VALID_METRICS.includes(metric)) {
    throw new Error("INVALID_METRIC");
  }

  const users = await User.find({workspaceId: user.workspaceId})
    .select("name email avatar position role")
    .lean();

  const leaderboard = await Promise.all(
    users.map(async (user) => {
      const stats = await getMemberStats(user._id);
      return {
        user,
        stats,
        score:
          metric === "wonValue"
            ? stats.deals.wonValue
            : metric === "wonDeals"
            ? stats.deals.wonDeals
            : metric === "totalLeads"
            ? stats.leads.total
            : metric === "conversionRate"
            ? stats.leads.conversionRate
            : stats.activities.total,
      };
    })
  );

  return leaderboard
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

// ─── Get team overview stats ───────────────────────────────────────────────────
// Added "superadmin" to the role breakdown — your User model's role enum was
// extended to ["admin", "member", "viewer", "superadmin"] earlier in this
// build (for the platform admin panel). Leaving it out here wouldn't break
// anything, but any superadmin accounts would silently vanish from this
// breakdown instead of being counted anywhere.

const getTeamOverview = async (user) => {
  const [
    totalMembers,
    roleBreakdown,
    totalLeads,
    totalDeals,
    totalWonValue,
  ] = await Promise.all([
    User.countDocuments({ workspaceId: user.workspaceId }),
    User.aggregate([
      { $match: { workspaceId: user.workspaceId } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({ workspaceId: user.workspaceId }),
    Deal.countDocuments({ workspaceId: user.workspaceId }),
    Deal.aggregate([
      { $match: { stage: "closed_won", workspaceId: user.workspaceId } },
      { $group: { _id: null, total: { $sum: "$value" } } },
    ]),
  ]);

  const roles = roleBreakdown.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {});

  return {
    totalMembers,
    roles: {
      admin: roles.admin ?? 0,
      member: roles.member ?? 0,
      viewer: roles.viewer ?? 0,
      superadmin: roles.superadmin ?? 0,
    },
    totalLeads,
    totalDeals,
    totalWonValue: totalWonValue[0]?.total ?? 0,
  };
};

// ─── Get member recent activity ────────────────────────────────────────────────
// Fixed: .populate("lead", "name") -> .populate("relatedId", RELATED_POPULATE_FIELDS).
// Activity has no "lead" field — this was populating nothing every time,
// meaning leadName/leadId below were always undefined. Renamed the output
// shape to relatedLabel/relatedId/relatedTo so it actually reflects that a
// team member's activity can now be logged against any of six entity types,
// not just Leads.

const getMemberRecentActivity = async ({ userId, limit = 10 }) => {
  const activities = await Activity.find({
    createdBy: new mongoose.Types.ObjectId(userId),
  })
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return activities.map((a) => {
    const related = a.relatedId;
    const isPopulated = related && typeof related === "object";

    return {
      ...a,
      relatedLabel: isPopulated ? related.name ?? related.title ?? null : null,
      relatedId: isPopulated ? related._id : related,
      relatedTo: a.relatedTo,
    };
  });
};

module.exports = {
  getTeamMembers,
  getMemberStats,
  getTeamLeaderboard,
  getTeamOverview,
  getMemberRecentActivity,
};