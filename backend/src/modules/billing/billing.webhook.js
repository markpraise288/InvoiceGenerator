const billingService = require("./billing.service");

/**
 * 🔔 Handle PayPal Webhooks
 */
const handlePaypalWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (!event || !event.event_type) {
      console.error("❌ Invalid webhook payload");
      return res.status(400).json({ success: false, message: "Invalid webhook payload" });
    }

    console.log("🔔 PayPal Webhook Received:", event.event_type);

    const resource = event.resource;

    switch (event.event_type) {
      /**
       * ✅ Subscription Activated
       */
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        if (billingService.handleSubscriptionActivated) {
          await billingService.handleSubscriptionActivated(resource);
        }
        break;

      /**
       * ❌ Subscription Cancelled
       */
      case "BILLING.SUBSCRIPTION.CANCELLED":
        if (billingService.handleSubscriptionCancelled) {
          await billingService.handleSubscriptionCancelled(resource);
        }
        break;

      /**
       * 🔄 Subscription Updated
       */
      case "BILLING.SUBSCRIPTION.UPDATED":
        if (billingService.handleSubscriptionUpdated) {
          await billingService.handleSubscriptionUpdated(resource);
        }
        break;

      /**
       * 💸 Payment Completed (Recurring)
       */
      case "PAYMENT.SALE.COMPLETED":
      case "PAYMENT.CAPTURE.COMPLETED":
        if (billingService.handlePaymentCompleted) {
          await billingService.handlePaymentCompleted(resource);
        }
        break;

      /**
       * ⚠️ Payment Failed
       */
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        if (billingService.handlePaymentFailed) {
          await billingService.handlePaymentFailed(resource);
        }
        break;

      /**
       * 🛑 Subscription Suspended
       */
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        if (billingService.handleSubscriptionSuspended) {
          await billingService.handleSubscriptionSuspended(resource);
        }
        break;

      default:
        console.warn("⚠️ Unhandled PayPal event:", event.event_type);
    }

    // ✅ Always return 200 to PayPal
    return res.status(200).json({ success: true, received: true });
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);

    // ⚠️ Still return 200 to prevent PayPal retries flooding your server
    return res.status(200).json({
      success: false,
      message: "Webhook processed with errors",
    });
  }
};

module.exports = {
  handlePaypalWebhook,
};