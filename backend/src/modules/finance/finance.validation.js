const Joi = require("joi");

// ==============================
// 🔹 COMMON DATE FILTER SCHEMA
// ==============================
const dateFilterSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
}).custom((value, helpers) => {
  if (value.startDate && value.endDate) {
    if (new Date(value.startDate) > new Date(value.endDate)) {
      return helpers.message("startDate cannot be greater than endDate");
    }
  }
  return value;
});

// ==============================
// 🔹 FINANCE SUMMARY QUERY SCHEMA
// ==============================
const summaryQuerySchema = dateFilterSchema.keys({
  includeTrends: Joi.boolean().optional(),
});

// ==============================
// 🔹 EXPENSE BREAKDOWN QUERY SCHEMA
// ==============================
const breakdownQuerySchema = dateFilterSchema.keys({
  category: Joi.string()
    .valid("rent", "utilities", "marketing", "salary", "other")
    .optional(),
});

// ==============================
// 🔹 CASH FLOW QUERY SCHEMA
// ==============================
const cashFlowQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid("income", "expense").optional(),
});

// ==============================
// 🔹 GLOBAL QUERY CLEANER (IMPORTANT)
// ==============================
const sanitizeQuery = (schema) => {
  return schema.options({
    stripUnknown: true, // 🔥 removes unwanted query params
    abortEarly: false,
  });
};

module.exports = {
  summaryQuerySchema: sanitizeQuery(summaryQuerySchema),
  breakdownQuerySchema: sanitizeQuery(breakdownQuerySchema),
  cashFlowQuerySchema: sanitizeQuery(cashFlowQuerySchema),
};