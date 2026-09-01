// REST-based PayPal integration — Billing Plans & Agreements (classic v1 API).
// No SDK dependency; @paypal/checkout-server-sdk only covers the Orders API
// and doesn't support billing-plans/billing-agreements at all, which is why
// the old integration didn't work.

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken = null;
let tokenExpiresAt = 0;

// OAuth token, cached until ~1 min before expiry
const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal auth failed: ${errText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
};

// Shared request helper — every billing-plans/billing-agreements call is
// under /v1/payments/... (not bare /billing-plans — that path 404s)
const paypalRequest = async (path, { method = "GET", body } = {}) => {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content on some POSTs (cancel/suspend/reactivate) — nothing to parse
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // PayPal's top-level `message` is usually generic ("Invalid request. See
    // details.") — the actual field-level reason is in `details`. Surface
    // both so failures are debuggable instead of a dead end.
    const detail = Array.isArray(data.details)
      ? data.details.map((d) => `${d.field || ""} ${d.issue || d.description || ""}`.trim()).join("; ")
      : undefined;
    throw new Error(
      `PayPal request failed (${response.status}): ${data.message || "unknown error"}${
        detail ? ` — ${detail}` : ""
      }${data.debug_id ? ` [debug_id: ${data.debug_id}]` : ""}`
    );
  }

  return data;
};

// ─── Billing Plans — one-time setup, see scripts/createPayPalPlans.js ───────

const createBillingPlan = ({ name, description, amount }) =>
  paypalRequest("/billing-plans", {
    method: "POST",
    body: {
      name,
      description,
      // INFINITE = ongoing subscription with no fixed end (pairs with
      // cycles: "0" below). type: "FIXED" would require a nonzero cycle
      // count and reject this payload — that mismatch was the actual bug.
      type: "INFINITE",
      payment_definitions: [
        {
          name: `${name} payment`,
          type: "REGULAR",
          frequency: "MONTH",
          frequency_interval: "1",
          amount: { value: amount.toString(), currency: "USD" },
          cycles: "0", // 0 = infinite, renews until cancelled
        },
      ],
      merchant_preferences: {
        setup_fee: { value: "0", currency: "USD" },
        return_url: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/settings/billing?cancelled=true`,
        notify_url: `${process.env.BACKEND_URL}/api/webhooks/paypal`,
        max_fail_attempts: "3",
        initial_fail_amount_action: "CONTINUE",
        auto_bill_amount: "YES",
      },
    },
  });

const activateBillingPlan = (planId) =>
  paypalRequest(`/billing-plans/${planId}`, {
    method: "PATCH",
    body: [{ op: "replace", path: "/", value: { state: "ACTIVE" } }],
  });

// ─── Billing Agreements — runtime, one per workspace subscription ───────────

const PLAN_ID_BY_TIER = {
  pro: process.env.PAYPAL_PRO_PLAN_ID,
  business: process.env.PAYPAL_BUSINESS_PLAN_ID,
};

// Creates a pending agreement and returns the approval URL to redirect the
// user to. `data.id` here is a *token*, not the final agreement ID — PayPal
// gives you the real agreement ID only after executeBillingAgreement() below.
const createBillingAgreement = async (tier, { name, email }) => {
  const planId = PLAN_ID_BY_TIER[tier];
  if (!planId) {
    throw new Error(`No PayPal plan configured for tier "${tier}" — check PAYPAL_${tier.toUpperCase()}_PLAN_ID in .env`);
  }

  const [firstName, ...rest] = name.split(" ");

  const data = await paypalRequest("/billing-agreements", {
    method: "POST",
    body: {
      name: `BusinessFlow ${tier[0].toUpperCase()}${tier.slice(1)} subscription`,
      description: `BusinessFlow ${tier} plan for ${email}`,
      // 10s was too tight — ngrok + PayPal's own processing time can eat
      // that entire buffer, making "greater than current date" fail by the
      // time PayPal validates it server-side. 5 minutes gives real headroom.
      start_date: new Date(Date.now() + 5 * 60 * 1000).toISOString().split(".")[0] + "Z",
      plan: { id: planId },
      payer: {
        payment_method: "paypal",
        payer_info: {
          email,
          first_name: firstName,
          last_name: rest.join(" ") || ".",
        },
      },
      override_merchant_preferences: {
        return_url: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/settings/billing?cancelled=true`,
      },
    },
  });

  const approvalUrl = data.links?.find((l) => l.rel === "approval_url")?.href;
  if (!approvalUrl) {
    throw new Error("PayPal did not return an approval URL");
  }

  // The token that matters is the one embedded in the approval URL's query
  // string (?token=EC-...) — that's what PayPal echoes back on the redirect
  // after approval, and what agreement-execute expects. data.id on the
  // create response isn't reliably present, so don't depend on it.
  const token = new URL(approvalUrl).searchParams.get("token") || data.id;
  if (!token) {
    throw new Error("PayPal response had no token in the approval URL or response body");
  }

  return { token, approvalUrl };
};

// Called after the user approves on PayPal — PayPal redirects back with
// ?token=... in the query string; pass that token here. Returns the final
// agreement (id starts with "I-...") which you use for all further calls.
const executeBillingAgreement = (token) =>
  paypalRequest(`/billing-agreements/${token}/agreement-execute`, {
    method: "POST",
  });

const getBillingAgreement = (agreementId) =>
  paypalRequest(`/billing-agreements/${agreementId}`);

// Lists actual charge history for an agreement — independent of webhook
// delivery, so this is the reliable source of truth for invoices. Sandbox
// billing-agreement webhooks (PAYMENT.SALE.COMPLETED especially) are known
// to be slow or sometimes never arrive at all; this doesn't have that problem.
const getSubscriptionTransactions = (agreementId, { startDate, endDate }) => {
  const params = new URLSearchParams({
    start_date: startDate, // format: YYYY-MM-DD
    end_date: endDate,
  });
  return paypalRequest(`/billing-agreements/${agreementId}/transactions?${params}`);
};

const cancelBillingAgreement = (agreementId, reason) =>
  paypalRequest(`/billing-agreements/${agreementId}/cancel`, {
    method: "POST",
    body: { note: reason || "Customer requested cancellation" },
  });

const suspendBillingAgreement = (agreementId, reason) =>
  paypalRequest(`/billing-agreements/${agreementId}/suspend`, {
    method: "POST",
    body: { note: reason || "Suspended" },
  });

const reactivateBillingAgreement = (agreementId, reason) =>
  paypalRequest(`/billing-agreements/${agreementId}/re-activate`, {
    method: "POST",
    body: { note: reason || "Reactivated" },
  });

module.exports = {
  getAccessToken,
  createBillingPlan,
  activateBillingPlan,
  createBillingAgreement,
  executeBillingAgreement,
  getBillingAgreement,
  getSubscriptionTransactions,
  cancelBillingAgreement,
  suspendBillingAgreement,
  reactivateBillingAgreement,
};