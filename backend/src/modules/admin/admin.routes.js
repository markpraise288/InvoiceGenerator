const express = require("express");
const router = express.Router();

const verifySuperAdmin = require("./adminAuth.middleware");
const {
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
  reactivateUser
} = require("./admin.controller");

router.use(verifySuperAdmin);

// ---------- PLATFORM STATS ----------
router.get("/stats", getPlatformStats);

// ---------- TENANTS ----------
router.route("/tenants").post(createTenant).get(getTenants);

router
  .route("/tenants/:id")
  .get(getTenantById)
  .put(updateTenant)
  .delete(deleteTenant);

router.patch("/tenants/:id/suspend", suspendTenant);
router.patch("/tenants/:id/reactivate", reactivateTenant);
router.patch("/tenants/:id/plan", changeTenantPlan);

router.get("/users", getUsers);
router.patch("/users/:id/suspend", suspendUser);
router.patch("/users/:id/reactivate", reactivateUser);

// ---------- IMPERSONATION ----------
router.post("/impersonate", impersonateTenant);
router.post("/impersonate/:tenantId/end", endImpersonation);

// ---------- AUDIT LOGS ----------
router.get("/audit-logs", getAuditLogs);

module.exports = router;