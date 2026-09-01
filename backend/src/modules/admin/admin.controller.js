const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const adminService = require("./admin.service");
const {
  createTenantSchema,
  updateTenantSchema,
  suspendTenantSchema,
  changeTenantPlanSchema,
  listTenantsQuerySchema,
  impersonateTenantSchema,
  listAuditLogsQuerySchema,
  platformStatsQuerySchema,
} = require("./admin.validate");

// Small helper — every mutating admin action needs the actor's ID and IP for
// audit logging, so pull both consistently rather than repeating this inline
// in every single handler below.
const getActorContext = (req) => ({
  actorId: req.user.id || req.user._id,
  ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
});

// ---------- TENANTS ----------

const createTenant = asyncHandler(async (req, res) => {
  const { error, value } = createTenantSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const { actorId, ipAddress } = getActorContext(req);
  const tenant = await adminService.createTenant(value, actorId, ipAddress);
  return res.status(201).json(new ApiResponse(201, "Tenant created successfully", tenant));
});

const getTenants = asyncHandler(async (req, res) => {
  const { error, value } = listTenantsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await adminService.getTenants(value);
  return res.status(200).json(new ApiResponse(200, "Tenants fetched successfully", result));
});

const getTenantById = asyncHandler(async (req, res) => {
  const tenant = await adminService.getTenantById(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Tenant fetched successfully", tenant));
});

const updateTenant = asyncHandler(async (req, res) => {
  const { error, value } = updateTenantSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const { actorId, ipAddress } = getActorContext(req);
  const tenant = await adminService.updateTenant(req.params.id, value, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "Tenant updated successfully", tenant));
});

const suspendTenant = asyncHandler(async (req, res) => {
  const { error, value } = suspendTenantSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const { actorId, ipAddress } = getActorContext(req);
  const tenant = await adminService.suspendTenant(req.params.id, value.reason, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "Tenant suspended successfully", tenant));
});

const reactivateTenant = asyncHandler(async (req, res) => {
  const { actorId, ipAddress } = getActorContext(req);
  const tenant = await adminService.reactivateTenant(req.params.id, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "Tenant reactivated successfully", tenant));
});

const changeTenantPlan = asyncHandler(async (req, res) => {
  const { error, value } = changeTenantPlanSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const { actorId, ipAddress } = getActorContext(req);
  const tenant = await adminService.changeTenantPlan(req.params.id, value, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "Tenant plan updated successfully", tenant));
});

const deleteTenant = asyncHandler(async (req, res) => {
  const { actorId, ipAddress } = getActorContext(req);
  await adminService.deleteTenant(req.params.id, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "Tenant deleted successfully", null));
});

// ---------- IMPERSONATION ----------

const impersonateTenant = asyncHandler(async (req, res) => {
  const { error, value } = impersonateTenantSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const { actorId, ipAddress } = getActorContext(req);
  const result = await adminService.impersonateTenant(value, actorId, ipAddress);
  return res
    .status(200)
    .json(new ApiResponse(200, "Impersonation session started", result));
});

const endImpersonation = asyncHandler(async (req, res) => {
  const { actorId, ipAddress } = getActorContext(req);
  const result = await adminService.endImpersonation(req.params.tenantId, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "Impersonation session ended", result));
});

// ---------- PLATFORM STATS ----------

const getPlatformStats = asyncHandler(async (req, res) => {
  const { error, value } = platformStatsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const stats = await adminService.getPlatformStats(value);
  return res.status(200).json(new ApiResponse(200, "Platform stats fetched successfully", stats));
});

// ---------- AUDIT LOGS ----------

const getAuditLogs = asyncHandler(async (req, res) => {
  const { error, value } = listAuditLogsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await adminService.getAuditLogs(value);
  return res.status(200).json(new ApiResponse(200, "Audit logs fetched successfully", result));
});

// Add these three handlers anywhere among the other exports, e.g. right after
// the AUDIT LOGS section, before module.exports:

// ---------- USERS (cross-tenant) ----------

const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  return res.status(200).json(new ApiResponse(200, "Users fetched successfully", result));
});

const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json(new ApiResponse(400, "A reason is required to suspend a user", null));
  }

  const { actorId, ipAddress } = getActorContext(req);
  const user = await adminService.suspendUser(req.params.id, reason, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "User suspended successfully", user));
});

const reactivateUser = asyncHandler(async (req, res) => {
  const { actorId, ipAddress } = getActorContext(req);
  const user = await adminService.reactivateUser(req.params.id, actorId, ipAddress);
  return res.status(200).json(new ApiResponse(200, "User reactivated successfully", user));
});

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  changeTenantPlan,
  deleteTenant,
  impersonateTenant,
  endImpersonation,
  getPlatformStats,
  getAuditLogs,
    getUsers,
    suspendUser,
    reactivateUser,
};