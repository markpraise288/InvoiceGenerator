// Run: node src/modules/billing/checkAgreement.js I-W4F32U6WKN2W
// Queries PayPal directly for an agreement's real status — bypasses
// webhooks and the transactions-list endpoint entirely, so this tells you
// definitively what PayPal itself currently believes, independent of any
// delivery lag on our side.

require("dotenv").config();
const { getBillingAgreement } = require("./paypal.service");

const agreementId = process.argv[2];
if (!agreementId) {
  console.error("Usage: node checkAgreement.js <agreementId>");
  process.exit(1);
}

(async () => {
  try {
    const agreement = await getBillingAgreement(agreementId);
    console.log(JSON.stringify(agreement, null, 2));

    console.log("\n--- Summary ---");
    console.log("State:", agreement.state);
    console.log("Next billing date:", agreement.agreement_details?.next_billing_date);
    console.log("Last payment date:", agreement.agreement_details?.last_payment_date);
    console.log("Last payment amount:", agreement.agreement_details?.last_payment_amount);
    console.log("Failed payment count:", agreement.agreement_details?.failed_payment_count);
    console.log("Cycles completed:", agreement.agreement_details?.cycles_completed);
  } catch (err) {
    console.error("Failed to fetch agreement:", err.message);
  }
  process.exit(0);
})();