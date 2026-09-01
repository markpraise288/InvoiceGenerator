const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const financeService = require("./finance.service");
const {
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsQuerySchema,
  profitLossQuerySchema,
  cashFlowQuerySchema,
  budgetVsActualQuerySchema,
} = require("./finance.validation");

// ---------- BUDGETS ----------

const createBudget = asyncHandler(async (req, res) => {
  const { error, value } = createBudgetSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const budget = await financeService.createBudget(value, req.user);
  return res.status(201).json(new ApiResponse(201, "Budget created successfully", budget));
});

const getBudgets = asyncHandler(async (req, res) => {
  const { error, value } = listBudgetsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await financeService.getBudgets(value, req.user);
  return res.status(200).json(new ApiResponse(200, "Budgets fetched successfully", result));
});

const updateBudget = asyncHandler(async (req, res) => {
  const { error, value } = updateBudgetSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const budget = await financeService.updateBudget(req.params.id, value);
  return res.status(200).json(new ApiResponse(200, "Budget updated successfully", budget));
});

const deleteBudget = asyncHandler(async (req, res) => {
  await financeService.deleteBudget(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Budget deleted successfully", null));
});

// ---------- REPORTS ----------

const getProfitAndLoss = asyncHandler(async (req, res) => {
  const { error, value } = profitLossQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const report = await financeService.getProfitAndLoss(value, req.user);
  return res.status(200).json(new ApiResponse(200, "P&L report fetched successfully", report));
});

const getCashFlow = asyncHandler(async (req, res) => {
  const { error, value } = cashFlowQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const report = await financeService.getCashFlow(value, req.user);
  return res.status(200).json(new ApiResponse(200, "Cash flow report fetched successfully", report));
});

const getBudgetVsActual = asyncHandler(async (req, res) => {
  const { error, value } = budgetVsActualQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await financeService.getBudgetVsActual(value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Budget vs. actual fetched successfully", result));
});

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getProfitAndLoss,
  getCashFlow,
  getBudgetVsActual,
};