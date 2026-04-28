const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate");
const {
  createSaleSchema,
  updateSaleSchema,
  querySchema,
} = require("./sales.validation");
const {
  createSaleHandler,
  getSalesHandler,
  getSaleByIdHandler,
  updateSaleHandler,
  deleteSaleHandler,
  deleteSalePermanentlyHandler,
  restoreSaleHandler
} = require("./sales.controller");

// All routes require authentication
router.use(authMiddleware);

// ==============================
// 🔹 ROUTES
// ==============================
router.post("/", validate(createSaleSchema), createSaleHandler);
router.get("/", validate(querySchema), getSalesHandler);
router.get("/:id", getSaleByIdHandler);
router.put("/:id", validate(updateSaleSchema), updateSaleHandler);
router.delete("/:id", deleteSaleHandler);
router.delete("/:id/permanent", deleteSalePermanentlyHandler);
router.patch("/:id", restoreSaleHandler);

module.exports = router;