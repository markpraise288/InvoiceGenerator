const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const paymentService = require("./payment.service");
const {
  recordManualPaymentSchema,
  updatePaymentStatusSchema,
  listPaymentsQuerySchema,
} = require("./payment.validate");

const recordManualPayment = asyncHandler(async (req, res) => {
  const { error, value } = recordManualPaymentSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, error.details[0].message, null));
  }

  const payment = await paymentService.recordManualPayment(value, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, "Payment recorded successfully", payment));
});

const getPayments = asyncHandler(async (req, res) => {
  const { error, value } = listPaymentsQuerySchema.validate(req.query);
  if (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await paymentService.getPayments(value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Payments fetched successfully", result));
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment fetched successfully", payment));
});

const getPaymentsByCustomer = asyncHandler(async (req, res) => {
  const payments = await paymentService.getPaymentsByCustomer(req.params.customerId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Customer payments fetched successfully", payments));
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { error, value } = updatePaymentStatusSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, error.details[0].message, null));
  }

  const payment = await paymentService.updatePaymentStatus(
    req.params.id,
    value.status,
    value.notes
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment status updated successfully", payment));
});

const getPaymentSummary = asyncHandler(async (req, res) => {
  const summary = await paymentService.getPaymentSummary(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment summary fetched successfully", summary));
});

module.exports = {
  recordManualPayment,
  getPayments,
  getPaymentById,
  getPaymentsByCustomer,
  updatePaymentStatus,
  getPaymentSummary,
};