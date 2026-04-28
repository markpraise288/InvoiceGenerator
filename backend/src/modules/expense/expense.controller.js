const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  deleteExpensePermanently,
  restoreExpense
} = require("./expense.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");

// ==============================
// 🔹 CONTROLLER HANDLERS
// ==============================

const createExpenseHandler = asyncHandler(async (req, res) => {
  const expense = await createExpense(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, "Expense created successfully", expense));
});

const getExpensesHandler = asyncHandler(async (req, res) => {
  const expenses = await getExpenses(req.user.id, req.query);
  res.json(new ApiResponse(200, "Expenses retrieved successfully", expenses));
});

const getExpenseByIdHandler = asyncHandler(async (req, res) => {
  const expense = await getExpenseById(req.params.id, req.user.id);
  res.json(new ApiResponse(200, "Expense retrieved successfully", expense));
});

const updateExpenseHandler = asyncHandler(async (req, res) => {
  const expense = await updateExpense(req.params.id, req.user.id, req.body);
  res.json(new ApiResponse(200, "Expense updated successfully", expense));
});

const deleteExpenseHandler = asyncHandler(async (req, res) => {
  const expense = await deleteExpense(req.params.id, req.user.id);
  res.json(new ApiResponse(200, "Expense deleted successfully", expense));
});

const deleteExpensePermanentlyHandler = asyncHandler(async (req, res) => {
  const result = await deleteExpensePermanently(req.params.id, req.user.id);
  res.json(new ApiResponse(200, result.message));
});

const restoreExpenseHandler = asyncHandler(async (req, res) => {
  const expense = await restoreExpense(req.params.id, req.user.id);
  res.json(new ApiResponse(200, "Expense restored successfully", expense));
});

module.exports = {
  createExpenseHandler,
  getExpensesHandler,
  getExpenseByIdHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
  deleteExpensePermanentlyHandler,
  restoreExpenseHandler
};