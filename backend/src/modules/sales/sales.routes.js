const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  createSale,
  getSales,
  getSalesSummary,
  getSaleById,
  updateSale,
  updateSaleStatus,
  deleteSale,
} = require("./sales.controller");

router.use(verifyToken);

router.route("/").post(createSale).get(getSales);

router.get("/summary", getSalesSummary);

router
  .route("/:id")
  .get(getSaleById)
  .put(updateSale)
  .delete(deleteSale);

router.patch("/:id/status", updateSaleStatus);

module.exports = router;