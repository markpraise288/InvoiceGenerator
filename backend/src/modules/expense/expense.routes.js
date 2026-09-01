const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  createExpense,
  getExpenses,
  getExpensesSummary,
  getExpenseById,
  updateExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  deleteExpense,
} = require("./expense.controller");

router.use(verifyToken);

router.route("/").post(createExpense).get(getExpenses);

router.get("/summary", getExpensesSummary);

router
  .route("/:id")
  .get(getExpenseById)
  .put(updateExpense)
  .delete(deleteExpense);

router.patch("/:id/approve", approveExpense);
router.patch("/:id/reject", rejectExpense);
router.patch("/:id/mark-paid", markExpensePaid);

module.exports = router;