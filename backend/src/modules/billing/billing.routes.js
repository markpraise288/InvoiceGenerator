const express = require("express");
const router = express.Router();

const billingController = require("./billing.controller");
const webhookController = require("./billing.webhook");
const authMiddleware = require("../../middlewares/auth.middleware"); // ✅ enable auth

/**
 * 🔔 PayPal Webhook (NO auth)
 */
router.post("/webhook", webhookController.handlePaypalWebhook);

/**
 * ===============================
 * 💳 ONE-TIME PAYMENTS
 * ===============================
 */

/**
 * Create PayPal Order
 */
router.post(
  "/create-order",
  authMiddleware,
  billingController.createOrderController
);

/**
 * Capture Payment after approval
 */
router.post(
  "/capture-order",
  authMiddleware,
  billingController.captureOrderController
);

/**
 * ===============================
 * 🔁 SUBSCRIPTIONS (RECURRING)
 * ===============================
 */

/**
 * Create Subscription
 */
router.post(
  "/create-subscription",
  authMiddleware,
  billingController.createSubscriptionController // ✅ FIXED
);

/**
 * Activate Subscription (after PayPal redirect)
 */
router.post(
  "/activate-subscription",
  authMiddleware,
  billingController.activateSubscriptionController
);

/**
 * Verify Subscription (optional/manual)
 */
router.post(
  "/verify-subscription",
  authMiddleware,
  billingController.verifySubscriptionController
);

/**
 * Cancel Subscription
 */
router.post(
  "/cancel-subscription",
  authMiddleware,
  billingController.cancelSubscriptionController // ✅ FIXED
);

module.exports = router;