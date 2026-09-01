// modules/calendar/calendar.validate.js

const Joi = require("joi");
const { EVENT_TYPES, RECURRENCE_FREQUENCIES } = require("./calendar.model");

// ─── Reusable sub-schemas ──────────────────────────────────────────────────────

const attendeeSchema = Joi.object({
  user: Joi.string().hex().length(24).optional().messages({
    "string.length": "Attendee user must be a valid MongoDB ObjectId",
  }),
  email: Joi.string().trim().lowercase().email().optional().messages({
    "string.email": "Attendee email must be a valid email address",
  }),
  name: Joi.string().trim().max(200).optional(),
  status: Joi.string()
    .valid("pending", "accepted", "declined", "tentative")
    .default("pending"),
})
  .or("user", "email")
  .messages({
    "object.missing": "Each attendee must have either a user ID or an email",
  });

const recurrenceSchema = Joi.object({
  frequency: Joi.string()
    .valid(...RECURRENCE_FREQUENCIES)
    .required()
    .messages({
      "any.only": `Frequency must be one of: ${RECURRENCE_FREQUENCIES.join(", ")}`,
      "any.required": "Recurrence frequency is required",
    }),

  interval: Joi.number().integer().min(1).max(365).default(1).messages({
    "number.min": "Interval must be at least 1",
    "number.max": "Interval cannot exceed 365",
  }),

  daysOfWeek: Joi.array()
    .items(Joi.number().integer().min(0).max(6))
    .optional()
    .messages({
      "number.min": "Day of week must be between 0 (Sun) and 6 (Sat)",
      "number.max": "Day of week must be between 0 (Sun) and 6 (Sat)",
    }),

  endDate: Joi.date().iso().optional().messages({
    "date.format": "Recurrence end date must be a valid ISO date",
  }),

  occurrences: Joi.number().integer().min(1).max(365).optional().messages({
    "number.min": "Occurrences must be at least 1",
    "number.max": "Occurrences cannot exceed 365",
  }),
})
  .oxor("endDate", "occurrences")
  .messages({
    "object.oxor":
      "Provide either an end date or a number of occurrences, not both",
  });

const reminderSchema = Joi.object({
  method: Joi.string()
    .valid("email", "notification")
    .default("notification")
    .messages({
      "any.only": "Reminder method must be email or notification",
    }),
  minutesBefore: Joi.number()
    .integer()
    .min(0)
    .max(10080) // max 1 week
    .default(15)
    .messages({
      "number.min": "Minutes before cannot be negative",
      "number.max": "Reminder cannot be set more than 1 week in advance",
    }),
});

// ─── Create Event ──────────────────────────────────────────────────────────────

const createEventSchema = Joi.object({
  title: Joi.string().trim().max(300).required().messages({
    "string.empty": "Event title is required",
    "string.max": "Title must be 300 characters or fewer",
    "any.required": "Event title is required",
  }),

  description: Joi.string().trim().max(2000).optional().messages({
    "string.max": "Description must be 2000 characters or fewer",
  }),

  type: Joi.string()
    .valid(...EVENT_TYPES)
    .default("meeting")
    .messages({
      "any.only": `Type must be one of: ${EVENT_TYPES.join(", ")}`,
    }),

  startAt: Joi.date().iso().required().messages({
    "date.base": "Start date must be a valid date",
    "date.format": "Start date must be in ISO format",
    "any.required": "Start date is required",
  }),

  endAt: Joi.date().iso().greater(Joi.ref("startAt")).required().messages({
    "date.base": "End date must be a valid date",
    "date.format": "End date must be in ISO format",
    "date.greater": "End date must be after start date",
    "any.required": "End date is required",
  }),

  allDay: Joi.boolean().default(false),

  timezone: Joi.string().trim().max(100).default("UTC"),

  location: Joi.string().trim().max(500).optional().messages({
    "string.max": "Location must be 500 characters or fewer",
  }),

  meetingUrl: Joi.string()
    .trim()
    .max(500)
    .uri({ scheme: ["http", "https"] })
    .optional()
    .messages({
      "string.uri": "Meeting URL must be a valid http or https URL",
      "string.max": "Meeting URL must be 500 characters or fewer",
    }),

  relatedId: Joi.string().hex().length(24).optional().messages({
    "string.length": "Related ID must be a valid MongoDB ObjectId",
  }),

  relatedTo: Joi.string()
    .valid("Lead", "Contact", "Deal", "Company", "Task", "Invoice", "Customer", "Project")
    .optional()
    .messages({
      "any.only": "RelatedTo must be one of: Lead, Contact, Deal, Company, Task, Invoice, Customer, Project",
    }),

  attendees: Joi.array()
    .items(attendeeSchema)
    .max(50)
    .optional()
    .messages({
      "array.max": "You can add up to 50 attendees",
    }),

  recurrence: recurrenceSchema.optional(),

  reminders: Joi.array()
    .items(reminderSchema)
    .max(5)
    .default([{ method: "notification", minutesBefore: 15 }])
    .messages({
      "array.max": "You can set up to 5 reminders per event",
    }),

  color: Joi.string()
    .trim()
    .pattern(/^#[0-9A-Fa-f]{6}$/, "hex color")
    .default("#60a5fa")
    .messages({
      "string.pattern.name": "Color must be a valid hex color e.g. #60a5fa",
    }),

  status: Joi.string()
    .valid("scheduled", "completed", "cancelled")
    .default("scheduled")
    .messages({
      "any.only": "Status must be scheduled, completed, or cancelled",
    }),

  owner: Joi.string().hex().length(24).optional().messages({
    "string.length": "Owner must be a valid MongoDB ObjectId",
  }),
});

// ─── Update Event ──────────────────────────────────────────────────────────────

const updateEventSchema = Joi.object({
  title: Joi.string().trim().max(300).optional(),

  description: Joi.string().trim().max(2000).allow("").optional(),

  type: Joi.string()
    .valid(...EVENT_TYPES)
    .optional(),

  startAt: Joi.date().iso().optional(),

  endAt: Joi.date().iso().optional(),

  allDay: Joi.boolean().optional(),

  timezone: Joi.string().trim().max(100).optional(),

  location: Joi.string().trim().max(500).allow("").optional(),

  meetingUrl: Joi.string()
    .trim()
    .max(500)
    .uri({ scheme: ["http", "https"] })
    .allow("")
    .optional(),

  lead: Joi.string().hex().length(24).allow(null).optional(),
  contact: Joi.string().hex().length(24).allow(null).optional(),
  deal: Joi.string().hex().length(24).allow(null).optional(),

  attendees: Joi.array().items(attendeeSchema).max(50).optional(),

  recurrence: recurrenceSchema.optional(),

  reminders: Joi.array().items(reminderSchema).max(5).optional(),

  color: Joi.string()
    .trim()
    .pattern(/^#[0-9A-Fa-f]{6}$/, "hex color")
    .optional()
    .messages({
      "string.pattern.name": "Color must be a valid hex color e.g. #60a5fa",
    }),

  status: Joi.string()
    .valid("scheduled", "completed", "cancelled")
    .optional(),

  owner: Joi.string().hex().length(24).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

// ─── Query / Filter Params ─────────────────────────────────────────────────────

const queryEventSchema = Joi.object({
  from: Joi.date().iso().optional().messages({
    "date.format": "From date must be a valid ISO date",
  }),

  to: Joi.date().iso().optional().messages({
    "date.format": "To date must be a valid ISO date",
  }),

  type: Joi.string()
    .valid(...EVENT_TYPES)
    .optional(),

  status: Joi.string()
    .valid("scheduled", "completed", "cancelled")
    .optional(),

  lead: Joi.string().hex().length(24).optional(),
  contact: Joi.string().hex().length(24).optional(),
  deal: Joi.string().hex().length(24).optional(),
  owner: Joi.string().hex().length(24).optional(),

  search: Joi.string().trim().max(200).optional(),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

// ─── Update Attendee Status ────────────────────────────────────────────────────

const updateAttendeeStatusSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "accepted", "declined", "tentative")
    .required()
    .messages({
      "any.only":
        "Status must be pending, accepted, declined, or tentative",
      "any.required": "Status is required",
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
  createEventSchema,
  updateEventSchema,
  queryEventSchema,
  updateAttendeeStatusSchema,
  validate,
};