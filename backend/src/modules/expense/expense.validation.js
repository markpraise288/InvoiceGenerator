const joi = require("joi");

// ==============================
// 🔹 CREATE EXPENSE SCHEMA
// ==============================
const createExpenseSchema = joi.object({
  title: joi.string().required().trim(),

  amount: joi.number().min(0).required(),

  category: joi
    .string()
    .valid("rent", "utilities", "marketing", "salaries", "office", "software", "travel", "other")
    .required(),

  date: joi.date().default(Date.now),

  notes: joi.string().allow("", null),

  receiptUrl: joi.string().uri().allow("", null),
});

// ==============================
// 🔹 UPDATE EXPENSE SCHEMA
// ==============================
const updateExpenseSchema = joi.object({
  title: joi.string().trim(),

  amount: joi.number().min(0),

  category: joi.string().valid("rent", "utilities", "marketing", "salary", "other"),

  date: joi.date(),

  notes: joi.string().allow("", null),

  receiptUrl: joi.string().uri().allow("", null),
});

// ==============================
// 🔹 QUERY SCHEMA (FILTERS & PAGINATION)
// ==============================
const querySchema = joi.object({
  category: joi.string().valid("rent", "utilities", "marketing", "salary", "other"),

  startDate: joi.date().iso(),

  endDate: joi.date().iso(),

  page: joi.number().integer().min(1).default(1),

  limit: joi.number().integer().min(1).max(100).default(10),

  sortBy: joi.string().valid("date", "amount", "category", "createdAt").default("date"),

  sortOrder: joi.number().valid(1, -1).default(-1),
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  querySchema,
};