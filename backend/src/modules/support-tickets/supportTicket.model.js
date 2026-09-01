const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    category: {
      type: String,
      enum: ["bug", "billing", "feature_request", "account", "other"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    // Denormalized for cheap inbox listing — avoids an extra query per
    // ticket just to show "last message" preview/timestamp in a list
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessagePreview: {
      type: String,
      maxlength: 200,
    },
    userUnreadCount: {
      type: Number,
      default: 0, // admin replies the user hasn't seen yet
    },
    adminUnreadCount: {
      type: Number,
      default: 0, // user messages no admin has seen yet
    },
    closedAt: Date,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Admin inbox: filter by status, sort by most recently active
supportTicketSchema.index({ status: 1, lastMessageAt: -1 });
// User's own ticket history
supportTicketSchema.index({ userId: 1, createdAt: -1 });

// Collection: "supporttickets" — deliberately distinct from your existing
// "reports" collection (deals/leads/tasks analytics) to avoid any collision
module.exports = mongoose.model("SupportTicket", supportTicketSchema);