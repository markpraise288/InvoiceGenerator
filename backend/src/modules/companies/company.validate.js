// modules/companies/company.validate.js

const Joi = require("joi");

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const RELATED_TO = ["Lead", "Customer"];
// ─── Reusable sub-schemas ──────────────────────────────────────────────────────

const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  country: Joi.string().trim().max(100).optional(),
  zip: Joi.string().trim().max(20).optional(),
});

const domainSchema = Joi.string()
  .trim()
  .lowercase()
  .max(253)
  .pattern(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
    "valid domain"
  )
  .optional()
  .messages({
    "string.pattern.name": "Domain must be a valid domain e.g. example.com",
    "string.max": "Domain must be 253 characters or fewer",
  });

const websiteSchema = Joi.string()
  .trim()
  .max(500)
  .uri({ scheme: ["http", "https"] })
  .optional()
  .messages({
    "string.uri": "Website must be a valid URL starting with http:// or https://",
    "string.max": "Website must be 500 characters or fewer",
  });

// ─── Create Company ────────────────────────────────────────────────────────────

const createCompanySchema = Joi.object({
  name: Joi.string().trim().max(200).required().messages({
    "string.empty": "Company name is required",
    "string.max": "Company name must be 200 characters or fewer",
    "any.required": "Company name is required",
  }),

  domain: domainSchema,
  website: websiteSchema,

  industry: Joi.string().trim().max(100).optional().messages({
    "string.max": "Industry must be 100 characters or fewer",
  }),

  size: Joi.string()
    .valid(...COMPANY_SIZES)
    .optional()
    .messages({
      "any.only": `Size must be one of: ${COMPANY_SIZES.join(", ")}`,
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

  email: Joi.string().trim().lowercase().email().max(254).optional().messages({
    "string.email": "Must be a valid email address",
    "string.max": "Email must be 254 characters or fewer",
  }),

  address: addressSchema.optional(),

  description: Joi.string().trim().max(2000).optional().messages({
    "string.max": "Description must be 2000 characters or fewer",
  }),

  revenue: Joi.number().integer().min(0).optional().messages({
    "number.integer": "Revenue must be a whole number (in cents)",
    "number.min": "Revenue cannot be negative",
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

  relatedId: Joi.string().required(),
  relatedTo: Joi.string().valid(...RELATED_TO).required(),
});

// ─── Update Company ────────────────────────────────────────────────────────────

const updateCompanySchema = Joi.object({
  name: Joi.string().trim().max(200).optional().messages({
    "string.max": "Company name must be 200 characters or fewer",
  }),

  domain: domainSchema,
  website: websiteSchema,

  industry: Joi.string().trim().max(100).allow("").optional(),

  size: Joi.string()
    .valid(...COMPANY_SIZES)
    .optional()
    .messages({
      "any.only": `Size must be one of: ${COMPANY_SIZES.join(", ")}`,
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

  address: addressSchema.optional(),

  description: Joi.string().trim().max(2000).allow("").optional(),

  revenue: Joi.number().integer().min(0).optional(),

  owner: Joi.string().hex().length(24).optional().messages({
    "string.length": "Owner must be a valid MongoDB ObjectId",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

// ─── Search / Query Params ─────────────────────────────────────────────────────

const queryCompanySchema = Joi.object({
  search: Joi.string().trim().max(200).optional(),
  industry: Joi.string().trim().max(100).optional(),
  size: Joi.string()
    .valid(...COMPANY_SIZES)
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string()
    .valid("name", "createdAt", "updatedAt", "revenue")
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
  createCompanySchema,
  updateCompanySchema,
  queryCompanySchema,
  validate,
};