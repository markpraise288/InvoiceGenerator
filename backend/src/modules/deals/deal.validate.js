// modules/deals/deal.validate.js

const Joi = require("joi");
const { DEAL_STAGES } = require("./deal.model");

// ─── Default probability per stage ────────────────────────────────────────────

const STAGE_PROBABILITY = {
  prospecting: 10,
  qualification: 20,
  proposal: 40,
  negotiation: 60,
  contract_sent: 80,
  closed_won: 100,
  closed_lost: 0,
};

const RELATED_TO = ["Lead", "Customer", "Contact", "Company"];

// ─── Create Deal ───────────────────────────────────────────────────────────────

const createDealSchema = Joi.object({
  title: Joi.string().trim().max(300).required().messages({
    "string.empty": "Deal title is required",
    "string.max": "Title must be 300 characters or fewer",
    "any.required": "Deal title is required",
  }),

  value: Joi.number().integer().min(0).required().messages({
    "number.base": "Value must be a number",
    "number.integer": "Value must be a whole number in cents",
    "number.min": "Value cannot be negative",
    "any.required": "Deal value is required",
  }),

  currency: Joi.string().trim().uppercase().length(3).default("USD").messages({
    "string.length": "Currency must be a 3-letter ISO code",
  }),

  stage: Joi.string()
    .valid(...DEAL_STAGES)
    .default("prospecting")
    .messages({
      "any.only": `Stage must be one of: ${DEAL_STAGES.join(", ")}`,
    }),

  probability: Joi.number().integer().min(0).max(100).optional().messages({
    "number.min": "Probability must be between 0 and 100",
    "number.max": "Probability must be between 0 and 100",
  }),

  closeDate: Joi.date().iso().required().messages({
    "date.base": "Close date must be a valid date",
    "date.format": "Close date must be ISO format",
    "any.required": "Close date is required",
  }),

  relatedId: Joi.string().hex().length(24).optional().messages({
    "string.length": "Contact must be a valid MongoDB ObjectId",
  }).required(),

  relatedTo: Joi.string().valid(...RELATED_TO).required(),

  owner: Joi.string().hex().length(24).optional().messages({
    "string.length": "Owner must be a valid MongoDB ObjectId",
  }),

  description: Joi.string().trim().max(2000).optional().messages({
    "string.max": "Description must be 2000 characters or fewer",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .messages({
      "array.max": "You can add up to 20 tags",
    }),
});

// ─── Update Deal ───────────────────────────────────────────────────────────────

const updateDealSchema = Joi.object({
  title: Joi.string().trim().max(300).optional(),

  value: Joi.number().integer().min(0).optional().messages({
    "number.integer": "Value must be a whole number in cents",
    "number.min": "Value cannot be negative",
  }),

  currency: Joi.string().trim().uppercase().length(3).optional(),

  stage: Joi.string()
    .valid(...DEAL_STAGES)
    .optional()
    .messages({
      "any.only": `Stage must be one of: ${DEAL_STAGES.join(", ")}`,
    }),

  probability: Joi.number().integer().min(0).max(100).optional(),

  closeDate: Joi.date().iso().optional(),

  relatedId: Joi.string().hex().length(24).optional().messages({
    "string.length": "Contact must be a valid MongoDB ObjectId",
  }).required(),

  relatedTo: Joi.string().valid(...RELATED_TO).required(),

  owner: Joi.string().hex().length(24).optional(),

  description: Joi.string().trim().max(2000).allow("").optional(),

  lostReason: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Lost reason must be 500 characters or fewer",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

// ─── Move Stage ────────────────────────────────────────────────────────────────
// Separate schema for kanban drag-and-drop stage moves

const moveStageSchema = Joi.object({
  stage: Joi.string()
    .valid(...DEAL_STAGES)
    .required()
    .messages({
      "any.only": `Stage must be one of: ${DEAL_STAGES.join(", ")}`,
      "any.required": "Stage is required",
    }),

  // Optional probability override on move
  probability: Joi.number().integer().min(0).max(100).optional(),

  // Required when moving to closed_lost
  lostReason: Joi.when("stage", {
    is: "closed_lost",
    then: Joi.string().trim().max(500).optional(),
    otherwise: Joi.forbidden(),
  }),
}).messages({
  "object.unknown": "Unexpected field provided",
});

// ─── Query Params ──────────────────────────────────────────────────────────────

const queryDealSchema = Joi.object({
  search: Joi.string().trim().max(200).optional(),

  stage: Joi.string()
    .valid(...DEAL_STAGES, "open", "closed")
    .optional()
    .messages({
      "any.only": "Invalid stage filter",
    }),

  owner: Joi.string().hex().length(24).optional(),
  contact: Joi.string().hex().length(24).optional(),
  company: Joi.string().hex().length(24).optional(),

  minValue: Joi.number().integer().min(0).optional(),
  maxValue: Joi.number().integer().min(0).optional(),

  closeDateFrom: Joi.date().iso().optional(),
  closeDateTo: Joi.date().iso().optional(),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),

  sortBy: Joi.string()
    .valid(
      "title",
      "value",
      "closeDate",
      "probability",
      "createdAt",
      "updatedAt"
    )
    .default("createdAt"),

  sortDir: Joi.string().valid("asc", "desc").default("desc"),
});

// ─── Validator Middleware Factory ──────────────────────────────────────────────

const validate = (schema, source = "body") => (req, res, next) => {
  const target = source === "query" ? req.query : req.body;

  const { error, value } = schema.validate(target, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: messages,
    });
  }

  if (source === "query") {
    req.query = value;
  } else {
    req.body = value;
  }

  next();
};

module.exports = {
  createDealSchema,
  updateDealSchema,
  moveStageSchema,
  queryDealSchema,
  validate,
  STAGE_PROBABILITY,
};