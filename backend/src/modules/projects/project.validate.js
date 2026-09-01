const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().allow("").optional(),
  relatedId: objectId.required(),
  relatedTo: Joi.string().valid("Customer", "Company", "Deal", "Contact").required(),
  status: Joi.string()
    .valid("planning", "active", "on_hold", "completed", "cancelled")
    .optional(),
  startDate: Joi.date().optional().allow(null),
  dueDate: Joi.date().optional().allow(null),
  budget: Joi.number().integer().min(0).optional(), // cents
  owner: objectId.optional().allow(null),
  members: Joi.array().items(objectId).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().allow("").optional(),
  relatedId: objectId.optional(),
  relatedTo: Joi.string().valid("Customer", "Company", "Deal", "Contact"),
  status: Joi.string()
    .valid("planning", "active", "on_hold", "completed", "cancelled")
    .optional(),
  startDate: Joi.date().optional().allow(null),
  dueDate: Joi.date().optional().allow(null),
  budget: Joi.number().integer().min(0).optional(),
  owner: objectId.optional().allow(null),
  members: Joi.array().items(objectId).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
}).min(1);

const updateProjectStatusSchema = Joi.object({
  status: Joi.string()
    .valid("planning", "active", "on_hold", "completed", "cancelled")
    .required(),
});

const listProjectsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid("planning", "active", "on_hold", "completed", "cancelled")
    .optional(),
  relatedId: objectId.optional(),
  relatedTo: Joi.string().valid("Customer", "Company", "Deal", "Contact"),
  owner: objectId.optional(),
  member: objectId.optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("name", "createdAt", "dueDate").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  listProjectsQuerySchema,
};