// modules/companies/company.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  validate,
  createCompanySchema,
  updateCompanySchema,
  queryCompanySchema,
} = require("./company.validate");
const {
  createCompany,
  getCompanies,
  getCompany,
  searchCompanies,
  updateCompany,
  deleteCompany,
  getCompanyStats,
  getComponyContacts
} = require("./company.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Search route ─────────────────────────────────────────────────────────────
// Declared before /:companyId to prevent "search" being captured as an id

router.get(
  "/search",
  searchCompanies                        // GET /api/companies/search?q=acme
);

// ─── Collection routes ─────────────────────────────────────────────────────────

router
  .route("/")
  .get(
    validate(queryCompanySchema, "query"), // GET  /api/companies
    getCompanies
  )
  .post(
    validate(createCompanySchema),         // POST /api/companies
    createCompany
  );

router.get("/:companyId/contacts", getComponyContacts);

// ─── Individual company routes ─────────────────────────────────────────────────

router
  .route("/:companyId")
  .get(getCompany)                         // GET    /api/companies/:companyId
  .patch(
    validate(updateCompanySchema),         // PATCH  /api/companies/:companyId
    updateCompany
  )
  .delete(deleteCompany);                  // DELETE /api/companies/:companyId

// ─── Company stats ─────────────────────────────────────────────────────────────

router.get(
  "/:companyId/stats",
  getCompanyStats                          // GET /api/companies/:companyId/stats
);

module.exports = router;