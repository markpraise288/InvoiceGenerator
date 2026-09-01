const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const billingAddressSchema = Joi.object({
  street: Joi.string().trim().allow("").optional(),
  city: Joi.string().trim().allow("").optional(),
  state: Joi.string().trim().allow("").optional(),
  country: Joi.string().trim().allow("").optional(),
  zip: Joi.string().trim().allow("").optional(),
});

const createCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().allow("").optional(),
  billingAddress: billingAddressSchema.optional(),
  company: objectId.optional().allow(null),
  contact: objectId.optional().allow(null),
  status: Joi.string().valid("active", "inactive", "delinquent").optional(),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  notes: Joi.string().trim().allow("").optional(),
  owner: objectId.optional().allow(null),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().allow("").optional(),
  billingAddress: billingAddressSchema.optional(),
  company: objectId.optional().allow(null),
  contact: objectId.optional().allow(null),
  status: Joi.string().valid("active", "inactive", "delinquent").optional(),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  notes: Joi.string().trim().allow("").optional(),
  owner: objectId.optional().allow(null),
}).min(1);

const listCustomersQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string().valid("active", "inactive", "delinquent").optional(),
  company: objectId.optional(),
  contact: objectId.optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("name", "createdAt", "totalRevenue").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
};