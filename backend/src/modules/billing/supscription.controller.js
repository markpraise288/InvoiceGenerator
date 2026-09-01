'use strict';

const User = require('../models/user.model');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const paypalService = require('./paypal.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PAID_PLANS = ['pro', 'business'];

/** Extracts the PayPal approval link from a freshly created subscription */
function extractApprovalUrl(subscription) {
  const link = (subscription.links || []).find((l) => l.rel === 'approve');
  return link ? link.href : null;
}

// ---------------------------------------------------------------------------
// GET /billing/data
// Returns everything the billing settings page needs in one call.
// ---------------------------------------------------------------------------
const getBillingData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'plan paypalSubscriptionId subscriptionStatus nextBillingDate lastPaymentDate email firstName lastName'
    );

    if (!user) throw new AppError('User not found', 404);

    // Usage metrics — swap these out for real DB aggregations when ready
    const usage = {
      'Team members': 1,
      'Leads stored': 0,
      'API requests': 0,
    };

    // Invoices — PayPal does not expose a simple invoice list via REST for
    // billing subscriptions; return empty array until you build a Payment
    // history collection populated by PAYMENT.SALE.COMPLETED webhooks.
    const invoices = [];

    return res.status(200).json(
      new ApiResponse(true, 'Billing data fetched successfully', {
        currentPlan: user.plan || 'starter',
        subscriptionStatus: user.subscriptionStatus || 'pending',
        renewsOn: user.nextBillingDate || null,
        lastPaymentDate: user.lastPaymentDate || null,
        paypalSubscriptionId: user.paypalSubscriptionId || null,
        usage,
        invoices,
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /billing/upgrade
// Body: { planId: 'pro' | 'business' }
// Creates a PayPal subscription and returns the approval URL.
// ---------------------------------------------------------------------------
const createSubscription = async (req, res, next) => {
  try {
    const { planId } = req.body;

    if (!planId || !VALID_PAID_PLANS.includes(planId)) {
      throw new AppError('Invalid plan. Must be "pro" or "business".', 400);
    }

    const user = await User.findById(req.user._id).select(
      'plan paypalSubscriptionId subscriptionStatus email firstName lastName'
    );

    if (!user) throw new AppError('User not found', 404);

    // Block duplicate active subscriptions
    if (
      user.paypalSubscriptionId &&
      ['active', 'pending'].includes(user.subscriptionStatus)
    ) {
      throw new AppError(
        'You already have an active subscription. Cancel or upgrade your existing plan.',
        409
      );
    }

    // If already on this plan
    if (user.plan === planId && user.subscriptionStatus === 'active') {
      throw new AppError(`You are already on the ${planId} plan.`, 409);
    }

    // If user has an existing PayPal subscription, use revise (upgrade/downgrade)
    // instead of creating a brand-new one to preserve billing history.
    if (
      user.paypalSubscriptionId &&
      user.subscriptionStatus === 'active' &&
      user.plan !== planId
    ) {
      return await _handlePlanRevision(user, planId, res);
    }

    // Create a fresh PayPal subscription
    const ppSubscription = await paypalService.createSubscription(planId, {
      subscriberEmail: user.email,
      subscriberGivenName: user.firstName || '',
      subscriberSurname: user.lastName || '',
    });

    const approvalUrl = extractApprovalUrl(ppSubscription);
    if (!approvalUrl) {
      throw new AppError('PayPal did not return an approval URL. Please try again.', 502);
    }

    // Persist the pending subscription ID so the webhook can match the user
    await User.findByIdAndUpdate(user._id, {
      paypalSubscriptionId: ppSubscription.id,
      subscriptionStatus: 'pending',
      plan: planId,
    });

    return res.status(200).json(
      new ApiResponse(true, 'Subscription initiated. Redirecting to PayPal.', {
        approvalUrl,
        subscriptionId: ppSubscription.id,
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /billing/cancel
// Cancels the user's active PayPal subscription.
// ---------------------------------------------------------------------------
const cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'paypalSubscriptionId subscriptionStatus plan'
    );

    if (!user) throw new AppError('User not found', 404);

    if (!user.paypalSubscriptionId) {
      throw new AppError('No active subscription found.', 404);
    }

    if (user.subscriptionStatus === 'cancelled') {
      throw new AppError('Subscription is already cancelled.', 409);
    }

    await paypalService.cancelSubscription(
      user.paypalSubscriptionId,
      'User requested cancellation via billing settings'
    );

    // Reflect cancellation immediately; webhook will confirm and clean up
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'cancelled',
    });

    return res.status(200).json(
      new ApiResponse(true, 'Subscription cancelled successfully.', {
        subscriptionStatus: 'cancelled',
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /billing/suspend
// Suspends the user's active PayPal subscription.
// ---------------------------------------------------------------------------
const suspendSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'paypalSubscriptionId subscriptionStatus'
    );

    if (!user) throw new AppError('User not found', 404);
    if (!user.paypalSubscriptionId) throw new AppError('No active subscription found.', 404);

    if (user.subscriptionStatus !== 'active') {
      throw new AppError('Only active subscriptions can be suspended.', 409);
    }

    await paypalService.suspendSubscription(user.paypalSubscriptionId);

    await User.findByIdAndUpdate(user._id, { subscriptionStatus: 'suspended' });

    return res.status(200).json(
      new ApiResponse(true, 'Subscription suspended.', {
        subscriptionStatus: 'suspended',
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /billing/reactivate
// Reactivates a suspended PayPal subscription.
// ---------------------------------------------------------------------------
const reactivateSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'paypalSubscriptionId subscriptionStatus'
    );

    if (!user) throw new AppError('User not found', 404);
    if (!user.paypalSubscriptionId) throw new AppError('No subscription found.', 404);

    if (user.subscriptionStatus !== 'suspended') {
      throw new AppError('Only suspended subscriptions can be reactivated.', 409);
    }

    await paypalService.activateSubscription(user.paypalSubscriptionId);

    await User.findByIdAndUpdate(user._id, { subscriptionStatus: 'active' });

    return res.status(200).json(
      new ApiResponse(true, 'Subscription reactivated.', {
        subscriptionStatus: 'active',
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /billing/update-payment-method
// PayPal does not support direct payment method updates via API for
// subscriptions. The standard flow is to redirect the subscriber to the
// PayPal subscription management page.
// ---------------------------------------------------------------------------
const updatePaymentMethod = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'paypalSubscriptionId subscriptionStatus'
    );

    if (!user) throw new AppError('User not found', 404);
    if (!user.paypalSubscriptionId) throw new AppError('No active subscription found.', 404);

    // Fetch the live subscription to get PayPal's manage link
    const ppSubscription = await paypalService.getSubscription(
      user.paypalSubscriptionId
    );

    const manageLink = (ppSubscription.links || []).find(
      (l) => l.rel === 'edit' || l.rel === 'self'
    );

    // Fall back to PayPal's generic subscription management URL
    const updateUrl =
      manageLink?.href ||
      `https://www.${process.env.PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/myaccount/autopay/`;

    return res.status(200).json(
      new ApiResponse(true, 'Redirecting to PayPal to update payment method.', {
        updateUrl,
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /billing/subscription
// Returns the raw PayPal subscription details for the authenticated user.
// ---------------------------------------------------------------------------
const getSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'paypalSubscriptionId subscriptionStatus plan'
    );

    if (!user) throw new AppError('User not found', 404);
    if (!user.paypalSubscriptionId) throw new AppError('No subscription found.', 404);

    const ppSubscription = await paypalService.getSubscription(
      user.paypalSubscriptionId
    );

    return res.status(200).json(
      new ApiResponse(true, 'Subscription details fetched.', {
        subscription: ppSubscription,
        localStatus: user.subscriptionStatus,
        plan: user.plan,
      })
    );
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Internal: handle upgrade/downgrade via PayPal revise API
// Called from createSubscription when user already has an active sub.
// ---------------------------------------------------------------------------
async function _handlePlanRevision(user, newPlan, res) {
  const revision = await paypalService.reviseSubscription(
    user.paypalSubscriptionId,
    newPlan
  );

  const approvalUrl = extractApprovalUrl(revision);

  if (approvalUrl) {
    // Plan change needs PayPal re-approval
    await User.findByIdAndUpdate(user._id, { plan: newPlan });

    return res.status(200).json(
      new ApiResponse(
        true,
        'Plan change initiated. Please approve via PayPal.',
        { approvalUrl, subscriptionId: user.paypalSubscriptionId }
      )
    );
  }

  // No approval needed — plan change applied immediately
  await User.findByIdAndUpdate(user._id, { plan: newPlan });

  return res.status(200).json(
    new ApiResponse(true, 'Plan updated successfully.', {
      plan: newPlan,
      subscriptionId: user.paypalSubscriptionId,
    })
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  getBillingData,
  createSubscription,
  cancelSubscription,
  suspendSubscription,
  reactivateSubscription,
  updatePaymentMethod,
  getSubscription,
};