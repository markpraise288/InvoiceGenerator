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

const periodEnum = ["monthly", "quarterly", "yearly"];

const createBudgetSchema = Joi.object({
  category: Joi.string().valid(...categoryEnum).required(),
  limit: Joi.number().integer().min(1).required(), // cents
  period: Joi.string().valid(...periodEnum).optional(),
  periodStart: Joi.date().required(),
  periodEnd: Joi.date().greater(Joi.ref("periodStart")).required(),
  notes: Joi.string().trim().allow("").optional(),
});

const updateBudgetSchema = Joi.object({
  limit: Joi.number().integer().min(1).optional(),
  periodStart: Joi.date().optional(),
  periodEnd: Joi.date().optional(),
  notes: Joi.string().trim().allow("").optional(),
  // category intentionally excluded — changing category on an existing budget
  // is conceptually a new budget, not an edit; delete and recreate instead
})
  .min(1)
  .custom((value, helpers) => {
    if (value.periodStart && value.periodEnd && value.periodEnd <= value.periodStart) {
      return helpers.error("any.invalid", { message: "periodEnd must be after periodStart" });
    }
    return value;
  });

const listBudgetsQuerySchema = Joi.object({
  category: Joi.string().valid(...categoryEnum).optional(),
  period: Joi.string().valid(...periodEnum).optional(),
  activeOnly: Joi.boolean().optional(), // only budgets whose period covers today
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const profitLossQuerySchema = Joi.object({
  dateFrom: Joi.date().required(),
  dateTo: Joi.date().greater(Joi.ref("dateFrom")).required(),
  groupBy: Joi.string().valid("day", "week", "month").optional(),
});

const cashFlowQuerySchema = Joi.object({
  dateFrom: Joi.date().required(),
  dateTo: Joi.date().greater(Joi.ref("dateFrom")).required(),
  groupBy: Joi.string().valid("day", "week", "month").optional(),
});

const budgetVsActualQuerySchema = Joi.object({
  periodStart: Joi.date().optional(),
  periodEnd: Joi.date().optional(),
});

module.exports = {
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsQuerySchema,
  profitLossQuerySchema,
  cashFlowQuerySchema,
  budgetVsActualQuerySchema,
};