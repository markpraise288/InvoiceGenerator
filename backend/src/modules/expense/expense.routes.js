const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate");
const {
  createExpenseSchema,
  updateExpenseSchema,
  querySchema,
} = require("./expense.validation");
const {
  createExpenseHandler,
  getExpensesHandler,
  getExpenseByIdHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
  deleteExpensePermanentlyHandler,
  restoreExpenseHandler
} = require("./expense.controller");

// All routes require authentication
router.use(authMiddleware);

// ==============================
// 🔹 ROUTES
// ==============================
router.post("/", validate(createExpenseSchema), createExpenseHandler);
router.get("/", validate(querySchema), getExpensesHandler);
router.get("/:id", getExpenseByIdHandler);
router.put("/:id", validate(updateExpenseSchema), updateExpenseHandler);
router.delete("/:id", deleteExpenseHandler);
router.delete("/:id/permanent", deleteExpensePermanentlyHandler);
router.patch("/:id", restoreExpenseHandler);

module.exports = router;