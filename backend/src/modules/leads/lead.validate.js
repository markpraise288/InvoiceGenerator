const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const sourceEnum = [
  "website",
  "referral",
  "cold_outreach",
  "social_media",
  "event",
  "advertisement",
  "other",
];

const stageEnum = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const createLeadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().allow("").optional(),
  company: Joi.string().trim().allow("").optional(),
  source: Joi.string().valid(...sourceEnum).optional(),
  stage: Joi.string().valid(...stageEnum).optional(),
  score: Joi.number().integer().min(0).max(100).optional(),
  value: Joi.number().integer().min(0).optional(), // cents
  currency: Joi.string().trim().length(3).uppercase().optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  notes: Joi.string().trim().allow("").optional(),
  lastContactedAt: Joi.date().optional().allow(null),
  owner: objectId.optional().allow(null),
});

const updateLeadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().allow("").optional(),
  company: Joi.string().trim().allow("").optional(),
  source: Joi.string().valid(...sourceEnum).optional(),
  score: Joi.number().integer().min(0).max(100).optional(),
  value: Joi.number().integer().min(0).optional(),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  notes: Joi.string().trim().allow("").optional(),
  lastContactedAt: Joi.date().optional().allow(null),
  owner: objectId.optional().allow(null),
  // stage intentionally excluded — use the dedicated stage-update endpoint instead
}).min(1);

const updateLeadStageSchema = Joi.object({
  stage: Joi.string().valid(...stageEnum).required(),
  lostReason: Joi.string().trim().allow("").optional(), // relevant when stage === "lost"
});

const convertLeadSchema = Joi.object({
  billingAddress: Joi.object({
    street: Joi.string().trim().allow("").optional(),
    city: Joi.string().trim().allow("").optional(),
    state: Joi.string().trim().allow("").optional(),
    country: Joi.string().trim().allow("").optional(),
    zip: Joi.string().trim().allow("").optional(),
  }).optional(),
  company: objectId.optional().allow(null), // link to existing Company record, if applicable
  contact: objectId.optional().allow(null), // link to existing Contact record, if applicable
});

const listLeadsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  stage: Joi.string().valid(...stageEnum).optional(),
  source: Joi.string().valid(...sourceEnum).optional(),
  owner: objectId.optional(),
  minScore: Joi.number().integer().min(0).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("name", "createdAt", "score", "value", "lastContactedAt").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  convertLeadSchema,
  listLeadsQuerySchema,
};