const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      // stored in cents
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    method: {
      type: String,
      enum: ["paypal", "card", "bank_transfer", "manual"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paypalOrderId: {
      type: String,
      default: null,
      index: true,
    },
    paypalCaptureId: {
      type: String,
      default: null,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
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

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ customer: 1, status: 1 });
paymentSchema.index({ method: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);