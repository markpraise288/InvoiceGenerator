const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const recordManualPaymentSchema = Joi.object({
  customer: objectId.required(),
  invoice: objectId.optional().allow(null),
  amount: Joi.number().integer().min(1).required(), // cents
  currency: Joi.string().trim().length(3).uppercase().optional(),
  method: Joi.string().valid("card", "bank_transfer", "manual").required(),
  status: Joi.string().valid("pending", "completed", "failed").optional(),
  paidAt: Joi.date().optional(),
  notes: Joi.string().trim().allow("").optional(),
});

const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "completed", "failed", "refunded").required(),
  notes: Joi.string().trim().allow("").optional(),
});

const createPayPalOrderSchema = Joi.object({
  customer: objectId.required(),
  invoice: objectId.optional().allow(null),
  amount: Joi.number().integer().min(1).required(), // cents
  currency: Joi.string().trim().length(3).uppercase().optional(),
});

const capturePayPalOrderSchema = Joi.object({
  orderId: Joi.string().required(),
});

const listPaymentsQuerySchema = Joi.object({
  customer: objectId.optional(),
  status: Joi.string().valid("pending", "completed", "failed", "refunded").optional(),
  method: Joi.string().valid("paypal", "card", "bank_transfer", "manual").optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("createdAt", "amount", "paidAt").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  recordManualPaymentSchema,
  updatePaymentStatusSchema,
  createPayPalOrderSchema,
  capturePayPalOrderSchema,
  listPaymentsQuerySchema,
};