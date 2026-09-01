const mongoose = require("mongoose");
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: [
        "website",
        "referral",
        "cold_outreach",
        "social_media",
        "event",
        "advertisement",
        "other",
      ],
      default: "other",
    },
    stage: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      default: "new",
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
      // estimated deal value, stored in cents
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    lostReason: {
      type: String,
      trim: true,
      default: "",
    },
    lastContactedAt: {
      type: Date,
      default: null,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    convertedCustomer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
  },
  { timestamps: true }
);

leadSchema.index({ name: "text", email: "text", company: "text" });
leadSchema.index({ stage: 1, owner: 1 });
leadSchema.index({ createdBy: 1, stage: 1 });
leadSchema.index({ email: 1 });

module.exports = mongoose.model("Lead", leadSchema);