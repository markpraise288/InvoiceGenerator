const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const expenseService = require("./expense.service");
const {
  createExpenseSchema,
  updateExpenseSchema,
  rejectExpenseSchema,
  markExpensePaidSchema,
  listExpensesQuerySchema,
} = require("./expense.validation");

const createExpense = asyncHandler(async (req, res) => {
  const { error, value } = createExpenseSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const expense = await expenseService.createExpense(value, req.user);
  return res.status(201).json(new ApiResponse(201, "Expense submitted successfully", expense));
});

const getExpenses = asyncHandler(async (req, res) => {
  const { error, value } = listExpensesQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await expenseService.getExpenses(value, req.user);
  return res.status(200).json(new ApiResponse(200, "Expenses fetched successfully", result));
});

const getExpensesSummary = asyncHandler(async (req, res) => {
  const summary = await expenseService.getExpensesSummary(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Expenses summary fetched successfully", summary));
});

const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Expense fetched successfully", expense));
});

const updateExpense = asyncHandler(async (req, res) => {
  const { error, value } = updateExpenseSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const expense = await expenseService.updateExpense(req.params.id, value);
  return res.status(200).json(new ApiResponse(200, "Expense updated successfully", expense));
});

const approveExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.approveExpense(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, "Expense approved successfully", expense));
});

const rejectExpense = asyncHandler(async (req, res) => {
  const { error, value } = rejectExpenseSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const expense = await expenseService.rejectExpense(
    req.params.id,
    value.rejectionReason,
    req.user.id
  );
  return res.status(200).json(new ApiResponse(200, "Expense rejected", expense));
});

const markExpensePaid = asyncHandler(async (req, res) => {
  const { error, value } = markExpensePaidSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const expense = await expenseService.markExpensePaid(req.params.id, value.paidAt);
  return res.status(200).json(new ApiResponse(200, "Expense marked as paid", expense));
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Expense deleted successfully", null));
});

module.exports = {
  createExpense,
  getExpenses,
  getExpensesSummary,
  getExpenseById,
  updateExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  deleteExpense,
};