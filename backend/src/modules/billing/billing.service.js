const axios = require("axios");
const User = require("../users/user.model");

const BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

// 🔥 PLAN CONFIG
const PLAN_PRICING = {
  PRO_PLAN: {
    price: 9,
    name: "pro",
    paypalPlanId: process.env.PAYPAL_PRO_PLAN_ID,
  },
  BUSINESS_PLAN: {
    price: 19,
    name: "business",
    paypalPlanId: process.env.PAYPAL_BUSINESS_PLAN_ID,
  },
};

/**
 * 🔐 Get PayPal Access Token
 */
const getAccessToken = async () => {
  try {
    const res = await axios.post(
      `${BASE_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("✅ PayPal Access Token Retrieved");
    return res.data.access_token;
  } catch (err) {
    console.error("❌ PayPal Token Error:", err.response?.data || err.message);
    throw new Error("Failed to authenticate with PayPal");
  }
};

/**
 * 🔁 Generic PayPal Request Helper (DRY)
 */
const paypalRequest = async (method, url, token, data = null) => {
  try {
    const res = await axios({
      method,
      url: `${BASE_URL}${url}`,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.data;
  } catch (err) {
    console.error("❌ PayPal API Error:", err.response?.data || err.message);
    throw new Error(
      err.response?.data?.message || "PayPal request failed"
    );
  }
};

/**
 * 💳 Create One-Time Payment Order
 */
const createPaypalOrder = async (amount) => {
  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const token = await getAccessToken();
  const orderData = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: "USD",
        value: amount.toString(),
      },
      description: "One-time Payment",
    },
  ],
  payment_source: {
    paypal: {
      experience_context: {
        brand_name: "CodeLab",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL}/billing/success`,
        cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      },
    },
  },
};

  const data = await paypalRequest(
    "POST",
    "/v2/checkout/orders", // ✅ FIXED
    token,
    orderData
  );

  const approvalUrl = data.links?.find(
    (link) => link.rel === "approve"
  )?.href;

  return {
    orderId: data.id,
    approvalUrl,
  };
};

/**
 * 💰 Capture Payment
 */
const capturePaypalOrder = async (orderId, userId, planId) => {
  if (!orderId || !userId || !planId) {
    throw new Error("Order ID, User ID, and Plan ID are required");
  }

  const token = await getAccessToken();

  const data = await paypalRequest(
    "POST",
    `/v2/checkout/orders/${orderId}/capture`, // ✅ FIXED
    token
  );

  if (data.status !== "COMPLETED") {
    throw new Error("Payment not completed");
  }

  const plan = PLAN_PRICING[planId];
  if (!plan) throw new Error("Invalid plan");

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      plan: plan.name,
      paypalOrderId: orderId,
      subscriptionStatus: "active",
    },
    { new: true }
  );

  return {
    success: true,
    payment: data,
    user: updatedUser,
  };
};

/**
 * 🔁 Create Subscription
 */
const createPaypalSubscription = async (planId) => {
  const plan = PLAN_PRICING[planId];
  if (!plan || !plan.paypalPlanId) {
    throw new Error("Invalid plan selected");
  }

  const token = await getAccessToken();

  const subscriptionData = {
    plan_id: plan.paypalPlanId,
    application_context: {
      brand_name: "CodeLab",
      user_action: "SUBSCRIBE_NOW",
      return_url: `${process.env.FRONTEND_URL}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
    },
  };

  const data = await paypalRequest(
    "POST",
    "/v1/billing/subscriptions",
    token,
    subscriptionData
  );

  return {
    subscriptionId: data.id,
    approvalUrl: data.links?.find(
      (link) => link.rel === "approve"
    )?.href,
    plan: plan.name,
  };
};

/**
 * 🔍 Verify Subscription
 */
const verifySubscription = async (subscriptionId) => {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required");
  }

  const token = await getAccessToken();

  return await paypalRequest(
    "GET",
    `/v1/billing/subscriptions/${subscriptionId}`,
    token
  );
};

/**
 * 🔥 Activate Subscription
 */
const activateUserSubscription = async (
  userId,
  subscriptionId,
  planId
) => {
  const sub = await verifySubscription(subscriptionId);

  if (sub.status !== "ACTIVE") {
    throw new Error("Subscription not active");
  }

  const plan = PLAN_PRICING[planId];
  if (!plan) throw new Error("Invalid plan");

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      plan: plan.name,
      subscriptionId,
      subscriptionStatus: "active",
      nextBillingDate: sub.billing_info?.next_billing_time,
    },
    { new: true }
  );

  return {
    success: true,
    subscription: sub,
    user: updatedUser,
  };
};

module.exports = {
  getAccessToken,
  createPaypalOrder,
  capturePaypalOrder,
  createPaypalSubscription,
  verifySubscription,
  activateUserSubscription,
  PLAN_PRICING,
};