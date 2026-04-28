const {
  getFinanceSummary,
  getMonthlyBreakdown,
  getExpenseBreakdown,
  getCashFlow,
} = require("./finance.service");

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");

// ==============================
// 🔹 FINANCE SUMMARY
// ==============================
const getFinanceSummaryHandler = asyncHandler(async (req, res) => {
  const data = await getFinanceSummary(req.user.id, req.query);

  res.json(
    new ApiResponse(200, "Finance summary retrieved successfully", data)
  );
});

// ==============================
// 🔹 FINANCE STATS (FOR DASHBOARD KPI)
// ==============================
const getFinanceStatsHandler = asyncHandler(async (req, res) => {
  const data = await getFinanceSummary(req.user.id, req.query);

  // return only lightweight data (faster for dashboard)
  const stats = {
    totalRevenue: data.totalRevenue,
    totalExpenses: data.totalExpenses,
    netProfit: data.netProfit,
    profitMargin: data.summary.profitMargin,
    trend: {
      value: data.summary.trend.value,
      percentage: data.summary.trend.percentage,
    }
  };

  res.json(
    new ApiResponse(200, "Finance stats retrieved successfully", stats)
  );
});

// ==============================
// 🔹 MONTHLY BREAKDOWN
// ==============================
const getMonthlyFinanceHandler = asyncHandler(async (req, res) => {
  const data = await getMonthlyBreakdown(req.user.id, req.query);

  res.json(
    new ApiResponse(200, "Monthly finance data retrieved successfully", data)
  );
});

// ==============================
// 🔹 EXPENSE BREAKDOWN
// ==============================
const getExpenseBreakdownHandler = asyncHandler(async (req, res) => {
  const data = await getExpenseBreakdown(req.user.id, req.query);

  res.json(
    new ApiResponse(200, "Expense breakdown retrieved successfully", data)
  );
});

// ==============================
// 🔹 CASH FLOW
// ==============================
const getCashFlowHandler = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // 🔥 prevent abuse

  const data = await getCashFlow(req.user.id, limit);

  res.json(
    new ApiResponse(200, "Cash flow retrieved successfully", {
      transactions: data,
    })
  );
});

module.exports = {
  getFinanceSummaryHandler,
  getFinanceStatsHandler,     // 🔥 NEW
  getMonthlyFinanceHandler,   // 🔥 NEW
  getExpenseBreakdownHandler,
  getCashFlowHandler,
};