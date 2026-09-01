const mongoose = require("mongoose");
const { Schema } = mongoose;

const billingAddressSchema = new Schema(
  {
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    zip: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const customerSchema = new Schema(
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
    billingAddress: {
      type: billingAddressSchema,
      default: () => ({}),
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "delinquent"],
      default: "active",
      index: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ name: "text", email: "text" });
customerSchema.index({ email: 1 });
customerSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model("Customer", customerSchema);