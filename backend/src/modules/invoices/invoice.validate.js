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

const itemSchema = joi
  .object({
    description: joi.string().required(),

    quantity: joi.number().min(1).required(),
    price: joi.number().min(0).required(),

    unit: joi.string().valid("hrs", "days", "items"),
    hours: joi.number().min(0),
    rate: joi.number().min(0),

    taxRate: joi.number().min(0),
    discount: joi.number().min(0),

    total: joi.number().min(0),
  })
  .allow(null, { description: "", quantity: 1, price: 0, total: 0 });

const customerSnapshotSchema = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required(),
  phone: joi.string().required().allow(null),
  address: joi.string().required().allow(null),

  companyName: joi.string().allow("", null),
  taxId: joi.string().allow("", null),
});

const paymentMethodSchema = joi.object({
  method: joi.string().allow("", null),
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
    .valid("draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled")
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
      "compact",
    )
    .default("modern"),

  currency: joi.string().valid("USD", "MWK").default("MWK"),

  issueDate: joi.string().allow(null, ""),
  dueDate: joi.string().required(),

  sentAt: joi.string(),
  viewedAt: joi.string(),
  paidAt: joi.string(),

  customerSnapshot: customerSnapshotSchema.required(),

  // 🔥 ITEMS — only required for "standard" and "freelance" invoices.
  // "service" and "subscription" invoices carry their pricing in
  // serviceDetails/subscriptionDetails instead, so an empty or omitted
  // items array must be allowed for those types.
  items: joi
    .array()
    .items(itemSchema)
    .allow(null)
    .when("type", {
      is: joi.string().valid("standard", "freelance"),
      then: joi.array().min(1).required(),
      otherwise: joi.array().min(0).allow(null).optional(),
    }),

  // 🔥 SERVICE
  serviceDetails: joi
    .object({
      totalHours: joi.number().min(0),
      hourlyRate: joi.number().min(0),
      projectName: joi.string().allow("", null),
    })
    .when("type", {
      is: "service",
      then: joi.object().required(),
      otherwise: joi.object().optional(),
    }),

  // 🔥 SUBSCRIPTION
  subscriptionDetails: joi
    .object({
      planName: joi.string().allow("", null),
      planPrice: joi.number(),
      billingCycle: joi.string().valid("monthly", "yearly").required(),
      startDate: joi.string().required(),
      endDate: joi.string().allow(null, ""),
      nextBillingDate: joi.string().allow(null, ""),
    })
    .when("type", {
      is: "subscription",
      then: joi.object().required(),
      otherwise: joi.object().optional(),
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
  paymentMethods: joi.array().items(paymentMethodSchema).allow(null),
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

  status: joi
    .string()
    .valid(
      "draft",
      "sent",
      "viewed",
      "paid",
      "partial",
      "overdue",
      "cancelled",
    ),

  type: joi.string().valid("standard", "service", "subscription", "freelance"),
  template: joi.string(),

  currency: joi.string().valid("USD", "MWK"),

  issueDate: joi.string(),
  dueDate: joi.string(),

  customerSnapshot: customerSnapshotSchema,

  // 🔥 ITEMS — same conditional relaxation as create. On update there's no
  // guaranteed "type" in the payload (partial updates), so this only
  // enforces min(1) when type is explicitly sent as standard/freelance;
  // otherwise any items array (including empty/omitted) is accepted.
  // UPDATE
  items: joi
    .array()
    .items(itemSchema.keys({ _id: joi.string() }))
    .allow(null)
    .when("type", {
      is: joi.string().valid("standard", "freelance"),
      then: joi.array().min(1),
      otherwise: joi.array().min(0).allow(null),
    }),
  payments: joi.array().items(paymentSchema.keys({ _id: joi.string() })),

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

  paymentMethods: joi.array().items(paymentMethodSchema).allow(null),

  notes: joi.string().allow("", null),
  terms: joi.string().allow("", null),

  logoUrl: joi.string().uri().allow("", null),
  accentColor: joi.string().allow("", null),
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
};
