const {
  createSale,
  getSales,
  getSaleById,
  updateSale,
  deleteSale,
  deleteSalePermanently,
  restoreSale
} = require("./sales.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");

// ==============================
// 🔹 CONTROLLER HANDLERS
// ==============================

const createSaleHandler = asyncHandler(async (req, res) => {
  // Force source to manual for direct API calls
  const sale = await createSale(req.user.id, {
    ...req.body,
    source: "manual",
  });
  res.status(201).json(new ApiResponse(201, "Sale created successfully", sale));
});

const getSalesHandler = asyncHandler(async (req, res) => {
  const sales = await getSales(req.user.id, req.query);
  res.json(new ApiResponse(200, "Sales retrieved successfully", sales));
});

const getSaleByIdHandler = asyncHandler(async (req, res) => {
  const sale = await getSaleById(req.params.id, req.user.id);
  res.json(new ApiResponse(200, "Sale retrieved successfully", sale));
});

const updateSaleHandler = asyncHandler(async (req, res) => {
  const sale = await updateSale(req.params.id, req.user.id, req.body);
  res.json(new ApiResponse(200, "Sale updated successfully", sale));
});

const deleteSaleHandler = asyncHandler(async (req, res) => {
  const result = await deleteSale(req.params.id, req.user.id);
  res.json(new ApiResponse(200, result.message));
});

const deleteSalePermanentlyHandler = asyncHandler(async (req, res) => {
  const result = await deleteSalePermanently(req.params.id, req.user.id);
  res.json(new ApiResponse(200, result.message));
});

const restoreSaleHandler = asyncHandler(async (req, res) => {
  const sale = await restoreSale(req.params.id, req.user.id);
  res.json(new ApiResponse(200, "Sale restored successfully", sale));
});

module.exports = {
  createSaleHandler,
  getSalesHandler,
  getSaleByIdHandler,
  updateSaleHandler,
  deleteSaleHandler,
  deleteSalePermanentlyHandler,
  restoreSaleHandler
};