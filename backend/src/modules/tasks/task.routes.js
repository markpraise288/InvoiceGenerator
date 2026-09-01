// modules/tasks/task.routes.js

const express = require("express");
const authMiddleware = require("../../middlewares/auth.middleware");
const {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
} = require("./task.validate");
const {
  createTask,
  getUpcomingTasks,
  getOverdueTasks,
  getTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskSummary,
} = require("./task.controller");

const validate = require("../../middlewares/validate");

const router = express.Router({ mergeParams: true });

// ─── All routes require authentication ────────────────────────────────────────

router.use(authMiddleware);

// ─── Global Task Routes ───────────────────────────────────────────────────────
// These are NOT lead-scoped — mounted at /api/tasks

router.get("/upcoming", getUpcomingTasks);   // GET /api/tasks/upcoming
router.get("/overdue", getOverdueTasks);     // GET /api/tasks/overdue
router.post(                                 // POST /api/tasks
  "/",
  validate(createTaskSchema),
  createTask
);

// ─── Lead-scoped Task Routes ──────────────────────────────────────────────────
// These ARE lead-scoped — mounted at /api/leads/:leadId/tasks

router.get("/summary", getTaskSummary);      // GET /api/leads/:leadId/tasks/summary

// ─── Individual Task Routes ───────────────────────────────────────────────────

router
  .route("/:taskId")
  .get(getTask)                              // GET    /api/leads/:leadId/tasks/:taskId
  .patch(validate(updateTaskSchema), updateTask) // PATCH  /api/leads/:leadId/tasks/:taskId
  .delete(deleteTask);                       // DELETE /api/leads/:leadId/tasks/:taskId

router.patch(                                // PATCH /api/leads/:leadId/tasks/:taskId/complete
  "/:taskId/complete",
  validate(completeTaskSchema),
  completeTask
);

module.exports = router;