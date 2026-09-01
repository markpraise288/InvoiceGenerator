// modules/contacts/contact.model.js

const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    position: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedTo",
      index: true,
      required: true
    },
    relatedTo: {
      type: String,
      enum: ["Customer", "Company", "Lead"],
      required: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    // Social links
    social: {
      linkedin: { type: String, trim: true, maxlength: 500 },
      twitter: { type: String, trim: true, maxlength: 500 },
    },
    // Contact lifecycle stage
    stage: {
      type: String,
      enum: [
        "subscriber",
        "lead",
        "opportunity",
        "customer",
        "evangelist",
        "other",
      ],
      default: "lead",
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zip: { type: String, trim: true },
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    // Last time this contact was contacted
    lastContactedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Virtual: fullAddress ──────────────────────────────────────────────────────

contactSchema.virtual("fullAddress").get(function () {
  const a = this.address;
  if (!a) return null;
  return [a.street, a.city, a.state, a.country, a.zip]
    .filter(Boolean)
    .join(", ");
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Text search on name and email
contactSchema.index({ name: "text", email: "text" });

// Fast lookup: all contacts for a company
contactSchema.index({ relatedId: 1, createdAt: -1 });

// Fast lookup: all contacts owned by a user
contactSchema.index({ owner: 1, createdAt: -1 });

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
