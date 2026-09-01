const mongoose = require("mongoose");
const { Schema } = mongoose;

const budgetSchema = new Schema(
  {
    category: {
      type: String,
      enum: [
        "office_supplies",
        "software",
        "travel",
        "meals",
        "marketing",
        "payroll",
        "rent",
        "utilities",
        "professional_services",
        "equipment",
        "other",
      ],
      required: true,
      // matches Expense.category exactly — see note below on why this isn't a shared enum file
    },
    limit: {
      type: Number,
      required: true,
      min: 0,
      // cents — the spending ceiling for this category, per period
    },
    period: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    periodStart: {
      type: Date,
      required: true,
      // the start date this budget applies from (e.g. first of the month)
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ category: 1, periodStart: -1 });
budgetSchema.index({ periodStart: 1, periodEnd: 1 });

// Prevent two budgets from being created for the same category with
// overlapping periods — a real constraint, though only enforceable at the
// application layer (see the note in finance.service.js on why this index
// alone isn't sufficient for true overlap prevention).
budgetSchema.index({ category: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);