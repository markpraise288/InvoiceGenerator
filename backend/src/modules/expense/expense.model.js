const mongoose = require("mongoose");
const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
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
      default: "other",
      index: true,
    },
    vendor: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      // cents
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
      index: true,
    },
    expenseDate: {
      type: Date,
      default: Date.now,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringInterval: {
      type: String,
      enum: ["weekly", "monthly", "yearly", null],
      default: null,
      // only meaningful when isRecurring is true
    },
    receiptUrl: {
      type: String,
      default: null,
      // reference to an uploaded receipt file, if you have file storage wired up
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ category: 1, status: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ status: 1, submittedBy: 1 });
expenseSchema.index({ isRecurring: 1 });

module.exports = mongoose.model("Expense", expenseSchema);