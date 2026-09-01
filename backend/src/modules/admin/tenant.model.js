const mongoose = require("mongoose");
const { Schema } = mongoose;

const tenantSchema = new Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    ownerUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // the User document representing this tenant's primary admin/owner account
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "suspended", "cancelled"],
      default: "trialing",
      index: true,
    },
    mrr: {
      type: Number,
      default: 0,
      min: 0,
      // monthly recurring revenue from this tenant, in cents
    },
    userCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedReason: {
      type: String,
      trim: true,
      default: "",
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    signupSource: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      // free-form bucket for anything else you want to track per tenant
      // without a schema migration (e.g. { industry: "consulting" })
    },
  },
  { timestamps: true }
);

tenantSchema.index({ businessName: "text", ownerEmail: "text" });
tenantSchema.index({ plan: 1, status: 1 });
tenantSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Tenant", tenantSchema);