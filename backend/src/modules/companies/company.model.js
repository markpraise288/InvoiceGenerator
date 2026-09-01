// modules/companies/company.model.js

const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 253,
    },
    industry: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    size: {
      type: String,
      enum: [
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1000+",
      ],
    },
    website: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
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
    // Revenue in USD cents to avoid float issues
    revenue: {
      type: Number,
      min: 0,
    },
    // The lead this company was converted from (if any)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    relatedTo: {
      type: String,
      enum: ["Lead", "Customer"],
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: contactCount ─────────────────────────────────────────────────────
// Populated on-demand via populate() or aggregation — not stored

companySchema.virtual("contacts", {
  ref: "Contact",
  localField: "_id",
  foreignField: "company",
  count: false,
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Text search on name and domain
companySchema.index({ name: "text", domain: "text" });

// Fast lookup by owner
companySchema.index({ owner: 1, createdAt: -1 });

// Domain uniqueness is soft — two companies can share a domain
// (e.g. subsidiaries) so we index but don't enforce unique
companySchema.index({ domain: 1 });

const Company = mongoose.model("Company", companySchema);

module.exports = Company;