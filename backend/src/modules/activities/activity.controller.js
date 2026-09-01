// modules/activities/activity.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const activityService = require("./activity.service");

// ─── Create activity (user-initiated) ──────────────────────────────────────────

const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity({
    ...req.body,
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
  });

  return res.status(201).json(
    new ApiResponse(201, "Activity created successfully", activity)
  );
});

// ─── Get activities for a specific record (timeline) ──────────────────────────

const getRecordActivities = asyncHandler(async (req, res) => {
  const { relatedTo, relatedId, page, limit } = req.query;

  const result = await activityService.getRecordActivities({
    relatedTo,
    relatedId,
    workspaceId: req.user.workspaceId,
    page,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, "Activities fetched successfully", result)
  );
});

// ─── Get workspace-wide activity feed ──────────────────────────────────────────

const getWorkspaceFeed = asyncHandler(async (req, res) => {
  const { type, relatedTo, userId, from, to, page, limit } = req.query;

  const result = await activityService.getWorkspaceFeed({
    workspaceId: req.user.workspaceId,
    filters: { type, relatedTo, userId, from, to },
    page,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, "Workspace activity feed fetched successfully", result)
  );
});

// ─── Get recent activity (dashboard widget) ────────────────────────────────────

const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const activities = await activityService.getRecentActivity({
    workspaceId: req.user.workspaceId,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, "Recent activity fetched successfully", activities)
  );
});

// ─── Get single activity ───────────────────────────────────────────────────────

const getActivity = asyncHandler(async (req, res) => {
  const { activityId } = req.params;

  const activity = await activityService.getActivityById({
    activityId,
    workspaceId: req.user.workspaceId,
  });

  if (!activity) {
    return res.status(404).json(
      new ApiResponse(404, "Activity not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Activity fetched successfully", activity)
  );
});

// ─── Get record activity stats ─────────────────────────────────────────────────

const getRecordActivityStats = asyncHandler(async (req, res) => {
  const { relatedTo, relatedId } = req.query;

  if (!relatedTo || !relatedId) {
    return res.status(422).json(
      new ApiResponse(422, "relatedTo and relatedId are both required", null)
    );
  }

  const stats = await activityService.getRecordActivityStats({
    relatedTo,
    relatedId,
    workspaceId: req.user.workspaceId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Activity stats fetched successfully", stats)
  );
});

// ─── Update activity ────────────────────────────────────────────────────────────

const updateActivity = asyncHandler(async (req, res) => {
  const { activityId } = req.params;

  try {
    const activity = await activityService.updateActivity({
      activityId,
      workspaceId: req.user.workspaceId,
      userId: req.user.id,
      data: req.body,
    });

    return res.status(200).json(
      new ApiResponse(200, "Activity updated successfully", activity)
    );
  } catch (err) {
    if (err.message === "ACTIVITY_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "Activity not found", null));
    }
    if (err.message === "ACTIVITY_NOT_EDITABLE") {
      return res.status(403).json(
        new ApiResponse(403, "This activity type cannot be edited", null)
      );
    }
    if (err.message === "NOT_ACTIVITY_OWNER") {
      return res.status(403).json(
        new ApiResponse(403, "You can only edit activities you created", null)
      );
    }
    throw err;
  }
});

// ─── Delete activity ────────────────────────────────────────────────────────────

const deleteActivity = asyncHandler(async (req, res) => {
  const { activityId } = req.params;

  try {
    await activityService.deleteActivity({
      activityId,
      workspaceId: req.user.workspaceId,
      userId: req.user.id,
    });

    return res.status(200).json(
      new ApiResponse(200, "Activity deleted successfully", null)
    );
  } catch (err) {
    if (err.message === "ACTIVITY_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "Activity not found", null));
    }
    if (err.message === "ACTIVITY_NOT_EDITABLE") {
      return res.status(403).json(
        new ApiResponse(403, "This activity type cannot be deleted", null)
      );
    }
    if (err.message === "NOT_ACTIVITY_OWNER") {
      return res.status(403).json(
        new ApiResponse(403, "You can only delete activities you created", null)
      );
    }
    throw err;
  }
});

module.exports = {
  createActivity,
  getRecordActivities,
  getWorkspaceFeed,
  getRecentActivity,
  getActivity,
  getRecordActivityStats,
  updateActivity,
  deleteActivity,
};