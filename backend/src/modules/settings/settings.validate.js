// modules/settings/settings.validate.js

const Joi = require("joi");

// ─── Workspace Settings ────────────────────────────────────────────────────────

const updateWorkspaceSchema = Joi.object({
  workspace: Joi.object({
    name: Joi.string().trim().max(200).optional().messages({
      "string.max": "Workspace name must be 200 characters or fewer",
    }),

    logo: Joi.string()
      .trim()
      .max(500)
      .uri({ scheme: ["http", "https"] })
      .allow("")
      .optional()
      .messages({
        "string.uri": "Logo must be a valid URL",
      }),

    website: Joi.string()
      .trim()
      .max(500)
      .uri({ scheme: ["http", "https"] })
      .allow("")
      .optional()
      .messages({
        "string.uri": "Website must be a valid URL",
      }),

    industry: Joi.string().trim().max(100).allow("").optional(),

    size: Joi.string()
      .valid("1-10", "11-50", "51-200", "201-500", "501-1000", "1000+")
      .optional()
      .messages({
        "any.only": "Invalid company size",
      }),

    timezone: Joi.string().trim().max(100).optional().messages({
      "string.max": "Timezone must be 100 characters or fewer",
    }),

    currency: Joi.string()
      .trim()
      .uppercase()
      .length(3)
      .optional()
      .messages({
        "string.length": "Currency must be a 3-letter ISO code e.g. USD",
      }),

    dateFormat: Joi.string()
      .valid("MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD")
      .optional()
      .messages({
        "any.only": "Date format must be MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD",
      }),

    fiscalYearStart: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .optional()
      .messages({
        "number.min": "Fiscal year start must be a month between 1 and 12",
        "number.max": "Fiscal year start must be a month between 1 and 12",
      }),
  })
    .min(1)
    .required()
    .messages({
      "object.min": "At least one workspace field must be provided",
    }),
});

// ─── Notification Settings ─────────────────────────────────────────────────────

const updateNotificationsSchema = Joi.object({
  notifications: Joi.object({
    emailOnLeadAssigned: Joi.boolean().optional(),
    emailOnDealWon: Joi.boolean().optional(),
    emailOnDealLost: Joi.boolean().optional(),
    emailOnTaskDue: Joi.boolean().optional(),
    emailOnTaskOverdue: Joi.boolean().optional(),
    emailOnMentioned: Joi.boolean().optional(),
    emailDigest: Joi.string()
      .valid("never", "daily", "weekly")
      .optional()
      .messages({
        "any.only": "Email digest must be never, daily, or weekly",
      }),
  })
    .min(1)
    .required()
    .messages({
      "object.min": "At least one notification setting must be provided",
    }),
});

// ─── Feature Flags ─────────────────────────────────────────────────────────────

const updateFeaturesSchema = Joi.object({
  features: Joi.object({
    dealsEnabled: Joi.boolean().optional(),
    reportsEnabled: Joi.boolean().optional(),
    tasksEnabled: Joi.boolean().optional(),
  })
    .min(1)
    .required()
    .messages({
      "object.min": "At least one feature flag must be provided",
    }),
});

// ─── Profile Update ────────────────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().max(200).optional().messages({
    "string.max": "Name must be 200 characters or fewer",
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

  avatar: Joi.string()
    .trim()
    .max(500)
    .uri({ scheme: ["http", "https"] })
    .allow("")
    .optional()
    .messages({
      "string.uri": "Avatar must be a valid URL",
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

  timezone: Joi.string().trim().max(100).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided",
});

// ─── Password Change ───────────────────────────────────────────────────────────

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required",
    "any.required": "Current password is required",
  }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "strong password"
    )
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters",
      "string.max": "New password must be 128 characters or fewer",
      "string.pattern.name":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      "any.required": "New password is required",
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

// ─── Team Invite ───────────────────────────────────────────────────────────────

const inviteMemberSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      "string.email": "Must be a valid email address",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),

  role: Joi.string()
    .valid("admin", "member", "viewer")
    .default("member")
    .messages({
      "any.only": "Role must be admin, member, or viewer",
    }),

  name: Joi.string().trim().max(200).optional().messages({
    "string.max": "Name must be 200 characters or fewer",
  }),
});

// ─── Update Member Role ────────────────────────────────────────────────────────

const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid("admin", "member", "viewer")
    .required()
    .messages({
      "any.only": "Role must be admin, member, or viewer",
      "any.required": "Role is required",
    }),
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
  updateWorkspaceSchema,
  updateNotificationsSchema,
  updateFeaturesSchema,
  updateProfileSchema,
  changePasswordSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  validate,
};