const mongoose = require("mongoose");

const subscriptionInvoiceSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    paypalTransactionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true, // stored in cents
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "pending",
    },
    paidAt: Date,
    refundedAt: Date,
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionInvoice", subscriptionInvoiceSchema);