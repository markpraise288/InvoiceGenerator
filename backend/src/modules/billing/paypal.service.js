const axios = require("axios");

const BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

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
          password: process.env.PAYPAL_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.data.access_token;
  } catch (err) {
    console.error("❌ PayPal Token Error:", err.response?.data || err.message);
    throw new Error("Failed to authenticate with PayPal");
  }
};

/**
 * 🔁 Generic PayPal API Request Helper
 */
const paypalRequest = async (method, endpoint, token, data = null) => {
  try {
    const res = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
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
      err.response?.data?.message || "PayPal API request failed"
    );
  }
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
 * ❌ Cancel Subscription (REAL PayPal API)
 */
const cancelSubscription = async (subscriptionId, reason = "User requested cancellation") => {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required");
  }

  const token = await getAccessToken();

  await paypalRequest(
    "POST",
    `/v1/billing/subscriptions/${subscriptionId}/cancel`,
    token,
    { reason }
  );

  return { success: true };
};

/**
 * 🔍 Verify Webhook Signature (CRITICAL for production)
 */
const verifyWebhookSignature = async (headers, body) => {
  try {
    const token = await getAccessToken();

    const verificationData = {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    };

    const res = await axios.post(
      `${BASE_URL}/v1/notifications/verify-webhook-signature`,
      verificationData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.verification_status === "SUCCESS";
  } catch (err) {
    console.error("❌ Webhook Verification Error:", err.response?.data || err.message);
    return false;
  }
};

module.exports = {
  getAccessToken,
  paypalRequest,
  verifySubscription,
  cancelSubscription,
  verifyWebhookSignature,
};