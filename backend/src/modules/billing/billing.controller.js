const billingService = require("./billing.service");

/**
 * 💳 Create One-Time Payment Order
 */
const createOrderController = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const order = await billingService.createPaypalOrder(amount);

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error("❌ Create Order Error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create order",
    });
  }
};

/**
 * 💰 Capture One-Time Payment
 */
const captureOrderController = async (req, res) => {
  try {
    const { orderId, planId } = req.body;
    const userId = req.user?.id;

    if (!orderId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Plan ID are required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await billingService.capturePaypalOrder(
      orderId,
      userId,
      planId
    );

    return res.status(200).json({
      success: true,
      message: "Payment captured successfully",
      data: result,
    });
  } catch (err) {
    console.error("❌ Capture Order Error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to capture payment",
    });
  }
};

/**
 * 🔁 Create Subscription (Recurring)
 */
const createSubscriptionController = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!billingService.PLAN_PRICING[planId] || !planId) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected",
      });
    }

    const subscription =
      await billingService.createPaypalSubscription(planId);

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (err) {
    console.error("❌ Create Subscription Error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create subscription",
    });
  }
};

/**
 * 🔁 Activate Subscription (after PayPal approval)
 */
const activateSubscriptionController = async (req, res) => {
  try {
    const { subscriptionId, planId } = req.body;
    const userId = req.user?.id;

    if (!subscriptionId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID and Plan ID are required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await billingService.activateUserSubscription(
      userId,
      subscriptionId,
      planId
    );

    return res.status(200).json({
      success: true,
      message: "Subscription activated successfully",
      data: result,
    });
  } catch (err) {
    console.error("❌ Activate Subscription Error:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * 🔍 Verify Subscription Status
 */
const verifySubscriptionController = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID is required",
      });
    }

    const subscription =
      await billingService.verifySubscription(subscriptionId);

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (err) {
    console.error("❌ Verify Subscription Error:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ❌ Cancel Subscription
 */
const cancelSubscriptionController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 🔥 Update user locally (you can also call PayPal cancel API later)
    const updatedUser = await require("../users/user.model").findByIdAndUpdate(
      userId,
      {
        plan: "free",
        subscriptionStatus: "cancelled",
        subscriptionId: null,
        nextBillingDate: null,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("❌ Cancel Subscription Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
    });
  }
};

module.exports = {
  createOrderController,
  captureOrderController,
  createSubscriptionController,
  activateSubscriptionController,
  verifySubscriptionController,
  cancelSubscriptionController,
};