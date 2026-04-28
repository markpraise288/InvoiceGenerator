const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate");

const {
  summaryQuerySchema,
  breakdownQuerySchema,
  cashFlowQuerySchema,
} = require("./finance.validation");

const {
  getFinanceSummaryHandler,
  getFinanceStatsHandler,      // ✅ NEW
  getMonthlyFinanceHandler,    // ✅ NEW
  getExpenseBreakdownHandler,
  getCashFlowHandler,
} = require("./finance.controller");

// ==============================
// 🔐 AUTH
// ==============================
router.use(authMiddleware);

// ==============================
// 🔹 FINANCE ROUTES
// ==============================

// Full summary (heavy)
router.get(
  "/summary",
  validate(summaryQuerySchema),
  getFinanceSummaryHandler
);

// 🔥 Dashboard stats (lightweight)
router.get(
  "/stats",
  validate(summaryQuerySchema),
  getFinanceStatsHandler
);

// 🔥 Monthly analytics (charts)
router.get(
  "/monthly",
  validate(summaryQuerySchema),
  getMonthlyFinanceHandler
);

// Expense analytics
router.get(
  "/expense-breakdown",
  validate(breakdownQuerySchema),
  getExpenseBreakdownHandler
);

// Cash flow (recent transactions)
router.get(
  "/cash-flow",
  validate(cashFlowQuerySchema),
  getCashFlowHandler
);

module.exports = router;