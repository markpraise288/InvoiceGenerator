// modules/deals/deal.model.js

const mongoose = require("mongoose");

const DEAL_STAGES = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "contract_sent",
  "closed_won",
  "closed_lost",
];

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    // Value in USD cents
    value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
      maxlength: 3,
    },
    stage: {
      type: String,
      enum: DEAL_STAGES,
      default: "prospecting",
      index: true,
    },
    // Win probability 0-100
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    closeDate: {
      type: Date,
      required: true,
      index: true,
    },
    // Relationships
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedTo",
      index: true,
    },
    relatedTo: {
      type: String,
      enum: ["Lead", "Customer", "Company", "Contact"],
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Won/lost tracking
    closedAt: {
      type: Date,
      default: null,
    },
    lostReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ──────────────────────────────────────────────────────────────────

// Weighted value = value * probability / 100
dealSchema.virtual("weightedValue").get(function () {
  return Math.round((this.value * this.probability) / 100);
});

// Is the deal overdue — past close date and not closed
dealSchema.virtual("isOverdue").get(function () {
  if (
    this.stage === "closed_won" ||
    this.stage === "closed_lost"
  ) {
    return false;
  }
  return this.closeDate < new Date();
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Pipeline view — all open deals by stage
dealSchema.index({ stage: 1, closeDate: 1 });

// Owner pipeline
dealSchema.index({ owner: 1, stage: 1, closeDate: 1 });

// Related deals
dealSchema.index({ relatedId: 1, createdAt: -1 });

// Reports — won deals by date
dealSchema.index({ stage: 1, closedAt: -1 });

// Text search
dealSchema.index({ title: "text" });

const Deal = mongoose.model("Deal", dealSchema);

module.exports = { Deal, DEAL_STAGES };