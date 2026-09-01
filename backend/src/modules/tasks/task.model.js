// modules/tasks/task.model.js

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    relatedTo: {
      type: String,
      enam: ["Customer", "Deal", "Lead", "Project", "Contact", "Company"],
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: isOverdue ────────────────────────────────────────────────────────

taskSchema.virtual("isOverdue").get(function () {
  if (this.completed) return false;
  return this.dueDate < new Date();
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

taskSchema.index({ lead: 1, completed: 1, dueDate: 1 });
taskSchema.index({ assignedTo: 1, completed: 1, dueDate: 1 });
taskSchema.index({ completed: 1, dueDate: 1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;