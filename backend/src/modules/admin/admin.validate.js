const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ID format");

const planEnum = ["free", "starter", "pro", "enterprise"];
const statusEnum = ["active", "trialing", "past_due", "suspended", "cancelled"];

const createTenantSchema = Joi.object({
  businessName: Joi.string().trim().min(1).max(200).required(),
  ownerEmail: Joi.string().trim().email().required(),
  ownerUser: objectId.optional().allow(null),
  plan: Joi.string().valid(...planEnum).optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  trialEndsAt: Joi.date().optional().allow(null),
  signupSource: Joi.string().trim().allow("").optional(),
  metadata: Joi.object().unknown(true).optional(),
});

const updateTenantSchema = Joi.object({
  businessName: Joi.string().trim().min(1).max(200).optional(),
  ownerEmail: Joi.string().trim().email().optional(),
  plan: Joi.string().valid(...planEnum).optional(),
  mrr: Joi.number().integer().min(0).optional(),
  trialEndsAt: Joi.date().optional().allow(null),
  signupSource: Joi.string().trim().allow("").optional(),
  metadata: Joi.object().unknown(true).optional(),
  // status intentionally excluded — use the dedicated suspend/reactivate endpoints
}).min(1);

const suspendTenantSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
});

const changeTenantPlanSchema = Joi.object({
  plan: Joi.string().valid(...planEnum).required(),
  mrr: Joi.number().integer().min(0).optional(), // cents, updated alongside plan change
});

const listTenantsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  plan: Joi.string().valid(...planEnum).optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid("businessName", "createdAt", "mrr", "userCount").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

const impersonateTenantSchema = Joi.object({
  tenantId: objectId.required(),
  reason: Joi.string().trim().min(1).max(500).required(),
  // requiring a reason for every impersonation, no exceptions — this becomes
  // the audit log's metadata.reason so there's always a documented justification
});

const listAuditLogsQuerySchema = Joi.object({
  actor: objectId.optional(),
  action: Joi.string()
    .valid(
      "tenant_suspended",
      "tenant_reactivated",
      "tenant_plan_changed",
      "tenant_deleted",
      "tenant_created",
      "tenant_updated",
      "impersonation_started",
      "impersonation_ended",
      "user_suspended",
      "user_reactivated",
      "user_role_changed",
      "user_deleted"
    )
    .optional(),
  targetType: Joi.string().valid("tenant", "user").optional(),
  targetId: objectId.optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const platformStatsQuerySchema = Joi.object({
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
});

module.exports = {
  createTenantSchema,
  updateTenantSchema,
  suspendTenantSchema,
  changeTenantPlanSchema,
  listTenantsQuerySchema,
  impersonateTenantSchema,
  listAuditLogsQuerySchema,
  platformStatsQuerySchema,
};