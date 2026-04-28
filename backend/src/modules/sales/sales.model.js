const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      type: String,
      required: true,
      enum: ["invoice", "manual"],
      default: "manual",
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },

    client: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      enum: ["paid", "pending"],
      default: "paid",
      index: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ==============================
// 🔍 INDEXES (IMPORTANT)
// ==============================
salesSchema.index({ userId: 1, date: -1 });
salesSchema.index({ userId: 1, status: 1 });
module.exports = mongoose.model("Sale", salesSchema);