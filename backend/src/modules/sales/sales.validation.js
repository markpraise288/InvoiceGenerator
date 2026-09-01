const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const statusEnum = ["draft", "pending", "paid", "cancelled", "refunded"];

const lineItemSchema = Joi.object({
  description: Joi.string().trim().min(1).max(300).required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().integer().min(0).required(), // cents
});

const createSaleSchema = Joi.object({
  customer: objectId.required(),
  lineItems: Joi.array().items(lineItemSchema).min(1).required(),
  discount: Joi.number().integer().min(0).optional(), // cents
  tax: Joi.number().integer().min(0).optional(), // cents
  currency: Joi.string().trim().length(3).uppercase().optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  saleDate: Joi.date().optional(),
  notes: Joi.string().trim().allow("").optional(),
  owner: objectId.optional().allow(null),
});

const updateSaleSchema = Joi.object({
  customer: objectId.optional(),
  lineItems: Joi.array().items(lineItemSchema).min(1).optional(),
  discount: Joi.number().integer().min(0).optional(),
  tax: Joi.number().integer().min(0).optional(),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  saleDate: Joi.date().optional(),
  notes: Joi.string().trim().allow("").optional(),
  owner: objectId.optional().allow(null),
  // status intentionally excluded — dedicated status endpoint, same pattern as everywhere else
}).min(1);

const updateSaleStatusSchema = Joi.object({
  status: Joi.string().valid(...statusEnum).required(),
});

const listSalesQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(), // matches saleNumber or customer name
  customer: objectId.optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("saleDate", "createdAt", "total", "saleNumber").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  createSaleSchema,
  updateSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
};