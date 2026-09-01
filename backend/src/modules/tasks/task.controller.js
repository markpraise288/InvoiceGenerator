// modules/tasks/task.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const taskService = require("./task.service");

// ─── Create Task ───────────────────────────────────────────────────────────────

const createTask = asyncHandler(async (req, res) => {
  const user = req.user;

  const task = await taskService.createTask({
    data: req.body,
    user,
  });

  return res.status(201).json(
    new ApiResponse(201, "Task created successfully", task)
  );
});

// ─── Get Tasks for a Lead ──────────────────────────────────────────────────────

const getLeadTasks = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const filters = {
    completed: req.query.completed,
    priority: req.query.priority,
    assignedTo: req.query.assignedTo,
  };

  const tasks = await taskService.getLeadTasks({ filters, user: req.user });

  return res.status(200).json(
    new ApiResponse(200, "Tasks fetched successfully", tasks)
  );
});

// ─── Get Upcoming Tasks (current user) ────────────────────────────────────────

const getUpcomingTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const limit = parseInt(req.query.limit) || 10;
  const daysAhead = parseInt(req.query.daysAhead) || 7;

  const tasks = await taskService.getUpcomingTasks({
    userId,
    limit,
    daysAhead,
  });

  return res.status(200).json(
    new ApiResponse(200, "Upcoming tasks fetched successfully", tasks)
  );
});

// ─── Get Overdue Tasks (current user) ─────────────────────────────────────────

const getOverdueTasks = asyncHandler(async (req, res) => {
  const user = req.user;

  const tasks = await taskService.getOverdueTasks({ user });

  return res.status(200).json(
    new ApiResponse(200, "Overdue tasks fetched successfully", tasks)
  );
});

// ─── Get Single Task ───────────────────────────────────────────────────────────

const getTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await taskService.getTaskById(taskId);

  if (!task) {
    return res.status(404).json(
      new ApiResponse(404, "Task not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Task fetched successfully", task)
  );
});

// ─── Update Task ───────────────────────────────────────────────────────────────

const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  const task = await taskService.updateTask({
    taskId,
    userId,
    data: req.body,
  });

  if (!task) {
    return res.status(404).json(
      new ApiResponse(
        404,
        "Task not found or you do not have permission to edit it",
        null
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Task updated successfully", task)
  );
});

// ─── Complete / Uncomplete Task ────────────────────────────────────────────────

const completeTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const user = req.user;
  const { completed } = req.body;

  const task = await taskService.completeTask({
    taskId,
    user,
    completed,
  });

  if (!task) {
    return res.status(404).json(
      new ApiResponse(404, "Task not found", null)
    );
  }

  const message = completed
    ? "Task marked as complete"
    : "Task reopened successfully";

  return res.status(200).json(
    new ApiResponse(200, message, task)
  );
});

// ─── Delete Task ───────────────────────────────────────────────────────────────

const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const user = req.user;

  const task = await taskService.deleteTask({ taskId, user });

  if (!task) {
    return res.status(404).json(
      new ApiResponse(
        404,
        "Task not found or you do not have permission to delete it",
        null
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Task deleted successfully", null)
  );
});

// ─── Get Task Summary for a Lead ──────────────────────────────────────────────

const getTaskSummary = asyncHandler(async (req, res) => {
  const { relatedTo, relatedId } = req.params;

  const summary = await taskService.getTaskSummary({relatedTo, relatedId});

  return res.status(200).json(
    new ApiResponse(200, "Task summary fetched successfully", summary)
  );
});

module.exports = {
  createTask,
  getLeadTasks,
  getUpcomingTasks,
  getOverdueTasks,
  getTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskSummary,
};