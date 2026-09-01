// modules/deals/deal.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const dealService = require("./deal.service");

// ─── Create Deal ───────────────────────────────────────────────────────────────

const createDeal = asyncHandler(async (req, res) => {
  const user = req.user;

  const deal = await dealService.createDeal({
    data: req.body,
    user,
  });

  return res.status(201).json(
    new ApiResponse(201, "Deal created successfully", deal)
  );
});

// ─── Get Deals (paginated) ─────────────────────────────────────────────────────

const getDeals = asyncHandler(async (req, res) => {
  const result = await dealService.getDeals({
    filters: req.query,
    user: req.user
  });

  return res.status(200).json(
    new ApiResponse(200, "Deals fetched successfully", result)
  );
});

// ─── Get Kanban Deals ──────────────────────────────────────────────────────────

const getKanbanDeals = asyncHandler(async (req, res) => {
  const filters = {
    owner: req.query.owner,
    company: req.query.company,
  };

  const result = await dealService.getKanbanDeals({ filters, user: req.user });

  return res.status(200).json(
    new ApiResponse(200, "Kanban deals fetched successfully", result)
  );
});

// ─── Get Single Deal ───────────────────────────────────────────────────────────

const getDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params;

  const deal = await dealService.getDealById(dealId);

  if (!deal) {
    return res.status(404).json(
      new ApiResponse(404, "Deal not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Deal fetched successfully", deal)
  );
});

// ─── Search Deals (combobox) ───────────────────────────────────────────────────

const searchDeals = asyncHandler(async (req, res) => {
  const search = req.query.q ?? "";
  const limit = parseInt(req.query.limit) || 10;

  const deals = await dealService.searchDeals({ search, limit });

  return res.status(200).json(
    new ApiResponse(200, "Deals fetched successfully", deals)
  );
});

// ─── Update Deal ───────────────────────────────────────────────────────────────

const updateDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params;
  const userId = req.user.id;

  const deal = await dealService.updateDeal({
    dealId,
    data: req.body,
    userId,
  });

  if (!deal) {
    return res.status(404).json(
      new ApiResponse(404, "Deal not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Deal updated successfully", deal)
  );
});

// ─── Move Deal Stage ───────────────────────────────────────────────────────────

const moveDealStage = asyncHandler(async (req, res) => {
  const { dealId } = req.params;
  const user = req.user;
  const { stage, probability, lostReason } = req.body;

  const deal = await dealService.moveDealStage({
    dealId,
    stage,
    probability,
    lostReason,
    user,
  });

  if (!deal) {
    return res.status(404).json(
      new ApiResponse(404, "Deal not found", null)
    );
  }

  const message =
    stage === "closed_won"
      ? "Deal marked as won"
      : stage === "closed_lost"
      ? "Deal marked as lost"
      : "Deal stage updated successfully";

  return res.status(200).json(
    new ApiResponse(200, message, deal)
  );
});

// ─── Delete Deal ───────────────────────────────────────────────────────────────

const deleteDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params;

  const deal = await dealService.deleteDeal(dealId, req.user);

  if (!deal) {
    return res.status(404).json(
      new ApiResponse(404, "Deal not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Deal deleted successfully", null)
  );
});

// ─── Get Pipeline Summary ──────────────────────────────────────────────────────

const getPipelineSummary = asyncHandler(async (req, res) => {
  const user = req.user;

  const summary = await dealService.getPipelineSummary({
    user,
  });

  return res.status(200).json(
    new ApiResponse(200, "Pipeline summary fetched successfully", summary)
  );
});

module.exports = {
  createDeal,
  getDeals,
  getKanbanDeals,
  getDeal,
  searchDeals,
  updateDeal,
  moveDealStage,
  deleteDeal,
  getPipelineSummary,
};