// modules/reports/report.service.js

const mongoose = require("mongoose");
const { Deal, DEAL_STAGES } = require("../deals/deal.model");
const Lead = require("../leads/lead.model");
const Contact = require("../contacts/contact.model");
const Company = require("../companies/company.model");
const Task = require("../tasks/task.model");
const { Activity } = require("../activities/activity.model");

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toObjectId = (id) =>
  id ? new mongoose.Types.ObjectId(id) : null;

const dateRangeMatch = (from, to, field = "createdAt") => {
  const match = {};
  if (from || to) {
    match[field] = {};
    if (from) match[field].$gte = new Date(from);
    if (to) match[field].$lte = new Date(to);
  }
  return match;
};

// ─── Deals Report ──────────────────────────────────────────────────────────────
// Unchanged — every field referenced here (value, probability, stage, closeDate,
// closedAt, owner, createdAt) exists exactly as-is on deal.model.js.

const getDealsReport = async ({ from, to, ownerId } = {}) => {
  const match = {
    ...dateRangeMatch(from, to, "createdAt"),
  };
  if (ownerId) match.owner = toObjectId(ownerId);

  const [
    stageBreakdown,
    monthlyRevenue,
    ownerBreakdown,
    winLossRatio,
    avgDealSize,
    dealVelocity,
  ] = await Promise.all([

    // ── Stage breakdown ──────────────────────────────────────────────────────
    Deal.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
          avgValue: { $avg: "$value" },
          weightedValue: {
            $sum: {
              $floor: {
                $divide: [
                  { $multiply: ["$value", "$probability"] },
                  100,
                ],
              },
            },
          },
        },
      },
      { $sort: { totalValue: -1 } },
    ]),

    // ── Monthly revenue (won deals) ──────────────────────────────────────────
    Deal.aggregate([
      {
        $match: {
          ...match,
          stage: "closed_won",
          closedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$closedAt" },
            month: { $month: "$closedAt" },
          },
          revenue: { $sum: "$value" },
          count: { $sum: 1 },
          avgValue: { $avg: "$value" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // ── Deals by owner ───────────────────────────────────────────────────────
    Deal.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$owner",
          totalDeals: { $sum: 1 },
          totalValue: { $sum: "$value" },
          wonDeals: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_won"] }, 1, 0],
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
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalDeals: 1,
          totalValue: 1,
          wonDeals: 1,
          wonValue: 1,
          ownerName: "$owner.name",
          ownerEmail: "$owner.email",
        },
      },
      { $sort: { totalValue: -1 } },
    ]),

    // ── Win / loss ratio ─────────────────────────────────────────────────────
    Deal.aggregate([
      {
        $match: {
          ...match,
          stage: { $in: ["closed_won", "closed_lost"] },
        },
      },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
        },
      },
    ]),

    // ── Average deal size ────────────────────────────────────────────────────
    Deal.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          avgDealSize: { $avg: "$value" },
          medianApprox: { $avg: "$value" },
          maxDeal: { $max: "$value" },
          minDeal: { $min: "$value" },
          totalValue: { $sum: "$value" },
          totalCount: { $sum: 1 },
        },
      },
    ]),

    // ── Deal velocity (avg days from created to closed_won) ──────────────────
    Deal.aggregate([
      {
        $match: {
          ...match,
          stage: "closed_won",
          closedAt: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          daysToClose: {
            $divide: [
              { $subtract: ["$closedAt", "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDaysToClose: { $avg: "$daysToClose" },
          minDaysToClose: { $min: "$daysToClose" },
          maxDaysToClose: { $max: "$daysToClose" },
        },
      },
    ]),
  ]);

  const winLoss = winLossRatio.reduce((acc, item) => {
    acc[item._id] = { count: item.count, value: item.totalValue };
    return acc;
  }, {});

  const wonCount = winLoss.closed_won?.count ?? 0;
  const lostCount = winLoss.closed_lost?.count ?? 0;
  const closedCount = wonCount + lostCount;

  const months = monthlyRevenue.map((m) => ({
    year: m._id.year,
    month: m._id.month,
    label: new Date(m._id.year, m._id.month - 1).toLocaleString("en", {
      month: "short",
      year: "numeric",
    }),
    revenue: m.revenue,
    count: m.count,
    avgValue: Math.round(m.avgValue),
  }));

  return {
    stageBreakdown: stageBreakdown.map((s) => ({
      stage: s._id,
      count: s.count,
      totalValue: s.totalValue,
      avgValue: Math.round(s.avgValue),
      weightedValue: s.weightedValue,
    })),
    monthlyRevenue: months,
    ownerBreakdown,
    winLoss: {
      won: winLoss.closed_won ?? { count: 0, value: 0 },
      lost: winLoss.closed_lost ?? { count: 0, value: 0 },
      winRate:
        closedCount > 0
          ? Math.round((wonCount / closedCount) * 100)
          : 0,
    },
    dealMetrics: {
      ...(avgDealSize[0] ?? {
        avgDealSize: 0,
        maxDeal: 0,
        minDeal: 0,
        totalValue: 0,
        totalCount: 0,
      }),
      avgDealSize: Math.round(avgDealSize[0]?.avgDealSize ?? 0),
    },
    velocity: {
      avgDaysToClose: Math.round(dealVelocity[0]?.avgDaysToClose ?? 0),
      minDaysToClose: Math.round(dealVelocity[0]?.minDaysToClose ?? 0),
      maxDaysToClose: Math.round(dealVelocity[0]?.maxDaysToClose ?? 0),
    },
  };
};

// ─── Leads Report ──────────────────────────────────────────────────────────────
// Fixed: "$status" -> "$stage" (Lead has no status field), and every
// "converted" boolean check -> a $ne-null check against convertedCustomer
// (Lead has no converted boolean either — conversion is tracked via that ref
// plus convertedAt). Also added a stage-based winLoss breakdown, mirroring
// Deals, since "won/lost stage" and "converted to paying customer" are two
// genuinely different events in this schema and were being conflated before.

const getLeadsReport = async ({ from, to, ownerId } = {}) => {
  const match = {
    ...dateRangeMatch(from, to, "createdAt"),
  };
  if (ownerId) match.owner = toObjectId(ownerId);

  const isConverted = { $ne: ["$convertedCustomer", null] };

  const [
    stageBreakdown,
    sourceBreakdown,
    monthlyLeads,
    conversionTotals,
    winLossRatio,
  ] = await Promise.all([

    // ── By stage (was: by "status", a field that doesn't exist) ─────────────
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // ── By source ────────────────────────────────────────────────────────────
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
          convertedCount: {
            $sum: { $cond: [isConverted, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // ── Monthly leads created ────────────────────────────────────────────────
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
          convertedCount: {
            $sum: { $cond: [isConverted, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // ── Overall conversion totals (Lead -> Customer, via convertedCustomer) ──
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          converted: {
            $sum: { $cond: [isConverted, 1, 0] },
          },
          totalValue: { $sum: "$value" },
          avgValue: { $avg: "$value" },
        },
      },
    ]),

    // ── Win / loss by stage (mirrors getDealsReport's winLoss shape) ────────
    Lead.aggregate([
      {
        $match: {
          ...match,
          stage: { $in: ["won", "lost"] },
        },
      },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
        },
      },
    ]),
  ]);

  const totals = conversionTotals[0] ?? {
    total: 0,
    converted: 0,
    totalValue: 0,
    avgValue: 0,
  };

  const winLoss = winLossRatio.reduce((acc, item) => {
    acc[item._id] = { count: item.count, value: item.totalValue };
    return acc;
  }, {});
  const wonCount = winLoss.won?.count ?? 0;
  const lostCount = winLoss.lost?.count ?? 0;
  const closedCount = wonCount + lostCount;

  return {
    stageBreakdown: stageBreakdown.map((s) => ({
      stage: s._id,
      count: s.count,
      totalValue: s.totalValue,
    })),
    sourceBreakdown: sourceBreakdown.map((s) => ({
      source: s._id ?? "unknown",
      count: s.count,
      totalValue: s.totalValue,
      convertedCount: s.convertedCount,
      conversionRate:
        s.count > 0
          ? Math.round((s.convertedCount / s.count) * 100)
          : 0,
    })),
    monthlyLeads: monthlyLeads.map((m) => ({
      year: m._id.year,
      month: m._id.month,
      label: new Date(m._id.year, m._id.month - 1).toLocaleString("en", {
        month: "short",
        year: "numeric",
      }),
      count: m.count,
      totalValue: m.totalValue,
      convertedCount: m.convertedCount,
    })),
    // Stage-based: did the lead reach "won" before ever converting to a Customer?
    winLoss: {
      won: winLoss.won ?? { count: 0, value: 0 },
      lost: winLoss.lost ?? { count: 0, value: 0 },
      winRate:
        closedCount > 0
          ? Math.round((wonCount / closedCount) * 100)
          : 0,
    },
    // Conversion-based: of ALL leads (any stage), how many actually became a
    // real paying Customer via the Leads system's convert action. This can be
    // lower than winLoss.won's count — a lead can be "won" and simply not
    // converted yet.
    totals: {
      total: totals.total,
      converted: totals.converted,
      conversionRate:
        totals.total > 0
          ? Math.round((totals.converted / totals.total) * 100)
          : 0,
      totalValue: totals.totalValue,
      avgValue: Math.round(totals.avgValue ?? 0),
    },
  };
};

// ─── Tasks Report ──────────────────────────────────────────────────────────────
// Unchanged — priority, completed, dueDate, assignedTo, completedAt all exist
// exactly as-is on task.model.js. No "lead" field is referenced here, so this
// function was never actually broken by that model's dangling index bug.

const getTasksReport = async ({ from, to, ownerId } = {}) => {
  const match = {
    ...dateRangeMatch(from, to, "createdAt"),
  };
  if (ownerId) match.assignedTo = toObjectId(ownerId);

  const [
    priorityBreakdown,
    assigneeBreakdown,
    completionTrend,
    overdueSummary,
    relatedToBreakdown,
  ] = await Promise.all([

    // ── By priority ──────────────────────────────────────────────────────────
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$priority",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ["$completed", 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]),

    // ── By assignee ──────────────────────────────────────────────────────────
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$assignedTo",
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
                    { $lt: ["$dueDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          total: 1,
          completed: 1,
          overdue: 1,
          userName: "$user.name",
          userEmail: "$user.email",
        },
      },
      { $sort: { total: -1 } },
    ]),

    // ── Completion trend (monthly) ────────────────────────────────────────────
    Task.aggregate([
      {
        $match: {
          ...match,
          completed: true,
          completedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            month: { $month: "$completedAt" },
          },
          completed: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // ── Overdue summary ───────────────────────────────────────────────────────
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$completed", false] },
                    { $lt: ["$dueDate", new Date()] },
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

    // ── By related entity type (new — surfaces what tasks are actually
    // attached to now that Task is polymorphic: Leads vs Deals vs Projects, etc.) ──
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$relatedTo",
          total: { $sum: 1 },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  const summary = overdueSummary[0] ?? {
    total: 0,
    completed: 0,
    overdue: 0,
  };

  return {
    priorityBreakdown: priorityBreakdown.map((p) => ({
      priority: p._id,
      total: p.total,
      completed: p.completed,
      pending: p.total - p.completed,
      completionRate:
        p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0,
    })),
    assigneeBreakdown,
    relatedToBreakdown: relatedToBreakdown.map((r) => ({
      relatedTo: r._id,
      total: r.total,
      completed: r.completed,
      pending: r.total - r.completed,
    })),
    completionTrend: completionTrend.map((m) => ({
      year: m._id.year,
      month: m._id.month,
      label: new Date(m._id.year, m._id.month - 1).toLocaleString("en", {
        month: "short",
        year: "numeric",
      }),
      completed: m.completed,
    })),
    summary: {
      total: summary.total,
      completed: summary.completed,
      pending: summary.total - summary.completed,
      overdue: summary.overdue,
      completionRate:
        summary.total > 0
          ? Math.round((summary.completed / summary.total) * 100)
          : 0,
    },
  };
};

// ─── Activity Report ───────────────────────────────────────────────────────────
// Unchanged from your original — no fields referenced here (type, createdBy,
// createdAt) were affected by anything in the three schemas you shared this
// turn. If Activity has since gained relatedTo/relatedId (per the model patch
// from earlier in this conversation), a relatedToBreakdown could be added
// here the same way I just added one to Tasks — say so and I'll add it.

const { ACTIVITY_TYPES } = require("../activities/activity.model");

const getActivityReport = async ({ from, to, ownerId, workspaceId } = {}) => {
  const match = {
    ...dateRangeMatch(from, to, "createdAt"),
  };
  if (workspaceId) match.workspaceId = toObjectId(workspaceId);

  const [typeBreakdown, monthlyActivity, userBreakdown] = await Promise.all([
    Activity.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Activity.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    Activity.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$createdBy",
          total: { $sum: 1 },
          calls: {
            $sum: { $cond: [{ $eq: ["$type", "call"] }, 1, 0] },
          },
          emails: {
            $sum: { $cond: [{ $eq: ["$type", "email"] }, 1, 0] },
          },
          meetings: {
            $sum: { $cond: [{ $eq: ["$type", "meeting"] }, 1, 0] },
          },
          notes: {
            $sum: { $cond: [{ $eq: ["$type", "note"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          total: 1,
          calls: 1,
          emails: 1,
          meetings: 1,
          notes: 1,
          userName: "$user.name",
          userEmail: "$user.email",
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  // Seed every month bucket with all known activity types at 0, so the
  // response shape is stable regardless of which types actually occurred
  // that month — the frontend chart can always expect every key to exist.
  const emptyTypeCounts = () =>
    ACTIVITY_TYPES.reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {});

  const monthlyMap = {};
  monthlyActivity.forEach(({ _id, count }) => {
    const key = `${_id.year}-${_id.month}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        year: _id.year,
        month: _id.month,
        label: new Date(_id.year, _id.month - 1).toLocaleString("en", {
          month: "short",
          year: "numeric",
        }),
        ...emptyTypeCounts(),
      };
    }
    // Guard against a type that isn't in ACTIVITY_TYPES ever reaching here
    // (shouldn't happen given the schema enum, but keeps this defensive)
    if (_id.type in monthlyMap[key]) {
      monthlyMap[key][_id.type] = count;
    }
  });

  return {
    typeBreakdown: typeBreakdown.map((t) => ({
      type: t._id,
      count: t.count,
    })),
    monthlyActivity: Object.values(monthlyMap).sort(
      (a, b) => a.year - b.year || a.month - b.month
    ),
    userBreakdown,
  };
};

module.exports = { getActivityReport };
// ─── Overview Report ───────────────────────────────────────────────────────────
// Fixed: leadSummary's "converted" cond -> convertedCustomer $ne null,
// matching the same fix applied in getLeadsReport.

const getOverviewReport = async ({ from, to, ownerId } = {}) => {
  const dealMatch = { ...dateRangeMatch(from, to, "createdAt") };
  const leadMatch = { ...dateRangeMatch(from, to, "createdAt") };
  const taskMatch = { ...dateRangeMatch(from, to, "createdAt") };

  if (ownerId) {
    dealMatch.owner = toObjectId(ownerId);
    leadMatch.owner = toObjectId(ownerId);
    taskMatch.assignedTo = toObjectId(ownerId);
  }

  const [
    dealSummary,
    leadSummary,
    taskSummary,
    contactCount,
    companyCount,
  ] = await Promise.all([
    Deal.aggregate([
      { $match: dealMatch },
      {
        $group: {
          _id: null,
          totalDeals: { $sum: 1 },
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
              $cond: [{ $eq: ["$stage", "closed_won"] }, "$value", 0],
            },
          },
          wonCount: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_won"] }, 1, 0],
            },
          },
          lostCount: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_lost"] }, 1, 0],
            },
          },
        },
      },
    ]),

    Lead.aggregate([
      { $match: leadMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $ne: ["$convertedCustomer", null] }, 1, 0] },
          },
          totalValue: { $sum: "$value" },
        },
      },
    ]),

    Task.aggregate([
      { $match: taskMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$completed", false] },
                    { $lt: ["$dueDate", new Date()] },
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

    Contact.countDocuments(
      ownerId ? { owner: toObjectId(ownerId) } : {}
    ),

    Company.countDocuments(
      ownerId ? { owner: toObjectId(ownerId) } : {}
    ),
  ]);

  const deals = dealSummary[0] ?? {
    totalDeals: 0,
    openValue: 0,
    wonValue: 0,
    wonCount: 0,
    lostCount: 0,
  };

  const leads = leadSummary[0] ?? {
    total: 0,
    converted: 0,
    totalValue: 0,
  };

  const tasks = taskSummary[0] ?? {
    total: 0,
    completed: 0,
    overdue: 0,
  };

  const closedDeals = deals.wonCount + deals.lostCount;

  return {
    deals: {
      ...deals,
      winRate:
        closedDeals > 0
          ? Math.round((deals.wonCount / closedDeals) * 100)
          : 0,
    },
    leads: {
      ...leads,
      conversionRate:
        leads.total > 0
          ? Math.round((leads.converted / leads.total) * 100)
          : 0,
    },
    tasks: {
      ...tasks,
      completionRate:
        tasks.total > 0
          ? Math.round((tasks.completed / tasks.total) * 100)
          : 0,
    },
    contacts: contactCount,
    companies: companyCount,
  };
};

module.exports = {
  getDealsReport,
  getLeadsReport,
  getTasksReport,
  getActivityReport,
  getOverviewReport,
};