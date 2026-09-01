// modules/files/file.validate.js

const Joi = require("joi");
const { RELATED_TO_TYPES } = require("./file.model");

// ─── Allowed upload types ───────────────────────────────────────────────────────
// Whitelist approach — safer than a blocklist. Add MIME types here as new
// use cases arise (e.g. audio for voice notes) rather than trying to block
// every dangerous type individually.

const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",

  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",

  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",

  // Other common business files
  "application/json",
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// ─── Upload metadata (accompanies multipart file) ──────────────────────────────

const uploadFileSchema = Joi.object({
  folder: Joi.string().trim().max(200).allow("", null).optional(),

  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(50)).max(20),
      Joi.string().trim().max(50) // single tag sent as plain string via form-data
    )
    .optional(),

  description: Joi.string().trim().max(1000).allow("", null).optional(),

  relatedId: Joi.string().hex().length(24).allow(null, "").optional().messages({
    "string.length": "Related record ID must be a valid MongoDB ObjectId",
  }),

  relatedTo: Joi.string()
    .valid(...RELATED_TO_TYPES)
    .allow(null, "")
    .optional()
    .messages({
      "any.only": `Related type must be one of: ${RELATED_TO_TYPES.join(", ")}`,
    }),
})
  .and("relatedId", "relatedTo")
  .messages({
    "object.and":
      "Both relatedId and relatedTo must be provided together, or neither",
  });

// ─── Update metadata ────────────────────────────────────────────────────────────

const updateFileSchema = Joi.object({
  originalName: Joi.string().trim().max(300).optional(),
  folder: Joi.string().trim().max(200).allow("", null).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  description: Joi.string().trim().max(1000).allow("", null).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

// ─── Attach to record ───────────────────────────────────────────────────────────

const attachFileSchema = Joi.object({
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
});

// ─── Query / filter params ───────────────────────────────────────────────────────

const queryFilesSchema = Joi.object({
  search: Joi.string().trim().max(200).optional(),
  folder: Joi.string().trim().max(200).optional(),
  relatedTo: Joi.string()
    .valid(...RELATED_TO_TYPES)
    .optional(),
  relatedId: Joi.string().hex().length(24).optional(),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(40),
});

// ─── Multer file filter (runs before Joi, at the multipart layer) ─────────────
// This checks the actual uploaded file's mimetype/size — separate from the
// Joi schemas above, which only validate the accompanying text fields.

const multerFileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(
        `File type "${file.mimetype}" is not allowed. Allowed types: documents, images, archives.`
      ),
      false
    );
  }
  cb(null, true);
};

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
  uploadFileSchema,
  updateFileSchema,
  attachFileSchema,
  queryFilesSchema,
  multerFileFilter,
  validate,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};