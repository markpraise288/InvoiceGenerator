const User = require("../users/user.model");
const Workspace = require("../settings/workspace.model");
const Subscription = require("./subscription.model");
const SubscriptionInvoice = require("./subscriptionInvoice.model");
const {
  createBillingAgreement,
  executeBillingAgreement,
  cancelBillingAgreement: paypalCancelAgreement,
  getSubscriptionTransactions,
} = require("./paypal.service");

// ─── Upgrade flow ────────────────────────────────────────────────────────────

// Step 1: user clicks "Upgrade" — create a pending PayPal agreement
const initiateSubscriptionUpgrade = async (userId, planId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!["pro", "business"].includes(planId)) {
    const error = new Error("Invalid plan");
    error.statusCode = 400;
    throw error;
  }

  const workspace = await Workspace.findById(user.workspaceId);
  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  if (workspace.plan === planId) {
    const error = new Error("Already on this plan");
    error.statusCode = 400;
    throw error;
  }

  const { token, approvalUrl } = await createBillingAgreement(planId, {
    name: user.name,
    email: user.email,
  });

  if (!token) {
    throw new Error("PayPal did not return a subscription token — cannot create pending subscription");
  }

  await Subscription.create({
    workspaceId: workspace._id,
    initiatedByUserId: userId,
    paypalAgreementId: token, // pending token — swapped for the real ID on confirm
    plan: planId,
    status: "pending_approval",
    approvalUrl,
  });

  return { approvalUrl };
};

// Step 2: PayPal redirected back with ?token=... — execute the agreement
const confirmSubscriptionUpgrade = async (userId, token) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const pendingSubscription = await Subscription.findOne({
    paypalAgreementId: token,
    status: "pending_approval",
  });

  if (!pendingSubscription) {
    const error = new Error("No pending subscription found for this token");
    error.statusCode = 400;
    throw error;
  }

  const executed = await executeBillingAgreement(token); // { id, state, ... }

  if (executed.state !== "Active") {
    const error = new Error(`PayPal agreement not active (state: ${executed.state})`);
    error.statusCode = 400;
    throw error;
  }

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const workspace = await Workspace.findById(pendingSubscription.workspaceId);
  workspace.plan = pendingSubscription.plan;
  workspace.paypalSubscriptionId = executed.id; // real agreement ID from here on
  workspace.subscriptionStatus = "active";
  workspace.nextBillingDate = nextBillingDate;
  await workspace.save();

  pendingSubscription.paypalAgreementId = executed.id;
  pendingSubscription.status = "active";
  pendingSubscription.activatedAt = new Date();
  await pendingSubscription.save();

  return {
    plan: workspace.plan,
    status: "active",
    nextBillingDate: workspace.nextBillingDate,
  };
};

// ─── Cancellation ────────────────────────────────────────────────────────────

const cancelSubscription = async (userId) => {
  const user = await User.findById(userId);
  const workspace = await Workspace.findById(user.workspaceId);

  if (!workspace.paypalSubscriptionId) {
    const error = new Error("No active subscription to cancel");
    error.statusCode = 400;
    throw error;
  }

  await paypalCancelAgreement(workspace.paypalSubscriptionId);

  workspace.plan = "starter";
  workspace.subscriptionStatus = "cancelled";
  workspace.paypalSubscriptionId = null;
  await workspace.save();

  await Subscription.findOneAndUpdate(
    { paypalAgreementId: workspace.paypalSubscriptionId, status: "active" },
    { status: "cancelled", cancelledAt: new Date() }
  );

  return { plan: "starter", status: "cancelled" };
};

// ─── Read-only billing data for the settings page ────────────────────────────

// Pulls actual charge history from PayPal and creates any SubscriptionInvoice
// records that are missing (e.g. because the webhook never arrived — a known
// PayPal sandbox limitation). Safe to call repeatedly: paypalTransactionId
// is unique, so already-recorded charges are just skipped, not duplicated.
const syncInvoicesFromPayPal = async (workspace) => {
  if (!workspace.paypalSubscriptionId) return;

  const startDate = workspace.createdAt.toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  let transactions;
  try {
    const result = await getSubscriptionTransactions(workspace.paypalSubscriptionId, {
      startDate,
      endDate,
    });
    transactions = result.agreement_transaction_list || [];
  } catch (err) {
    // Don't let a PayPal hiccup break the billing page — just skip the sync
    // this time and fall back to whatever's already in Mongo.
    console.warn(`Could not sync PayPal transactions: ${err.message}`);
    return;
  }

  for (const txn of transactions) {
    if (txn.status !== "Completed") continue;

    try {
      await SubscriptionInvoice.create({
        workspaceId: workspace._id,
        paypalTransactionId: txn.transaction_id,
        amount: Math.round(parseFloat(txn.amount.value) * 100),
        currency: txn.amount.currency,
        status: "paid",
        paidAt: new Date(txn.time_stamp),
      });
    } catch (err) {
      // E11000 duplicate key = already recorded (via webhook or a prior
      // sync) — that's expected and fine, not an error worth logging.
      if (err.code !== 11000) {
        console.error(`Failed to backfill invoice ${txn.transaction_id}:`, err.message);
      }
    }
  }
};

const getBillingData = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const workspace = await Workspace.findById(user.workspaceId);
  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  await syncInvoicesFromPayPal(workspace);

  const invoices = await SubscriptionInvoice.find({ workspaceId: workspace._id })
    .sort({ createdAt: -1 })
    .limit(10);

  const teamCount = await User.countDocuments({ workspaceId: workspace._id });

  // TODO: replace with real counts once wired to your Lead model / API logs
  const leadCount = 1240;
  const apiRequestsThisMonth = 8400;

  return {
    currentPlan: workspace.plan || "starter",
    renewsOn: workspace.nextBillingDate
      ? workspace.nextBillingDate.toISOString().split("T")[0]
      : null,
    usage: {
      "Team members": teamCount,
      "Leads stored": leadCount,
      "API requests": apiRequestsThisMonth,
    },
    invoices: invoices.map((inv) => ({
      id: `INV-${inv._id.toString().slice(0, 8).toUpperCase()}`,
      date: inv.createdAt.toISOString().split("T")[0],
      amount: inv.amount / 100,
      status: inv.status === "paid" ? "paid" : "pending",
    })),
  };
};

// ─── Webhook handlers ─────────────────────────────────────────────────────────
// ⚠️ Event names for the classic Billing Agreements API are less standardized
// than the newer Subscriptions v2 API. PAYMENT.SALE.COMPLETED is well-documented
// and definitely fires for recurring agreement charges. Verify the others
// (BILLING.SUBSCRIPTION.CANCELLED) actually fire for your integration using
// PayPal's webhook simulator before relying on them in production.

// Recurring charge succeeded
const handlePaymentSaleCompleted = async (event) => {
  const { id: transactionId, billing_agreement_id: agreementId, amount } = event.resource;

  if (!agreementId) return; // not a billing-agreement charge, ignore

  const subscription = await Subscription.findOne({ paypalAgreementId: agreementId });
  if (!subscription) {
    console.warn(`No subscription found for agreement: ${agreementId}`);
    return;
  }

  const invoice = await SubscriptionInvoice.create({
    workspaceId: subscription.workspaceId,
    paypalTransactionId: transactionId,
    amount: Math.round(parseFloat(amount.total) * 100),
    currency: amount.currency,
    status: "paid",
    paidAt: new Date(),
  });

  const workspace = await Workspace.findById(subscription.workspaceId);
  workspace.lastPaymentDate = invoice.paidAt;
  workspace.nextBillingDate = new Date(
    (workspace.nextBillingDate?.getTime() || Date.now()) + 30 * 24 * 60 * 60 * 1000
  );
  await workspace.save();

  subscription.lastPaymentDate = invoice.paidAt;
  subscription.paymentFailures = 0;
  await subscription.save();
};

// Recurring charge failed/denied
const handlePaymentSaleDenied = async (event) => {
  const { id: transactionId, billing_agreement_id: agreementId, amount } = event.resource;

  if (!agreementId) return;

  const subscription = await Subscription.findOne({ paypalAgreementId: agreementId });
  if (!subscription) return;

  await SubscriptionInvoice.create({
    workspaceId: subscription.workspaceId,
    paypalTransactionId: transactionId,
    amount: Math.round(parseFloat(amount.total) * 100),
    currency: amount.currency,
    status: "failed",
  });

  subscription.paymentFailures = (subscription.paymentFailures || 0) + 1;
  if (subscription.paymentFailures >= 3) {
    subscription.status = "suspended";
    const workspace = await Workspace.findById(subscription.workspaceId);
    workspace.subscriptionStatus = "suspended";
    await workspace.save();
  }
  await subscription.save();
};

// Agreement cancelled (by payer or merchant)
const handleSubscriptionCancelled = async (event) => {
  const agreementId = event.resource?.id;
  if (!agreementId) return;

  const subscription = await Subscription.findOne({ paypalAgreementId: agreementId });
  if (!subscription) return;

  const workspace = await Workspace.findById(subscription.workspaceId);
  workspace.plan = "starter";
  workspace.subscriptionStatus = "cancelled";
  workspace.paypalSubscriptionId = null;
  await workspace.save();

  subscription.status = "cancelled";
  subscription.cancelledAt = new Date();
  await subscription.save();
};

module.exports = {
  initiateSubscriptionUpgrade,
  confirmSubscriptionUpgrade,
  cancelSubscription,
  getBillingData,
  handlePaymentSaleCompleted,
  handlePaymentSaleDenied,
  handleSubscriptionCancelled,
};