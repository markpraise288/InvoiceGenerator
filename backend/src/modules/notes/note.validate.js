const Joi = require("joi");

const createNoteSchema = Joi.object({
  type: Joi.string()
    .valid("note", "call", "email", "meeting", "status_change", "task")
    .required()
    .messages({
      "any.only": "Invalid activity type",
      "string.empty": "Activity type is required",
      "any.required": "Activity type is required",
    }),

  title: Joi.string().max(200).required().messages({
    "string.empty": "Title is required",
    "string.max": "Title must not exceed 200 characters",
    "any.required": "Title is required",
  }),

  description: Joi.string().max(2000).optional().allow("").messages({
    "string.max": "Description must not exceed 2000 characters",
  }),
});

module.exports = {
  createNoteSchema,
};