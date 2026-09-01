const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const customerService = require("./customer.service");
const {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} = require("./customer.validate");

const createCustomer = asyncHandler(async (req, res) => {
  const { error, value } = createCustomerSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, error.details[0].message, null));
  }

  const customer = await customerService.createCustomer(value, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, "Customer created successfully", customer));
});

const getCustomers = asyncHandler(async (req, res) => {
  const { error, value } = listCustomersQuerySchema.validate(req.query);
  if (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await customerService.getCustomers(value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Customers fetched successfully", result));
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, "Customer fetched successfully", customer));
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { error, value } = updateCustomerSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, error.details[0].message, null));
  }

  const customer = await customerService.updateCustomer(req.params.id, value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Customer updated successfully", customer));
});

const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Customer deleted successfully", null));
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};