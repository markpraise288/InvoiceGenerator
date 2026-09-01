// modules/deals/deal.service.js
const { Deal, DEAL_STAGES } = require("./deal.model");
const { STAGE_PROBABILITY } = require("./deal.validate");
const { logActivity } = require("../activities/activity.service");

// ─── Populate helper ───────────────────────────────────────────────────────────

const defaultPopulate = (query) =>
  query
    .populate("owner", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("relatedId", "name email position");

// ─── Stage query helper ────────────────────────────────────────────────────────

const resolveStageFilter = (stage) => {
  if (!stage) return {};
  if (stage === "open") {
    return {
      stage: {
        $in: DEAL_STAGES.filter(
          (s) => s !== "closed_won" && s !== "closed_lost",
        ),
      },
    };
  }
  if (stage === "closed") {
    return { stage: { $in: ["closed_won", "closed_lost"] } };
  }
  return { stage };
};

// ─── Create Deal ───────────────────────────────────────────────────────────────

const createDeal = async ({ data, user }) => {
  // Auto-set probability from stage if not explicitly provided
  const probability =
    data.probability ?? STAGE_PROBABILITY[data.stage ?? "prospecting"];

  const deal = await Deal.create({
    ...data,
    owner: data.owner ?? user.id,
    createdBy: user.id,
    workspaceId: user.workspaceId,
    probability,
  });

  await logActivity({
    relatedId: deal._id,
    relatedTo: "Deal",
    body: deal.description,
    userId: user.id,
    type: "created",
    title: `Deal created: ${deal.name}`,
    workspaceId: deal.workspaceId,
    meta: {
      dealId: deal._id,
    },
  });

  return defaultPopulate(Deal.findById(deal._id)).lean({ virtuals: true });
};

// ─── Get Deals (paginated + filtered) ─────────────────────────────────────────

const getDeals = async ({ filters = {}, user }) => {
  const {
    search,
    stage,
    owner,
    minValue,
    maxValue,
    closeDateFrom,
    closeDateTo,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortDir = "desc",
  } = filters;

  const query = {};

  query.workspaceId = user.workspaceId;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Stage filter — handles "open", "closed", or specific stage
  Object.assign(query, resolveStageFilter(stage));

  if (owner) query.owner = owner;

  // Value range
  if (minValue !== undefined || maxValue !== undefined) {
    query.value = {};
    if (minValue !== undefined) query.value.$gte = minValue;
    if (maxValue !== undefined) query.value.$lte = maxValue;
  }

  // Close date range
  if (closeDateFrom || closeDateTo) {
    query.closeDate = {};
    if (closeDateFrom) query.closeDate.$gte = new Date(closeDateFrom);
    if (closeDateTo) query.closeDate.$lte = new Date(closeDateTo);
  }

  const sortOrder = sortDir === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  const [deals, total] = await Promise.all([
    defaultPopulate(
      Deal.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
    ).lean({ virtuals: true }),
    Deal.countDocuments(query),
  ]);

  return {
    deals,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

// ─── Get Deals for Kanban ──────────────────────────────────────────────────────
// Returns all open deals grouped by stage — no pagination

const getKanbanDeals = async ({ filters = {}, user }) => {
  const query = {
    stage: {
      $in: DEAL_STAGES.filter((s) => s !== "closed_won" && s !== "closed_lost"),
    },
  };

  query.workspaceId = user.workspaceId;

  if (filters.owner) query.owner = filters.owner;

  const deals = await defaultPopulate(
    Deal.find(query).sort({ createdAt: -1 }),
  ).lean({ virtuals: true });

  // Group by stage
  const grouped = DEAL_STAGES.reduce((acc, stage) => {
    if (stage !== "closed_won" && stage !== "closed_lost") {
      acc[stage] = deals.filter((d) => d.stage === stage);
    }
    return acc;
  }, {});

  // Stage totals
  const stageTotals = Object.entries(grouped).reduce(
    (acc, [stage, stageDeals]) => {
      acc[stage] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
      return acc;
    },
    {},
  );

  return { grouped, stageTotals };
};

// ─── Get Deal by ID ────────────────────────────────────────────────────────────

const getDealById = async (dealId) => {
  const deal = await defaultPopulate(Deal.findById(dealId)).lean({
    virtuals: true,
  });

  return deal;
};

// ─── Update Deal ───────────────────────────────────────────────────────────────

const updateDeal = async ({ dealId, data, userId }) => {
  const deal = await defaultPopulate(
    Deal.findByIdAndUpdate(
      dealId,
      { $set: data },
      { returnDocument: "after", runValidators: true },
    ),
  ).lean({ virtuals: true });

  await logActivity({
    relatedId: deal._id,
    relatedTo: "Deal",
    body: deal.description,
    userId,
    type: "updated",
    title: `Deal updated: ${deal.name}`,
    workspaceId: deal.workspaceId,
    meta: {
      dealId: deal._id,
    },
  });

  return deal;
};

// ─── Move Stage ────────────────────────────────────────────────────────────────

const moveDealStage = async ({
  dealId,
  stage,
  probability,
  lostReason,
  user,
}) => {
  const existing = await Deal.findById(dealId);
  if (!existing) return null;

  const previousStage = existing.stage;

  // Auto-set probability if not explicitly provided
  const newProbability = probability ?? STAGE_PROBABILITY[stage];

  const updates = {
    stage,
    probability: newProbability,
  };

  // Handle closed states
  if (stage === "closed_won") {
    updates.closedAt = new Date();
    updates.lostReason = null;

    await logActivity({
    relatedId: existing._id,
    relatedTo: "Deal",
    body: existing.description,
    type: "deal_won",
    userId: user.id,
    title: `Deal Wonned: ${existing.name}`,
    workspaceId: existing.workspaceId,
    meta: {
      dealId: existing._id,
    },
  });
  } else if (stage === "closed_lost") {
    updates.closedAt = new Date();
    updates.lostReason = lostReason ?? null;

    await logActivity({
      relatedId: existing._id,
      relatedTo: "Deal",
      body: existing.description,
      userId: user.id,
      type: "deal_lost",
      title: `Deal Lost: ${existing.name}`,
      workspaceId: existing.workspaceId,
      meta: {
        dealId: existing._id,
      },
    });
  } else {
    // Reopening a closed deal
    if (existing.stage === "closed_won" || existing.stage === "closed_lost") {
      updates.closedAt = null;
      updates.lostReason = null;
    }
  }

  const updated = await defaultPopulate(
    Deal.findByIdAndUpdate(
      dealId,
      { $set: updates },
      { returnDocument: "after" },
    ),
  ).lean({ virtuals: true });

  await logActivity({
    relatedId: updated._id,
    relatedTo: "Deal",
    body: updated.description,
    userId: user.id,
    type: "updated",
    title: `Deal updated: ${updated.name}`,
    workspaceId: updated.workspaceId,
    meta: {
      dealId: updated._id,
    },
  });

  return updated;
};

// ─── Delete Deal ───────────────────────────────────────────────────────────────

const deleteDeal = async (dealId, user) => {
  const deal = await Deal.findById(dealId);

  if(!deal){
    const error = new Error("Deal not found");
    error.statusCode = 404;
    throw error;
  }

  await Deal.deleteOne(dealId);

  await logActivity({
    relatedId: deal._id,
    relatedTo: "Deal",
    body: deal.description,
    userId: user.id,
    type: "updated",
    title: `Deal updated: ${deal.name}`,
    workspaceId: deal.workspaceId,
    meta: {
      dealId: deal._id,
    },
  });
  
  return deal;
};

// ─── Get Pipeline Summary ──────────────────────────────────────────────────────
// Aggregation for the pipeline value cards

const getPipelineSummary = async ({ user } = {}) => {
  const matchStage = { workspaceId: user.workspaceId };

  const [stageBreakdown, totals] = await Promise.all([
    Deal.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
          avgValue: { $avg: "$value" },
          weightedValue: {
            $sum: {
              $floor: {
                $divide: [{ $multiply: ["$value", "$probability"] }, 100],
              },
            },
          },
        },
      },
    ]),
    Deal.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalDeals: { $sum: 1 },
          totalValue: { $sum: "$value" },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_won"] }, "$value", 0],
            },
          },
          lostValue: {
            $sum: {
              $cond: [{ $eq: ["$stage", "closed_lost"] }, "$value", 0],
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
  ]);

  const summary = totals[0] ?? {
    totalDeals: 0,
    totalValue: 0,
    wonValue: 0,
    lostValue: 0,
    openValue: 0,
    wonCount: 0,
    lostCount: 0,
  };

  // Win rate
  const closedCount = summary.wonCount + summary.lostCount;
  summary.winRate =
    closedCount > 0 ? Math.round((summary.wonCount / closedCount) * 100) : 0;

  // Reshape stage breakdown into a map
  const byStage = stageBreakdown.reduce((acc, item) => {
    acc[item._id] = {
      count: item.count,
      totalValue: item.totalValue,
      avgValue: Math.round(item.avgValue),
      weightedValue: item.weightedValue,
    };
    return acc;
  }, {});

  return { summary, byStage };
};

// ─── Search Deals (combobox) ───────────────────────────────────────────────────

const searchDeals = async ({ search = "", limit = 10 }) => {
  const query = search ? { title: { $regex: search, $options: "i" } } : {};

  const deals = await Deal.find(query)
    .select("title value stage closeDate")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean({ virtuals: true });

  return deals;
};

module.exports = {
  createDeal,
  getDeals,
  getKanbanDeals,
  getDealById,
  updateDeal,
  moveDealStage,
  deleteDeal,
  getPipelineSummary,
  searchDeals,
};
