// createPaypalPlans.js
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const res = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_SECRET,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return res.data.access_token;
}

async function createProduct(name) {
  const token = await getAccessToken();

  const res = await axios.post(
    `${PAYPAL_BASE_URL}/v1/catalogs/products`,
    {
      name,
      type: "SERVICE",
      category: "SOFTWARE",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(`✅ Product created: ${name} => ${res.data.id}`);
  return res.data.id;
}

async function createPlan(productId, planName, price) {
  const token = await getAccessToken();

  const res = await axios.post(
    `${PAYPAL_BASE_URL}/v1/billing/plans`,
    {
      product_id: productId,
      name: planName,
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: price.toString(), currency_code: "USD" } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: "0", currency_code: "USD" },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
      taxes: { percentage: "0", inclusive: false },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(`✅ Plan created: ${planName} => ${res.data.id}`);
  return res.data.id;
}

// Main function
(async () => {
  try {
    // Create products
    const proProductId = await createProduct("Pro Plan");
    const businessProductId = await createProduct("Business Plan");

    // Create plans
    const proPlanId = await createPlan(proProductId, "Pro Plan Monthly", 9);
    const businessPlanId = await createPlan(businessProductId, "Business Plan Monthly", 19);

    console.log("\n💡 Add these to your .env:");
    console.log(`PAYPAL_PRO_PLAN_ID=${proPlanId}`);
    console.log(`PAYPAL_BUSINESS_PLAN_ID=${businessPlanId}`);
  } catch (err) {
    console.error("❌ Error creating PayPal plans:", err.response?.data || err.message);
  }
})();