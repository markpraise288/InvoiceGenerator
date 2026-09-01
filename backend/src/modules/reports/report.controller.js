// modules/reports/report.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const reportService = require("./report.service");

// ─── Shared param extractor ────────────────────────────────────────────────────

const extractParams = (req) => ({
  from: req.query.from ?? null,
  to: req.query.to ?? null,
  ownerId: req.query.owner ?? null,
});

// ─── Overview Report ───────────────────────────────────────────────────────────

const getOverviewReport = asyncHandler(async (req, res) => {
  const params = extractParams(req);

  const report = await reportService.getOverviewReport(params);

  return res.status(200).json(
    new ApiResponse(200, "Overview report fetched successfully", report)
  );
});

// ─── Deals Report ──────────────────────────────────────────────────────────────

const getDealsReport = asyncHandler(async (req, res) => {
  const params = extractParams(req);

  const report = await reportService.getDealsReport(params);

  return res.status(200).json(
    new ApiResponse(200, "Deals report fetched successfully", report)
  );
});

// ─── Leads Report ──────────────────────────────────────────────────────────────

const getLeadsReport = asyncHandler(async (req, res) => {
  const params = extractParams(req);

  const report = await reportService.getLeadsReport(params);

  return res.status(200).json(
    new ApiResponse(200, "Leads report fetched successfully", report)
  );
});

// ─── Tasks Report ──────────────────────────────────────────────────────────────

const getTasksReport = asyncHandler(async (req, res) => {
  const params = extractParams(req);

  const report = await reportService.getTasksReport(params);

  return res.status(200).json(
    new ApiResponse(200, "Tasks report fetched successfully", report)
  );
});

// ─── Activity Report ───────────────────────────────────────────────────────────

const getActivityReport = asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;
  const params = extractParams(req);
  params.workspaceId = workspaceId;

  const report = await reportService.getActivityReport(params);

  return res.status(200).json(
    new ApiResponse(200, "Activity report fetched successfully", report)
  );
});

module.exports = {
  getOverviewReport,
  getDealsReport,
  getLeadsReport,
  getTasksReport,
  getActivityReport,
};