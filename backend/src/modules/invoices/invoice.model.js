const mongoose = require("mongoose");

// ==============================
// 🔹 SUB-SCHEMAS
// ==============================

// Payment
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    method: {
      type: String,
      enum: ["cash", "bank", "card", "mobile_money"],
    },
    reference: String,
  },
  { _id: false }
);

// Invoice Item
const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },

    quantity: { type: Number, required: true },
    price: { type: Number, required: true },

    unit: {
      type: String,
      enum: ["hrs", "days", "items"],
    },

    hours: Number,
    rate: Number,

    taxRate: Number,
    discount: Number,

    total: Number,
  },
  { _id: false }
);

// Client Snapshot
const clientSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },

    companyName: String,
    taxId: String,
  },
  { _id: false }
);

// Payment Methods
const paymentMethodSchema = new mongoose.Schema(
  {
    method: String,
    details: String,
  },
  { _id: false }
);

// Fees
const feeSchema = new mongoose.Schema(
  {
    label: String,
    amount: Number,
  },
  { _id: false }
);

// ==============================
// 🔹 MAIN INVOICE SCHEMA
// ==============================

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },

    // 🔥 STATUS
    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "viewed",
        "paid",
        "partial",
        "overdue",
        "cancelled",
      ],
      default: "draft",
    },

    // 🔥 TYPE + TEMPLATE
    type: {
      type: String,
      enum: ["standard", "service", "subscription", "freelance"],
      default: "standard",
    },

    template: {
      type: String,
      enum: [
        "modern",
        "minimal",
        "classic",
        "corporateWave",
        "bold",
        "elegant",
        "bold-pro",
        "compact",
      ],
      default: "modern",
    },

    currency: {
      type: String,
      enum: ["USD", "MWK"],
      default: "MWK",
    },

    issueDate: String,
    dueDate: { type: String, required: true },

    // 🔥 TRACKING
    sentAt: String,
    viewedAt: String,
    paidAt: String,

    // 🔥 CLIENT SNAPSHOT
    clientSnapshot: clientSnapshotSchema,

    // 🔥 ITEMS
    items: [itemSchema],

    // 🔥 SERVICE DETAILS
    serviceDetails: {
      totalHours: Number,
      hourlyRate: Number,
      projectName: String,
    },

    // 🔥 SUBSCRIPTION
    subscriptionDetails: {
      planName: String,
      billingCycle: {
        type: String,
        enum: ["monthly", "yearly"],
      },
      startDate: String,
      endDate: String,
      nextBillingDate: String,
    },

    // 🔥 SHIPPING
    shipping: {
      cost: Number,
      method: String,
      address: String,
    },

    // 🔥 DISCOUNT
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "fixed",
      },
      value: { type: Number, default: 0 },
    },

    // 🔥 TAX
    tax: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      value: { type: Number, default: 0 },
    },

    // 🔥 EXTRA FEES
    fees: [feeSchema],

    // 🔥 PAYMENTS
    paymentMethods: [paymentMethodSchema],
    payments: [paymentSchema],

    // 🔥 CALCULATED FIELDS
    subtotal: Number,
    totalTax: Number,
    totalDiscount: Number,
    totalPaid: Number,
    balanceDue: Number,
    total: Number,

    // 🔥 EXTRA INFO
    notes: String,
    terms: String,

    // 🔥 BRANDING
    logoUrl: String,
    accentColor: String,

    // 🔥 SYSTEM
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
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ clientId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);