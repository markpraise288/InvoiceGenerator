// modules/activities/activity.validate.js

const Joi = require("joi");
const { RELATED_TO_TYPES, ACTIVITY_TYPES } = require("./activity.model");

// ─── User-creatable types only ─────────────────────────────────────────────────
// System-generated types (created/updated/stage_changed/deal_won/etc.) are
// never created via this validated endpoint — they're only ever produced
// internally by other modules calling activityService.logActivity directly.
// This whitelist is what a user is allowed to submit through the API.

const USER_CREATABLE_TYPES = ["note", "call", "email", "meeting"];

// ─── Create activity (user-initiated) ──────────────────────────────────────────

const createActivitySchema = Joi.object({
  relatedId: Joi.string().hex().length(24).required().messages({
    "string.length": "Related record ID must be a valid MongoDB ObjectId",
    "any.required": "Related record ID is required",
  }),

  relatedTo: Joi.string()
    .valid(...RELATED_TO_TYPES)
    .required()
    .messages({
      "any.only": `Related type must be one of: ${RELATED_TO_TYPES.join(", ")}`,
      "any.required": "Related type is required",
    }),

  type: Joi.string()
    .valid(...USER_CREATABLE_TYPES)
    .required()
    .messages({
      "any.only": `Type must be one of: ${USER_CREATABLE_TYPES.join(", ")}`,
      "any.required": "Activity type is required",
    }),

  title: Joi.string().trim().max(200).allow("", null).optional(),

  body: Joi.string().trim().max(5000).allow("", null).optional(),

  // Call-specific
  duration: Joi.number().min(0).when("type", {
    is: "call",
    then: Joi.optional(),
    otherwise: Joi.forbidden().messages({
      "any.unknown": "Duration is only applicable to call activities",
    }),
  }),

  // Meeting-specific
  scheduledAt: Joi.date().iso().when("type", {
    is: "meeting",
    then: Joi.optional(),
    otherwise: Joi.forbidden().messages({
      "any.unknown": "Scheduled date is only applicable to meeting activities",
    }),
  }),

  // Email-specific
  subject: Joi.string().trim().max(300).when("type", {
    is: "email",
    then: Joi.optional(),
    otherwise: Joi.forbidden().messages({
      "any.unknown": "Subject is only applicable to email activities",
    }),
  }),

  meta: Joi.object().unknown(true).optional(),
});

// ─── Update activity ────────────────────────────────────────────────────────────
// Only note/call/email/meeting content fields are editable — relatedId,
// relatedTo, and type itself are never changeable after creation.

const updateActivitySchema = Joi.object({
  title: Joi.string().trim().max(200).allow("", null).optional(),
  body: Joi.string().trim().max(5000).allow("", null).optional(),
  duration: Joi.number().min(0).optional(),
  scheduledAt: Joi.date().iso().optional(),
  subject: Joi.string().trim().max(300).optional(),
  meta: Joi.object().unknown(true).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update",
  });

// ─── Query — record timeline ───────────────────────────────────────────────────

const queryRecordActivitiesSchema = Joi.object({
  relatedTo: Joi.string()
    .valid(...RELATED_TO_TYPES)
    .required()
    .messages({
      "any.required": "relatedTo is required",
      "any.only": `relatedTo must be one of: ${RELATED_TO_TYPES.join(", ")}`,
    }),

  relatedId: Joi.string().hex().length(24).required().messages({
    "string.length": "relatedId must be a valid MongoDB ObjectId",
    "any.required": "relatedId is required",
  }),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

// ─── Query — workspace feed ─────────────────────────────────────────────────────

const queryWorkspaceFeedSchema = Joi.object({
  type: Joi.string()
    .valid(...ACTIVITY_TYPES)
    .optional(),

  relatedTo: Joi.string()
    .valid(...RELATED_TO_TYPES)
    .optional(),

  userId: Joi.string().hex().length(24).optional(),

  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(30),
});

// ─── Query — recent activity (dashboard widget) ────────────────────────────────

const queryRecentActivitySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(8),
});

// ─── Validator middleware factory ──────────────────────────────────────────────

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
  createActivitySchema,
  updateActivitySchema,
  queryRecordActivitiesSchema,
  queryWorkspaceFeedSchema,
  queryRecentActivitySchema,
  validate,
  USER_CREATABLE_TYPES,
};