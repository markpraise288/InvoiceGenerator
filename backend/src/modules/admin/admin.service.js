const jwt = require("jsonwebtoken");
const Tenant = require("./tenant.model");
const AdminAuditLog = require("./adminAuditLog.model");
const User = require("../users/user.model");

const JWT_SECRET = process.env.JWT_SECRET;
const IMPERSONATION_TOKEN_TTL = "1h";

// ---------- AUDIT LOGGING (internal helper, used by every mutating action below) ----------

const writeAuditLog = async ({ actor, action, targetType, targetId, targetLabel, metadata, ipAddress }) => {
  return AdminAuditLog.create({
    actor,
    action,
    targetType,
    targetId,
    targetLabel: targetLabel || "",
    metadata: metadata || {},
    ipAddress: ipAddress || "",
  });
};

// ---------- TENANTS ----------

const createTenant = async (payload, actorId, ipAddress) => {
  const tenant = await Tenant.create(payload);

  await writeAuditLog({
    actor: actorId,
    action: "tenant_created",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    ipAddress,
  });

  return tenant;
};

const getTenants = async (query) => {
  const {
    search,
    plan,
    status,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = {};
  if (plan) filter.plan = plan;
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { businessName: { $regex: search, $options: "i" } },
      { ownerEmail: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
    Tenant.countDocuments(filter),
  ]);

  return {
    tenants,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getTenantById = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).populate("ownerUser", "name email role");
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }
  return tenant;
};

const updateTenant = async (tenantId, payload, actorId, ipAddress) => {
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  await writeAuditLog({
    actor: actorId,
    action: "tenant_updated",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    metadata: { updatedFields: Object.keys(payload) },
    ipAddress,
  });

  return tenant;
};

const suspendTenant = async (tenantId, reason, actorId, ipAddress) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  if (tenant.status === "suspended") {
    const error = new Error("Tenant is already suspended");
    error.statusCode = 400;
    throw error;
  }

  tenant.status = "suspended";
  tenant.suspendedAt = new Date();
  tenant.suspendedReason = reason;
  await tenant.save();

  await writeAuditLog({
    actor: actorId,
    action: "tenant_suspended",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    metadata: { reason },
    ipAddress,
  });

  return tenant;
};

const reactivateTenant = async (tenantId, actorId, ipAddress) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  if (tenant.status !== "suspended") {
    const error = new Error("Tenant is not currently suspended");
    error.statusCode = 400;
    throw error;
  }

  tenant.status = "active";
  tenant.suspendedAt = null;
  tenant.suspendedReason = "";
  await tenant.save();

  await writeAuditLog({
    actor: actorId,
    action: "tenant_reactivated",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    ipAddress,
  });

  return tenant;
};

const changeTenantPlan = async (tenantId, { plan, mrr }, actorId, ipAddress) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  const fromPlan = tenant.plan;
  tenant.plan = plan;
  if (mrr !== undefined) tenant.mrr = mrr;
  await tenant.save();

  await writeAuditLog({
    actor: actorId,
    action: "tenant_plan_changed",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    metadata: { fromPlan, toPlan: plan, mrr: tenant.mrr },
    ipAddress,
  });

  return tenant;
};

const deleteTenant = async (tenantId, actorId, ipAddress) => {
  const tenant = await Tenant.findByIdAndDelete(tenantId);
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  await writeAuditLog({
    actor: actorId,
    action: "tenant_deleted",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    ipAddress,
  });

  return tenant;
};

// ---------- IMPERSONATION ----------

// Issues a short-lived, clearly-marked impersonation token. The token carries
// an `impersonating: true` flag and the actor's own ID, so anything downstream
// (logging middleware, UI banners) can tell this apart from a normal session.
const impersonateTenant = async ({ tenantId, reason }, actorId, ipAddress) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant not found");
    error.statusCode = 404;
    throw error;
  }

  if (!tenant.ownerUser) {
    const error = new Error("This tenant has no linked owner user account to impersonate");
    error.statusCode = 400;
    throw error;
  }

  const impersonationToken = jwt.sign(
    {
      id: tenant.ownerUser.toString(),
      impersonating: true,
      impersonatedBy: actorId,
      tenantId: tenant._id.toString(),
    },
    JWT_SECRET,
    { expiresIn: IMPERSONATION_TOKEN_TTL }
  );

  await writeAuditLog({
    actor: actorId,
    action: "impersonation_started",
    targetType: "tenant",
    targetId: tenant._id,
    targetLabel: tenant.businessName,
    metadata: { reason },
    ipAddress,
  });

  return { token: impersonationToken, expiresIn: IMPERSONATION_TOKEN_TTL, tenant };
};

const endImpersonation = async (tenantId, actorId, ipAddress) => {
  const tenant = await Tenant.findById(tenantId);

  await writeAuditLog({
    actor: actorId,
    action: "impersonation_ended",
    targetType: "tenant",
    targetId: tenantId,
    targetLabel: tenant?.businessName || "",
    ipAddress,
  });

  return { success: true };
};

// ---------- PLATFORM STATS ----------

const getPlatformStats = async (query = {}) => {
  const { dateFrom, dateTo } = query;

  const dateFilter = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
  }

  const [
    totalTenants,
    activeTenants,
    trialingTenants,
    suspendedTenants,
    mrrAgg,
    signupsOverTime,
    planBreakdown,
  ] = await Promise.all([
    Tenant.countDocuments(dateFilter),
    Tenant.countDocuments({ ...dateFilter, status: "active" }),
    Tenant.countDocuments({ ...dateFilter, status: "trialing" }),
    Tenant.countDocuments({ ...dateFilter, status: "suspended" }),
    Tenant.aggregate([
      { $match: { status: { $in: ["active", "past_due"] } } },
      { $group: { _id: null, totalMrr: { $sum: "$mrr" } } },
    ]),
    Tenant.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Tenant.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalTenants,
    activeTenants,
    trialingTenants,
    suspendedTenants,
    totalMrr: mrrAgg[0]?.totalMrr || 0,
    signupsOverTime: signupsOverTime.map((s) => ({
      period: `${s._id.year}-${String(s._id.month).padStart(2, "0")}`,
      count: s.count,
    })),
    planBreakdown: planBreakdown.reduce((acc, p) => {
      acc[p._id] = p.count;
      return acc;
    }, {}),
  };
};

// ---------- AUDIT LOGS ----------

const getAuditLogs = async (query) => {
  const {
    actor,
    action,
    targetType,
    targetId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 30,
  } = query;

  const filter = {};
  if (actor) filter.actor = actor;
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (targetId) filter.targetId = targetId;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AdminAuditLog.find(filter)
      .populate("actor", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AdminAuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Add near the top, this import already exists from tenant lookups:

// ---------- USERS (cross-tenant) ----------

const getUsers = async (query) => {
  const { search, tenantId, role, page = 1, limit = 20 } = query;

  const filter = {};
  if (tenantId) filter.tenant = tenantId; // assumes User has a `tenant` ref — see note below
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  };
};

const suspendUser = async (userId, reason, actorId, ipAddress) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: false, deactivatedAt: new Date(), deactivationReason: reason } },
    { new: true }
  ).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await writeAuditLog({
    actor: actorId,
    action: "user_suspended",
    targetType: "user",
    targetId: user._id,
    targetLabel: user.email,
    metadata: { reason },
    ipAddress,
  });

  return user;
};

const reactivateUser = async (userId, actorId, ipAddress) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: true, deactivatedAt: null, deactivationReason: "" } },
    { new: true }
  ).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await writeAuditLog({
    actor: actorId,
    action: "user_reactivated",
    targetType: "user",
    targetId: user._id,
    targetLabel: user.email,
    ipAddress,
  });

  return user;
};

// Add getUsers, suspendUser, reactivateUser to module.exports

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