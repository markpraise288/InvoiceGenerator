const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const categoryEnum = [
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
];

const statusEnum = ["pending", "approved", "rejected", "paid"];
const intervalEnum = ["weekly", "monthly", "yearly"];

const createExpenseSchema = Joi.object({
  description: Joi.string().trim().min(1).max(300).required(),
  category: Joi.string().valid(...categoryEnum).optional(),
  vendor: Joi.string().trim().allow("").optional(),
  amount: Joi.number().integer().min(1).required(), // cents
  currency: Joi.string().trim().length(3).uppercase().optional(),
  expenseDate: Joi.date().optional(),
  isRecurring: Joi.boolean().optional(),
  recurringInterval: Joi.string()
    .valid(...intervalEnum)
    .when("isRecurring", { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }),
  receiptUrl: Joi.string().uri().allow("").optional(),
  notes: Joi.string().trim().allow("").optional(),
});

const updateExpenseSchema = Joi.object({
  description: Joi.string().trim().min(1).max(300).optional(),
  category: Joi.string().valid(...categoryEnum).optional(),
  vendor: Joi.string().trim().allow("").optional(),
  amount: Joi.number().integer().min(1).optional(),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  expenseDate: Joi.date().optional(),
  isRecurring: Joi.boolean().optional(),
  recurringInterval: Joi.string().valid(...intervalEnum).optional().allow(null),
  receiptUrl: Joi.string().uri().allow("").optional(),
  notes: Joi.string().trim().allow("").optional(),
  // status intentionally excluded — dedicated approve/reject/mark-paid endpoints
}).min(1);

const approveExpenseSchema = Joi.object({
  // no body needed — approver is derived from req.user, but kept as an object
  // in case you want to add e.g. an optional approval note later
});

const rejectExpenseSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(1).max(500).required(),
});

const markExpensePaidSchema = Joi.object({
  paidAt: Joi.date().optional(),
});

const listExpensesQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  category: Joi.string().valid(...categoryEnum).optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  isRecurring: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("expenseDate", "createdAt", "amount").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  markExpensePaidSchema,
  listExpensesQuerySchema,
};