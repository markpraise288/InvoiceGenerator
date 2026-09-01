// modules/files/file.model.js

const mongoose = require("mongoose");

// ─── Related entity types ───────────────────────────────────────────────────────
// Same polymorphic pattern as Calendar — one File model, attachable to
// any CRM record without a separate schema per entity.

const RELATED_TO_TYPES = [
  "Lead",
  "Contact",
  "Deal",
  "Task",
  "Company",
  "Invoice",
  "Customer",
  "Project",
];

const fileSchema = new mongoose.Schema(
  {
    // ─── Identity ────────────────────────────────────────────────────────────

    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    mimeType: {
      type: String,
      required: true,
    },

    // Bytes
    size: {
      type: Number,
      required: true,
      min: 0,
    },

    // Object key in cloud storage (e.g. "workspaces/:id/files/:randomId.pdf")
    // — never exposed directly to the frontend, only used server-side to
    // generate signed download URLs
    storageKey: {
      type: String,
      required: true,
    },

    storageProvider: {
      type: String,
      enum: ["s3", "r2", "spaces", "local"],
      default: "s3",
    },

    // ─── Organization ────────────────────────────────────────────────────────

    folder: {
      type: String,
      trim: true,
      default: null,
      maxlength: 200,
    },

    tags: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // ─── Polymorphic attachment ──────────────────────────────────────────────
    // Both nullable — a file can exist in the general library with no
    // record attached, or be scoped to exactly one CRM record.

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedTo",
      default: null,
      index: true,
    },

    relatedTo: {
      type: String,
      enum: RELATED_TO_TYPES,
      default: null,
    },

    // ─── Versioning (lightweight) ────────────────────────────────────────────

    version: {
      type: Number,
      default: 1,
    },

    previousVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },

    // ─── Access ──────────────────────────────────────────────────────────────

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ──────────────────────────────────────────────────────────────────

fileSchema.virtual("extension").get(function () {
  const parts = this.originalName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
});

fileSchema.virtual("sizeFormatted").get(function () {
  const bytes = this.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

fileSchema.index({ workspaceId: 1, isDeleted: 1, createdAt: -1 });
fileSchema.index({ relatedTo: 1, relatedId: 1, createdAt: -1 });
fileSchema.index({ workspaceId: 1, folder: 1 });

const File = mongoose.model("File", fileSchema);

module.exports = { File, RELATED_TO_TYPES };