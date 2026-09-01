const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const saleService = require("./sales.service");
const {
  createSaleSchema,
  updateSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
} = require("./sales.validation");

const createSale = asyncHandler(async (req, res) => {
  const { error, value } = createSaleSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const sale = await saleService.createSale(value, req.user);
  return res.status(201).json(new ApiResponse(201, "Sale created successfully", sale));
});

const getSales = asyncHandler(async (req, res) => {
  const { error, value } = listSalesQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await saleService.getSales(value, req.user);
  return res.status(200).json(new ApiResponse(200, "Sales fetched successfully", result));
});

const getSalesSummary = asyncHandler(async (req, res) => {
  const summary = await saleService.getSalesSummary(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, "Sales summary fetched successfully", summary));
});

const getSaleById = asyncHandler(async (req, res) => {
  const sale = await saleService.getSaleById(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Sale fetched successfully", sale));
});

const updateSale = asyncHandler(async (req, res) => {
  const { error, value } = updateSaleSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const sale = await saleService.updateSale(req.params.id, value);
  return res.status(200).json(new ApiResponse(200, "Sale updated successfully", sale));
});

const updateSaleStatus = asyncHandler(async (req, res) => {
  const { error, value } = updateSaleStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const sale = await saleService.updateSaleStatus(req.params.id, value.status);
  return res.status(200).json(new ApiResponse(200, "Sale status updated successfully", sale));
});

const deleteSale = asyncHandler(async (req, res) => {
  await saleService.deleteSale(req.params.id);
  return res.status(200).json(new ApiResponse(200, "Sale deleted successfully", null));
});

module.exports = {
  createSale,
  getSales,
  getSalesSummary,
  getSaleById,
  updateSale,
  updateSaleStatus,
  deleteSale,
};