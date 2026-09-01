const mongoose = require("mongoose");
const { Schema } = mongoose;

const lineItemSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      // cents
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      // cents — quantity * unitPrice, computed server-side, never trusted from client
    },
  },
  { _id: false }
);

const saleSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      // human-readable identifier, e.g. "SALE-0001" — generated server-side
    },
    lineItems: {
      type: [lineItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "A sale must have at least one line item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      // cents — sum of all line item totals, computed server-side
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      // cents, flat amount off subtotal
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
      // cents
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      // cents — subtotal - discount + tax, computed server-side
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "paid", "cancelled", "refunded"],
      default: "draft",
      index: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
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

saleSchema.index({ saleNumber: 1 }, { unique: true });
saleSchema.index({ customer: 1, status: 1 });
saleSchema.index({ saleDate: -1 });
saleSchema.index({ status: 1, createdBy: 1 });

module.exports = mongoose.model("Sale", saleSchema);