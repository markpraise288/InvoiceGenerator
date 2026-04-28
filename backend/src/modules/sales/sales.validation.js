const { clientCommandMessageReg } = require("bullmq");
const joi = require("joi");

// ==============================
// 🔹 CREATE SALE SCHEMA
// ==============================
const createSaleSchema = joi.object({
  // source is forced to "manual" in controller
  source: joi.string().valid("manual").default("manual"),

  clientId: joi.string().allow(null),

  client: joi.string().allow(null),

  amount: joi.number().min(0).required(),

  status: joi.string().valid("paid", "pending").default("paid"),

  date: joi.date().default(Date.now),

  notes: joi.string().allow("", null),
});

// ==============================
// 🔹 UPDATE SALE SCHEMA
// ==============================
const updateSaleSchema = joi.object({
  // source cannot be updated
  client: joi.string().allow(null),

  amount: joi.number().min(0),

  status: joi.string().valid("paid", "pending"),

  date: joi.date(),

  notes: joi.string().allow("", null),
});

// ==============================
// 🔹 QUERY SCHEMA (FILTERS & PAGINATION)
// ==============================
const querySchema = joi.object({
  status: joi.string().valid("paid", "pending"),

  source: joi.string().valid("invoice", "manual"),

  startDate: joi.date().iso(),

  endDate: joi.date().iso(),

  page: joi.number().integer().min(1).default(1),

  limit: joi.number().integer().min(1).max(100).default(10),

  sortBy: joi.string().valid("date", "amount", "status", "createdAt").default("date"),

  sortOrder: joi.number().valid(1, -1).default(-1),
});

module.exports = {
  createSaleSchema,
  updateSaleSchema,
  querySchema,
};