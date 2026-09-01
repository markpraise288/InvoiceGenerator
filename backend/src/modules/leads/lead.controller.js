const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const leadService = require("./lead.service");
const {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  convertLeadSchema,
  listLeadsQuerySchema,
} = require("./lead.validate");

const createLead = asyncHandler(async (req, res) => {
  const { error, value } = createLeadSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const lead = await leadService.createLead(value, req.user);
  return res.status(201).json(new ApiResponse(201, "Lead created successfully", lead));
});

const getLeads = asyncHandler(async (req, res) => {
  const { error, value } = listLeadsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await leadService.getLeads(value, req.user);
  return res.status(200).json(new ApiResponse(200, "Leads fetched successfully", result));
});

const getLeadsKanban = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.owner) filter.owner = req.query.owner;
  if (req.query.source) filter.source = req.query.source;

  const columns = await leadService.getLeadsKanban(filter, req.user);
  return res.status(200).json(new ApiResponse(200, "Lead pipeline fetched successfully", columns));
});

const getLeadsSummary = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.owner) filter.owner = req.query.owner;

  const summary = await leadService.getLeadsSummary(filter, req.user);
  return res.status(200).json(new ApiResponse(200, "Lead summary fetched successfully", summary));
});

const getLeadById = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Lead fetched successfully", lead));
});

const updateLead = asyncHandler(async (req, res) => {
  const { error, value } = updateLeadSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const lead = await leadService.updateLead(req.params.id, value, req.user);
  return res.status(200).json(new ApiResponse(200, "Lead updated successfully", lead));
});

const updateLeadStage = asyncHandler(async (req, res) => {
  const { error, value } = updateLeadStageSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const lead = await leadService.updateLeadStage(req.params.id, value.stage, value.lostReason, req.user);
  return res.status(200).json(new ApiResponse(200, "Lead stage updated successfully", lead));
});

const deleteLead = asyncHandler(async (req, res) => {
  await leadService.deleteLead(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, "Lead deleted successfully", null));
});

const convertLead = asyncHandler(async (req, res) => {
  const { error, value } = convertLeadSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await leadService.convertLeadToCustomer(req.params.id, value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Lead converted to customer successfully", result));
});

module.exports = {
  createLead,
  getLeads,
  getLeadsKanban,
  getLeadsSummary,
  getLeadById,
  updateLead,
  updateLeadStage,
  deleteLead,
  convertLead,
};