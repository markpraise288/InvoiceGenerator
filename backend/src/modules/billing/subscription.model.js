const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    // Who clicked "upgrade" — kept for audit purposes, billing itself lives on the workspace
    initiatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Starts as the pending "token" from createBillingAgreement, then gets
    // overwritten with the real agreement ID (I-XXXXXXXXXX) once executed
    paypalAgreementId: {
      type: String,
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["pro", "business"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending_approval", "active", "suspended", "cancelled", "expired"],
      default: "pending_approval",
    },
    approvalUrl: String,
    activatedAt: Date,
    cancelledAt: Date,
    lastPaymentDate: Date,
    paymentFailures: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);