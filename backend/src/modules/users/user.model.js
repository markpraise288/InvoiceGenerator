const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  companyName: {
    type: String,
  },

  // 💳 Payment/Billing Info
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ["free", "pro", "business"],
    default: "free",
  },
  subscriptionStatus: {
    type: String,
    enum: ["active", "inactive", "cancelled"],
    default: "inactive",
  },
  paypalOrderId: {
    type: String, // For one-time payments
  },
  subscriptionId: {
    type: String, // For PayPal recurring subscriptions
  },
  nextBillingDate: {
    type: Date,
  },

  refreshToken: {
    type: String,
  },

  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpiry: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔍 Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });

module.exports = mongoose.model("User", userSchema);