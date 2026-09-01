// modules/settings/settings.model.js

const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // One settings document per workspace/org
    // For a single-tenant app this is always one document
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },

    // Default notification preferences (overridden per user)
    notifications: {
      emailOnLeadAssigned: { type: Boolean, default: true },
      emailOnDealWon: { type: Boolean, default: true },
      emailOnDealLost: { type: Boolean, default: false },
      emailOnTaskDue: { type: Boolean, default: true },
      emailOnTaskOverdue: { type: Boolean, default: true },
      emailOnMentioned: { type: Boolean, default: true },
      emailDigest: {
        type: String,
        enum: ["never", "daily", "weekly"],
        default: "daily",
      },
    },

    // Feature flags
    features: {
      dealsEnabled: { type: Boolean, default: true },
      reportsEnabled: { type: Boolean, default: true },
      tasksEnabled: { type: Boolean, default: true },
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

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;