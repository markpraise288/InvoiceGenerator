const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  recordManualPayment,
  getPayments,
  getPaymentById,
  getPaymentsByCustomer,
  updatePaymentStatus,
  getPaymentSummary,
} = require("./payment.controller");

router.use(verifyToken);

router.route("/").post(recordManualPayment).get(getPayments);

router.get("/summary", getPaymentSummary);
router.get("/customer/:customerId", getPaymentsByCustomer);

router.route("/:id").get(getPaymentById);
router.patch("/:id/status", updatePaymentStatus);

module.exports = router;