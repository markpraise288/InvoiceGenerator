// modules/companies/company.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const companyService = require("./company.service");

// ─── Create Company ────────────────────────────────────────────────────────────

const createCompany = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.user.workspaceId;

  const company = await companyService.createCompany({
    data: req.body,
    userId,
    workspaceId
  });

  return res.status(201).json(
    new ApiResponse(201, "Company created successfully", company)
  );
});

// ─── Get Companies ─────────────────────────────────────────────────────────────

const getCompanies = asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;

  const result = await companyService.getCompanies({
    filters: req.query,
    workspaceId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Companies fetched successfully", result)
  );
});

// ─── Get Single Company ────────────────────────────────────────────────────────

const getCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const company = await companyService.getCompanyById(companyId);

  if (!company) {
    return res.status(404).json(
      new ApiResponse(404, "Company not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Company fetched successfully", company)
  );
});

// ------ Get Company Contacts -------------

const getComponyContacts = asyncHandler(async (req,res) => {
  const { companyId }  = req.params;

  const contacts = await companyService.getCompanyContacts(companyId);

  if (!contacts) {
    return res.status(404).json(
      new ApiResponse(404, "Contacts not found", null));
    };

  return res.status(200).json(
    new ApiResponse(200, "Contacts fetched successfully", contacts)
  );
});

// ─── Search Companies (combobox) ───────────────────────────────────────────────

const searchCompanies = asyncHandler(async (req, res) => {
  const search = req.query.q ?? "";
  const limit = parseInt(req.query.limit) || 10;

  const companies = await companyService.searchCompanies({ search, limit });

  return res.status(200).json(
    new ApiResponse(200, "Companies fetched successfully", companies)
  );
});

// ─── Update Company ────────────────────────────────────────────────────────────

const updateCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const company = await companyService.updateCompany({
    companyId,
    data: req.body,
    user: req.user
  });

  if (!company) {
    return res.status(404).json(
      new ApiResponse(404, "Company not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Company updated successfully", company)
  );
});

// ─── Delete Company ────────────────────────────────────────────────────────────

const deleteCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const company = await companyService.deleteCompany(companyId, req.user);

  if (!company) {
    return res.status(404).json(
      new ApiResponse(404, "Company not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Company deleted successfully", null)
  );
});

// ─── Get Company Stats ─────────────────────────────────────────────────────────

const getCompanyStats = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const stats = await companyService.getCompanyStats(companyId);

  return res.status(200).json(
    new ApiResponse(200, "Company stats fetched successfully", stats)
  );
});

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  searchCompanies,
  updateCompany,
  deleteCompany,
  getCompanyStats,
  getComponyContacts
};