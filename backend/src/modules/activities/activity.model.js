// modules/activities/activity.model.js

const mongoose = require("mongoose");

const RELATED_TO_TYPES = [
  "Lead",
  "Contact",
  "Deal",
  "Task",
  "Company",
  "Invoice",
  "Customer",
  "Project",
];

const ACTIVITY_TYPES = [
  // Generic — apply to any entity
  "created",
  "updated",
  "deleted",
  "assigned",
  "status_changed",
  "stage_changed",

  // Communication / logged interactions
  "note",
  "call",
  "email",
  "meeting",

  // Task-specific
  "task_completed",

  // Invoice-specific
  "invoice_sent",
  "invoice_viewed",
  "invoice_paid",
  "invoice_overdue",
  "invoice_cancelled",

  // Deal-specific
  "deal_won",
  "deal_lost",

  // Workspace/team-specific
  "member_invited",
  "member_joined",
  "member_removed",
  "member_role_changed",
];

const activitySchema = new mongoose.Schema(
  {
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedTo",
      required: true,
      index: true,
    },

    relatedTo: {
      type: String,
      enum: RELATED_TO_TYPES,
      required: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    body: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // For calls — duration in minutes
    duration: {
      type: Number,
      min: 0,
    },

    // For meetings — scheduled datetime
    scheduledAt: {
      type: Date,
    },

    // For emails — subject line
    subject: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    // Free-form extra context — e.g. { from: "Negotiation", to: "Proposal Sent" }
    // for status_changed/stage_changed, or { assignedTo: userId, assignedToName }
    // for assigned, or { role: "admin" } for member_role_changed
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast timeline queries per record, newest first
activitySchema.index({ relatedTo: 1, relatedId: 1, createdAt: -1 });

// Fast workspace-wide activity feed queries
activitySchema.index({ workspaceId: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

module.exports = { Activity, RELATED_TO_TYPES, ACTIVITY_TYPES };