const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getProfitAndLoss,
  getCashFlow,
  getBudgetVsActual,
} = require("./finance.controller");

router.use(verifyToken);

// ---------- BUDGETS ----------
router.route("/budgets").post(createBudget).get(getBudgets);
router.route("/budgets/:id").put(updateBudget).delete(deleteBudget);

// ---------- REPORTS ----------
router.get("/profit-loss", getProfitAndLoss);
router.get("/cash-flow", getCashFlow);
router.get("/budget-vs-actual", getBudgetVsActual);

module.exports = router;