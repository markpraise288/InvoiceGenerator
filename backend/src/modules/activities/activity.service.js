// modules/activities/activity.service.js

const mongoose = require("mongoose");
const { Activity } = require("./activity.model");

// ─── Populate helper ───────────────────────────────────────────────────────────

const defaultPopulate = (query) =>
  query.populate("createdBy", "name email avatar");

// ─── Log activity (system-generated) ───────────────────────────────────────────
// The generic entry point every other module's service calls into — replaces
// the old lead-only logSystemActivity. Never throws to the caller by default
// (activity logging should never break the primary operation it's attached
// to); callers that want to know about failures can pass throwOnError: true.

const logActivity = async ({
  relatedId,
  relatedTo,
  workspaceId,
  type,
  userId,
  title,
  body,
  duration,
  scheduledAt,
  subject,
  meta,
  throwOnError = false,
}) => {
  try {
    const activity = await Activity.create({
      relatedId,
      relatedTo,
      workspaceId,
      type,
      title,
      body,
      duration,
      scheduledAt,
      subject,
      meta: meta ?? {},
      createdBy: userId,
    });

    return activity;
  } catch (err) {
    console.error(
      `[activity.service] Failed to log activity (type=${type}, relatedTo=${relatedTo}, relatedId=${relatedId}):`,
      err
    );
    if (throwOnError) throw err;
    return null;
  }
};

// ─── Create activity (user-initiated — note, call, email, meeting) ───────────
// Distinct from logActivity: this is what fires when a user manually adds a
// note/logs a call/meeting from the UI, rather than the system reacting to
// a state change elsewhere. Always throws on failure since here the user is
// directly waiting on this action succeeding.

const createActivity = async ({
  relatedId,
  relatedTo,
  workspaceId,
  type,
  userId,
  title,
  body,
  duration,
  scheduledAt,
  subject,
  meta,
}) => {
  const activity = await Activity.create({
    relatedId,
    relatedTo,
    workspaceId,
    type,
    title,
    body,
    duration,
    scheduledAt,
    subject,
    meta: meta ?? {},
    createdBy: userId,
  });

  return defaultPopulate(Activity.findById(activity._id)).lean();
};

// ─── Get activities for a specific record (timeline) ──────────────────────────

const getRecordActivities = async ({
  relatedTo,
  relatedId,
  workspaceId,
  page = 1,
  limit = 50,
}) => {
  const query = {
    relatedTo,
    relatedId: new mongoose.Types.ObjectId(relatedId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
  };

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    defaultPopulate(
      Activity.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ).lean(),
    Activity.countDocuments(query),
  ]);

  return {
    activities,
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

// ─── Get workspace-wide activity feed ──────────────────────────────────────────

const getWorkspaceFeed = async ({
  workspaceId,
  filters = {},
  page = 1,
  limit = 30,
}) => {
  const { type, relatedTo, userId, from, to } = filters;

  const query = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
  };

  if (type) query.type = type;
  if (relatedTo) query.relatedTo = relatedTo;
  if (userId) query.createdBy = new mongoose.Types.ObjectId(userId);

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    defaultPopulate(
      Activity.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ).lean(),
    Activity.countDocuments(query),
  ]);

  return {
    activities,
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

// ─── Get recent activity (dashboard widget) ────────────────────────────────────

const getRecentActivity = async ({ workspaceId, limit = 8 }) => {
  const activities = await defaultPopulate(
    Activity.find({ workspaceId: new mongoose.Types.ObjectId(workspaceId) })
      .sort({ createdAt: -1 })
      .limit(limit)
  ).lean();

  return activities;
};

// ─── Get single activity by ID ─────────────────────────────────────────────────

const getActivityById = async ({ activityId, workspaceId }) => {
  const activity = await defaultPopulate(
    Activity.findOne({
      _id: activityId,
      workspaceId,
    })
  ).lean();

  return activity;
};

// ─── Update activity (edit a note/call/meeting the user created) ──────────────
// Only certain fields are editable, and only for user-created activity types
// (note/call/email/meeting) — system-generated activities (created/updated/
// stage_changed etc.) are historical record and shouldn't be editable.

const EDITABLE_TYPES = ["note", "call", "email", "meeting"];

const updateActivity = async ({ activityId, workspaceId, userId, data }) => {
  const activity = await Activity.findOne({ _id: activityId, workspaceId });

  if (!activity) {
    const err = new Error("ACTIVITY_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  if (!EDITABLE_TYPES.includes(activity.type)) {
    const err = new Error("ACTIVITY_NOT_EDITABLE");
    err.status = 403;
    throw err;
  }

  if (activity.createdBy.toString() !== userId) {
    const err = new Error("NOT_ACTIVITY_OWNER");
    err.status = 403;
    throw err;
  }

  Object.assign(activity, data);
  await activity.save();

  return defaultPopulate(Activity.findById(activity._id)).lean();
};

// ─── Delete activity ────────────────────────────────────────────────────────────
// Same editable-type + ownership guard as update.

const deleteActivity = async ({ activityId, workspaceId, userId }) => {
  const activity = await Activity.findOne({ _id: activityId, workspaceId });

  if (!activity) {
    const err = new Error("ACTIVITY_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  if (!EDITABLE_TYPES.includes(activity.type)) {
    const err = new Error("ACTIVITY_NOT_EDITABLE");
    err.status = 403;
    throw err;
  }

  if (activity.createdBy.toString() !== userId) {
    const err = new Error("NOT_ACTIVITY_OWNER");
    err.status = 403;
    throw err;
  }

  await Activity.deleteOne({ _id: activityId });
  return true;
};

// ─── Activity stats (for a record's summary — e.g. Deal/Customer drawer) ──────

const getRecordActivityStats = async ({ relatedTo, relatedId, workspaceId }) => {
  const stats = await Activity.aggregate([
    {
      $match: {
        relatedTo,
        relatedId: new mongoose.Types.ObjectId(relatedId),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
      },
    },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  const breakdown = stats.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {});

  const total = Object.values(breakdown).reduce((sum, c) => sum + c, 0);

  return { total, breakdown };
};

module.exports = {
  logActivity,
  createActivity,
  getRecordActivities,
  getWorkspaceFeed,
  getRecentActivity,
  getActivityById,
  updateActivity,
  deleteActivity,
  getRecordActivityStats,
  EDITABLE_TYPES,
};