const joi = require("joi");

// ==============================
// 🔹 REUSABLE PARTS
// ==============================

const paymentSchema = joi.object({
  amount: joi.number().min(0).required(),
  date: joi.string().required(),
  method: joi.string().valid("cash", "bank", "card", "mobile_money"),
  reference: joi.string().allow("", null),
});

const itemSchema = joi.object({
  description: joi.string().required(),

  quantity: joi.number().min(1).required(),
  price: joi.number().min(0).required(),

  unit: joi.string().valid("hrs", "days", "items"),
  hours: joi.number().min(0),
  rate: joi.number().min(0),

  taxRate: joi.number().min(0),
  discount: joi.number().min(0),

  total: joi.number().min(0),
});

const clientSnapshotSchema = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required(),
  phone: joi.string().required(),
  address: joi.string().required(),

  companyName: joi.string().allow("", null),
  taxId: joi.string().allow("", null),
});

const paymentMethodSchema = joi.object({
  method: joi.string().required(),
  details: joi.string().allow("", null),
});

const feeSchema = joi.object({
  label: joi.string().required(),
  amount: joi.number().min(0).required(),
});

// ==============================
// 🧾 CREATE INVOICE
// ==============================
const createInvoiceSchema = joi.object({
  invoiceNumber: joi.string(),

  clientId: joi.string(),

  status: joi
    .string()
    .valid(
      "draft",
      "sent",
      "viewed",
      "paid",
      "partial",
      "overdue",
      "cancelled"
    )
    .default("draft"),

  type: joi
    .string()
    .valid("standard", "service", "subscription", "freelance")
    .default("standard"),

  template: joi
    .string()
    .valid(
      "modern",
      "minimal",
      "classic",
      "corporateWave",
      "bold",
      "elegant",
      "bold-pro",
      "compact"
    )
    .default("modern"),

  currency: joi.string().valid("USD", "MWK").default("MWK"),

  issueDate: joi.string().allow(null, ""),
  dueDate: joi.string().required(),

  sentAt: joi.string(),
  viewedAt: joi.string(),
  paidAt: joi.string(),

  clientSnapshot: clientSnapshotSchema.required(),

  // 🔥 ITEMS
  items: joi.array().items(itemSchema).min(1).required(),

  // 🔥 SERVICE
  serviceDetails: joi.object({
    totalHours: joi.number().min(0),
    hourlyRate: joi.number().min(0),
    projectName: joi.string().allow("", null),
  }),

  // 🔥 SUBSCRIPTION
  subscriptionDetails: joi.object({
    planName: joi.string().allow("", null),
    billingCycle: joi.string().valid("monthly", "yearly").required(),
    startDate: joi.string().required(),
    endDate: joi.string().allow(null, ""),
    nextBillingDate: joi.string().allow(null, ""),
  }),

  // 🔥 SHIPPING
  shipping: joi.object({
    cost: joi.number().min(0).required(),
    method: joi.string().allow("", null),
    address: joi.string().allow("", null),
  }),

  // 🔥 DISCOUNT
  discount: joi.object({
    type: joi.string().valid("percentage", "fixed").default("fixed"),
    value: joi.number().min(0).default(0),
  }),

  // 🔥 TAX
  tax: joi.object({
    type: joi.string().valid("percentage", "fixed").default("percentage"),
    value: joi.number().min(0).default(0),
  }),

  // 🔥 FEES
  fees: joi.array().items(feeSchema),

  // 🔥 PAYMENTS
  paymentMethods: joi.array().items(paymentMethodSchema),
  payments: joi.array().items(paymentSchema),

  // 🔥 CALCULATED (optional)
  subtotal: joi.number(),
  totalTax: joi.number(),
  totalDiscount: joi.number(),
  totalPaid: joi.number(),
  balanceDue: joi.number(),
  total: joi.number(),

  // 🔥 EXTRA
  notes: joi.string().allow("", null),
  terms: joi.string().allow("", null),

  // 🔥 BRANDING
  logoUrl: joi.string().uri().allow("", null),
  accentColor: joi.string().allow("", null),
});

// ==============================
// 🔄 UPDATE INVOICE
// ==============================
const updateInvoiceSchema = joi.object({
  invoiceNumber: joi.string(),
  clientId: joi.string(),
  userId: joi.string(),

  status: joi.string().valid(
    "draft",
    "sent",
    "viewed",
    "paid",
    "partial",
    "overdue",
    "cancelled"
  ),

  type: joi.string().valid("standard", "service", "subscription", "freelance"),
  template: joi.string(),

  currency: joi.string().valid("USD", "MWK"),

  issueDate: joi.string(),
  dueDate: joi.string(),

  clientSnapshot: clientSnapshotSchema,

  items: joi.array().items(itemSchema.keys({ _id: joi.string() })),

  payments: joi.array().items(
    paymentSchema.keys({ _id: joi.string() })
  ),

  serviceDetails: joi.object({
    totalHours: joi.number(),
    hourlyRate: joi.number(),
    projectName: joi.string(),
  }),

  subscriptionDetails: joi.object({
    planName: joi.string(),
    billingCycle: joi.string().valid("monthly", "yearly"),
    startDate: joi.string(),
    endDate: joi.string(),
    nextBillingDate: joi.string(),
  }),

  shipping: joi.object({
    cost: joi.number(),
    method: joi.string(),
    address: joi.string(),
  }),

  discount: joi.object({
    type: joi.string().valid("percentage", "fixed"),
    value: joi.number(),
  }),

  tax: joi.object({
    type: joi.string().valid("percentage", "fixed"),
    value: joi.number(),
  }),

  fees: joi.array().items(feeSchema),

  paymentMethods: joi.array().items(paymentMethodSchema),

  notes: joi.string().allow("", null),
  terms: joi.string().allow("", null),

  logoUrl: joi.string().uri().allow("", null),
  accentColor: joi.string().allow("", null),
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
};