const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "My Workspace",
    },
    logo: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    industry: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    timezone: {
      type: String,
      default: "UTC",
      maxlength: 100,
    },
    currency: {
      type: String,
      default: "USD",
      maxlength: 3,
    },
    dateFormat: {
      type: String,
      enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
      default: "MM/DD/YYYY",
    },
    fiscalYearStart: {
      type: Number,
      min: 1,
      max: 12,
      default: 1, // January
    },
    // Billing fields
    plan: {
      type: String,
      enum: ["starter", "pro", "business"],
      default: "starter",
    },
    paypalSubscriptionId: {
      type: String,
      sparse: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "pending", "suspended", "cancelled"],
      default: "pending",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    nextBillingDate: Date,
    lastPaymentDate: Date,
  },
  {
    timestamps: true,
  },
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

module.exports = Workspace;
