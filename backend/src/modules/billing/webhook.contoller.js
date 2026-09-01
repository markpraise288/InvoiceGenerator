const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const {
  handlePaymentSaleCompleted,
  handlePaymentSaleDenied,
  handleSubscriptionCancelled,
} = require("./billing.service");

// POST /webhooks/paypal
const handlePayPalWebhook = asyncHandler(async (req, res) => {
  const event = req.body;

  console.log("PayPal webhook received:", event.event_type);

  // TODO: verify webhook signature before trusting the payload —
  // https://developer.paypal.com/api/rest/webhooks/rest/#link-verifywebhooksignature

  try {
    switch (event.event_type) {
      // Recurring charge on a billing agreement succeeded — this is the
      // reliable one for the classic Billing Agreements API
      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentSaleCompleted(event);
        break;

      // Recurring charge failed or was denied
      case "PAYMENT.SALE.DENIED":
      case "PAYMENT.SALE.REVERSED":
        await handlePaymentSaleDenied(event);
        break;

      // ⚠️ Verify this actually fires for your agreements in PayPal's
      // webhook simulator — classic Billing Agreements lifecycle events
      // are less consistently documented than PAYMENT.SALE.*
      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(event);
        break;

      default:
        console.log("Unhandled webhook event:", event.event_type);
    }

    res.status(200).json(new ApiResponse(true, "Webhook processed"));
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still 200 so PayPal doesn't retry indefinitely on our bug
    res.status(200).json(new ApiResponse(true, "Webhook acknowledged"));
  }
});

module.exports = { handlePayPalWebhook };