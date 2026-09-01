// modules/tasks/task.service.js

const Task = require("./task.model");
const { logActivity } = require("../activities/activity.service");
const { notificationService } = require("../notifications/notification.service");

// Fields to select when populating relatedId — a superset across all six
// possible related models. Mongoose only returns fields that actually exist
// on the resolved document, so this is safe even though, say, a Deal has no
// "email" field and a Contact has no "title" field.
const RELATED_POPULATE_FIELDS = "name title company email";

// ─── Create Task ───────────────────────────────────────────────────────────────

const createTask = async ({ data, user }) => {
  const task = await Task.create({
    title: data.title,
    description: data.description,
    relatedId: data.relatedId,
    relatedTo: data.relatedTo,
    assignedTo: data.assignedTo,
    createdBy: user.id,
    dueDate: data.dueDate,
    priority: data.priority ?? "medium",
    workspaceId: user.workspaceId,
  });

  await notificationService.createNotification({
    userId: data.assignedTo,
    title: "You have been assigned a new Task",
    description: `Assigned Task: ${data.title}`,
    type: "task",
  });

  // Auto-log on the related record's activity timeline — assumes
  // logSystemActivity has been (or will be) updated to accept relatedId/
  // relatedTo instead of a Lead-specific leadId. See note below this file.
  await logActivity({
    relatedId: task._id,
    relatedTo: "Task",
    body: task.description,
    userId: user.id,
    type: "created",
    title: `Task created: ${task.title}`,
    workspaceId: task.workspaceId,
    meta: {
      taskId: task._id,
    },
  });

  return task
    .populate("assignedTo", "name email avatar")
    .then((t) => t.populate("createdBy", "name email avatar"));
};

// ─── Get Tasks (flat list, optionally scoped to one related record) ───────────
// Replaces getLeadTasks — works for the flat "all my tasks" view AND for
// "every task linked to this one Customer/Project/etc." by passing
// relatedTo + relatedId as filters, matching hooks/useTasks.ts's
// fetchTasks/fetchRelatedTasks, both of which hit the same /tasks endpoint.

const getTasks = async ({ filters = {}, user } = {}) => {
  const query = {};
  query.workspaceId = user.workspaceId;
  if (filters.relatedTo) query.relatedTo = filters.relatedTo;
  if (filters.relatedId) query.relatedId = filters.relatedId;

  if (filters.completed !== undefined) {
    query.completed = filters.completed === "true" || filters.completed === true;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  const tasks = await Task.find(query)
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("completedBy", "name email")
    .sort({ completed: 1, dueDate: 1 })
    .lean({ virtuals: true });

  return tasks;
};

// ─── Get Upcoming Tasks for Current User ───────────────────────────────────────
// Used by the upcoming tasks widget on the dashboard

const getUpcomingTasks = async ({ userId, limit = 10, daysAhead = 7 }) => {
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const tasks = await Task.find({
    assignedTo: userId,
    completed: false,
    dueDate: { $lte: future },
  })
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .populate("assignedTo", "name email avatar")
    .sort({ dueDate: 1 })
    .limit(limit)
    .lean({ virtuals: true });

  return tasks;
};

// ─── Get Overdue Tasks for Current User ───────────────────────────────────────

const getOverdueTasks = async ({ user }) => {
  const tasks = await Task.find({
    workspaceId: user.workspaceId,
    completed: false,
    dueDate: { $lt: new Date() },
  })
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .populate("assignedTo", "name email avatar")
    .sort({ dueDate: 1 })
    .lean({ virtuals: true });

  return tasks;
};

// ─── Get Single Task ───────────────────────────────────────────────────────────

const getTaskById = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .populate("assignedTo", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("completedBy", "name email avatar")
    .lean({ virtuals: true });

  return task;
};

// ─── Update Task ───────────────────────────────────────────────────────────────

const updateTask = async ({ taskId, userId, data }) => {
  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      createdBy: userId, // only creator can edit
    },
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  )
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .populate("assignedTo", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("completedBy", "name email avatar");

  if (!task) return null;

  await logActivity({
    relatedId: task._id,
    relatedTo: "Task",
    body: task.description,
    userId,
    type: "updated",
    title: `Task updated: ${task.title}`,
    workspaceId: task.workspaceId,
    meta: {
      taskId: task._id,
    },
  });

  return task;
};

// ─── Complete / Uncomplete Task ────────────────────────────────────────────────

const completeTask = async ({ taskId, user, completed }) => {
  const existing = await Task.findById(taskId);
  if (!existing) return null;

  existing.completed = completed;
  existing.completedAt = completed ? new Date() : null;
  existing.completedBy = completed ? user.id : null;

  await existing.save();

  // Auto-log completion on the related record's activity timeline.
  // Fixed a pre-existing bug here: the original passed `leadId: existing.lead`,
  // but `Task` has no `lead` field on this schema (only `relatedId`/`relatedTo`)
  // — that would have logged `leadId: undefined` on every completion.
  await logActivity({
    relatedId: existing._id,
    relatedTo: "Task",
    body: existing.description,
    userId: user.id,
    type: "task_completed",
    title: `Task completed: ${existing.title}`,
    workspaceId: existing.workspaceId,
    meta: {
      taskId: existing._id,
    },
  });

  return Task.findById(taskId)
    .populate("relatedId", RELATED_POPULATE_FIELDS)
    .populate("assignedTo", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("completedBy", "name email avatar")
    .lean({ virtuals: true });
};

// ─── Delete Task ───────────────────────────────────────────────────────────────

const deleteTask = async ({ taskId, user }) => {
  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: task._id,
    relatedTo: "Task",
    body: task.description,
    userId: user.id,
    type: "deleted",
    title: `Task deleted: ${task.title}`,
    workspaceId: task.workspaceId,
    meta: {
      taskId: task._id,
    },
  });

  await Task.deleteOne(taskId);

  return task;
};

// ─── Get Task Counts (flat, or scoped to one related record) ──────────────────
// Replaces getTaskSummary(leadId) — pass nothing for platform-wide counts
// (e.g. a personal "my tasks" summary widget), or pass relatedTo + relatedId
// to scope counts to one specific Customer/Project/etc.

const getTaskSummary = async ({ relatedTo, relatedId } = {}) => {
  const baseQuery = relatedTo && relatedId ? { relatedTo, relatedId } : {};

  const [total, completed, overdue] = await Promise.all([
    Task.countDocuments(baseQuery),
    Task.countDocuments({ ...baseQuery, completed: true }),
    Task.countDocuments({
      ...baseQuery,
      completed: false,
      dueDate: { $lt: new Date() },
    }),
  ]);

  return {
    total,
    completed,
    pending: total - completed,
    overdue,
  };
};

module.exports = {
  createTask,
  getTasks,
  getUpcomingTasks,
  getOverdueTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
  getTaskSummary,
};