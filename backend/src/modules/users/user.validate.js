const joi = require("joi");

// ✅ Allowed plans and subscription statuses
const PLAN_OPTIONS = ["free", "pro", "business"];
const SUBSCRIPTION_STATUS_OPTIONS = ["active", "inactive", "cancelled"];

const createUserSchema = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required(),
  phone: joi.string().required(),
  address: joi.string().allow(""),
  companyName: joi.string().allow(""),

  // Optional billing fields (if creating user with subscription)
  plan: joi.string().valid(...PLAN_OPTIONS).default("free"),
  subscriptionStatus: joi.string()
    .valid(...SUBSCRIPTION_STATUS_OPTIONS)
    .default("inactive"),
  paypalOrderId: joi.string().optional().allow(""),
  subscriptionId: joi.string().optional().allow(""),
  nextBillingDate: joi.date().optional(),
});

const updateUserSchema = joi.object({
  name: joi.string(),
  email: joi.string().email(),
  phone: joi.string(),
  address: joi.string().allow(""),
  companyName: joi.string().allow(""),

  // Billing updates
  plan: joi.string().valid(...PLAN_OPTIONS),
  subscriptionStatus: joi.string().valid(...SUBSCRIPTION_STATUS_OPTIONS),
  paypalOrderId: joi.string().optional().allow(""),
  subscriptionId: joi.string().optional().allow(""),
  nextBillingDate: joi.date().optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
};