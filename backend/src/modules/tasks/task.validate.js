// modules/tasks/task.validate.js

const Joi = require("joi");

const PRIORITIES = ["low", "medium", "high", "urgent"];
const RELATEDTO = ["Customer", "Lead", "Deal", "Project", "Company", "Contact"];

// ─── Create Task ───────────────────────────────────────────────────────────────

const createTaskSchema = Joi.object({
  title: Joi.string().trim().max(300).required().messages({
    "string.empty": "Task title is required",
    "string.max": "Title must be 300 characters or fewer",
    "any.required": "Task title is required",
  }),

  description: Joi.string().trim().max(2000).optional().messages({
    "string.max": "Description must be 2000 characters or fewer",
  }),

  relatedTo: Joi.string().valid(...RELATEDTO).required(),
  relatedId: Joi.string().required(),

  assignedTo: Joi.string().hex().length(24).required().messages({
    "string.empty": "Assigned user is required",
    "string.length": "assignedTo must be a valid MongoDB ObjectId",
    "any.required": "Assigned user is required",
  }),

  dueDate: Joi.date().iso().greater("now").required().messages({
    "date.base": "Due date must be a valid date",
    "date.format": "Due date must be ISO format",
    "date.greater": "Due date must be in the future",
    "any.required": "Due date is required",
  }),

  priority: Joi.string()
    .valid(...PRIORITIES)
    .default("medium")
    .messages({
      "any.only": `Priority must be one of: ${PRIORITIES.join(", ")}`,
    }),
});

// ─── Update Task ───────────────────────────────────────────────────────────────

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().max(300).optional().messages({
    "string.max": "Title must be 300 characters or fewer",
  }),

  description: Joi.string().trim().max(2000).allow("").optional().messages({
    "string.max": "Description must be 2000 characters or fewer",
  }),

  assignedTo: Joi.string().hex().length(24).optional().messages({
    "string.length": "assignedTo must be a valid MongoDB ObjectId",
  }),

  dueDate: Joi.date().iso().optional().messages({
    "date.base": "Due date must be a valid date",
    "date.format": "Due date must be ISO format",
  }),

  priority: Joi.string()
    .valid(...PRIORITIES)
    .optional()
    .messages({
      "any.only": `Priority must be one of: ${PRIORITIES.join(", ")}`,
    }),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

// ─── Complete Task ─────────────────────────────────────────────────────────────
// Separate schema — completing a task is a distinct action not mixed with updates

const completeTaskSchema = Joi.object({
  completed: Joi.boolean().required().messages({
    "boolean.base": "completed must be a boolean",
    "any.required": "completed is required",
  }),
});

// ─── Validator Middleware Factory ──────────────────────────────────────────────

const validate = (schema) => (req, res, next) => {
  console.log(req.body)
  const { error, value } = schema.validate(req.body, {
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

  req.body = value;
  next();
};

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  validate,
};