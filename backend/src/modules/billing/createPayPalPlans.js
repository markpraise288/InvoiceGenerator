// Run once: node src/modules/billing/createPayPalPlans.js
// (adjust the run path if you move this file — see note below)
//
// Creates the Pro ($9) and Business ($29) billing plans in PayPal, activates
// them, and prints the plan IDs to paste into PAYPAL_PRO_PLAN_ID /
// PAYPAL_BUSINESS_PLAN_ID in .env. Re-running this creates duplicate plans —
// only run it again if you intentionally want new plans (e.g. price change).

require("dotenv").config();
const { createBillingPlan, activateBillingPlan } = require("./paypal.service");

const PLANS = [
  { tier: "pro", name: "BusinessFlow Pro", description: "BusinessFlow Pro plan", amount: 9 },
  { tier: "business", name: "BusinessFlow Business", description: "BusinessFlow Business plan", amount: 29 },
];

(async () => {
  for (const { tier, name, description, amount } of PLANS) {
    try {
      const plan = await createBillingPlan({ name, description, amount });
      await activateBillingPlan(plan.id);
      console.log(`✅ ${tier}: ${plan.id}  →  set PAYPAL_${tier.toUpperCase()}_PLAN_ID=${plan.id}`);
    } catch (err) {
      console.error(`❌ Failed to create ${tier} plan:`, err.message);
    }
  }
  process.exit(0);
})();