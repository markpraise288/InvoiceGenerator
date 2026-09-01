// modules/contacts/contact.validate.js

const Joi = require("joi");

const CONTACT_STAGES = [
  "subscriber",
  "lead",
  "opportunity",
  "customer",
  "evangelist",
  "other",
];

const RELATED_TO = ["Lead", "Customer", "Company"];

// ─── Reusable sub-schemas ──────────────────────────────────────────────────────

const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  country: Joi.string().trim().max(100).optional(),
  zip: Joi.string().trim().max(20).optional(),
});

const socialSchema = Joi.object({
  linkedin: Joi.string()
    .trim()
    .max(500)
    .uri({ scheme: ["http", "https"] })
    .optional()
    .messages({
      "string.uri": "LinkedIn must be a valid URL",
    }),
  twitter: Joi.string()
    .trim()
    .max(500)
    .uri({ scheme: ["http", "https"] })
    .optional()
    .messages({
      "string.uri": "Twitter must be a valid URL",
    }),
});

// ─── Create Contact ────────────────────────────────────────────────────────────

const createContactSchema = Joi.object({
  name: Joi.string().trim().max(200).required().messages({
    "string.empty": "Contact name is required",
    "string.max": "Name must be 200 characters or fewer",
    "any.required": "Contact name is required",
  }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(254)
    .optional()
    .messages({
      "string.email": "Must be a valid email address",
      "string.max": "Email must be 254 characters or fewer",
    }),

  phone: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[+\d\s\-().]+$/, "valid phone")
    .optional()
    .messages({
      "string.pattern.name": "Phone number contains invalid characters",
      "string.max": "Phone must be 30 characters or fewer",
    }),

  position: Joi.string().trim().max(150).optional().messages({
    "string.max": "Position must be 150 characters or fewer",
  }),

  relatedId: Joi.string().hex().length(24).optional().messages({
    "string.length": "Company must be a valid MongoDB ObjectId",
  }).required(),

  relatedTo: Joi.string().valid(...RELATED_TO).required(),

  stage: Joi.string()
    .valid(...CONTACT_STAGES)
    .default("lead")
    .messages({
      "any.only": `Stage must be one of: ${CONTACT_STAGES.join(", ")}`,
    }),

  social: socialSchema.optional(),
  address: addressSchema.optional(),

  description: Joi.string().trim().max(2000).optional().messages({
    "string.max": "Description must be 2000 characters or fewer",
  }),

  owner: Joi.string().hex().length(24).optional().messages({
    "string.length": "Owner must be a valid MongoDB ObjectId",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .messages({
      "array.max": "You can add up to 20 tags",
    }),

  lastContactedAt: Joi.date().iso().optional().messages({
    "date.format": "lastContactedAt must be a valid ISO date",
  }),
});

// ─── Update Contact ────────────────────────────────────────────────────────────

const updateContactSchema = Joi.object({
  name: Joi.string().trim().max(200).optional().messages({
    "string.max": "Name must be 200 characters or fewer",
  }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(254)
    .allow("")
    .optional()
    .messages({
      "string.email": "Must be a valid email address",
    }),

  phone: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[+\d\s\-().]+$/, "valid phone")
    .allow("")
    .optional()
    .messages({
      "string.pattern.name": "Phone number contains invalid characters",
    }),

  position: Joi.string().trim().max(150).allow("").optional(),

  relatedId: Joi.string().hex().length(24).allow(null).optional().messages({
    "string.length": "Company must be a valid MongoDB ObjectId",
  }),

  relatedTo: Joi.string().valid(...RELATED_TO).allow(""),

  stage: Joi.string()
    .valid(...CONTACT_STAGES)
    .optional()
    .messages({
      "any.only": `Stage must be one of: ${CONTACT_STAGES.join(", ")}`,
    }),

  social: socialSchema.optional(),
  address: addressSchema.optional(),

  description: Joi.string().trim().max(2000).allow("").optional(),

  owner: Joi.string().hex().length(24).optional().messages({
    "string.length": "Owner must be a valid MongoDB ObjectId",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional(),

  lastContactedAt: Joi.date().iso().allow(null).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

// ─── Query / Filter Params ─────────────────────────────────────────────────────

const queryContactSchema = Joi.object({
  search: Joi.string().trim().max(200).optional(),

  stage: Joi.string()
    .valid(...CONTACT_STAGES)
    .optional(),

  owner: Joi.string().hex().length(24).optional(),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),

  sortBy: Joi.string()
    .valid("name", "email", "createdAt", "updatedAt", "lastContactedAt")
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
  createContactSchema,
  updateContactSchema,
  queryContactSchema,
  validate,
};