const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const {
  initiateSubscriptionUpgrade,
  confirmSubscriptionUpgrade,
  cancelSubscription: cancelSubscriptionService,
  getBillingData: getBillingDataService,
} = require("./billing.service");

// GET /billing/data
const getBillingData = asyncHandler(async (req, res) => {
  const billingData = await getBillingDataService(req.user.id);
  res.status(200).json(new ApiResponse(true, "Billing data retrieved", billingData));
});

// POST /billing/upgrade
const initiateUpgrade = asyncHandler(async (req, res) => {
  const { planId } = req.body;
  const result = await initiateSubscriptionUpgrade(req.user.id, planId);
  res.status(200).json(new ApiResponse(true, "Upgrade initiated", result));
});

// POST /billing/upgrade/confirm
// Frontend calls this with the `token` query param PayPal appended to the
// return_url after approval (?token=EC-... in the redirect)
const confirmUpgrade = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await confirmSubscriptionUpgrade(req.user.id, token);
  res.status(200).json(new ApiResponse(true, "Subscription activated", result));
});

// POST /billing/cancel
const cancelSubscription = asyncHandler(async (req, res) => {
  const result = await cancelSubscriptionService(req.user.id);
  res.status(200).json(new ApiResponse(true, "Subscription cancelled", result));
});

module.exports = {
  getBillingData,
  initiateUpgrade,
  confirmUpgrade,
  cancelSubscription
}