const Payment = require("./payment.model");
const customerService = require("../customers/customer.service");

const recordManualPayment = async (payload, user) => {
  const status = payload.status || "completed";

  const payment = await Payment.create({
    ...payload,
    status,
    paidAt: payload.paidAt || (status === "completed" ? new Date() : null),
    createdBy: user.id,
    workspaceId: user.workspaceId,
  });

  if (status === "completed") {
    // amount is in cents -> convert to dollars for Customer.totalRevenue
    await customerService.adjustRevenue(payload.customer, payment.amount / 100);
  }

  return payment;
};

const getPayments = async (query, user) => {
  const {
    customer,
    status,
    method,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (method) filter.method = method;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("customer", "name email")
      .populate("invoice", "number")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate("customer", "name email")
    .populate("invoice", "number");

  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }

  return payment;
};

const getPaymentsByCustomer = async (customerId) => {
  return Payment.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .lean();
};

// Handles status transitions including refund logic — the single source of
// truth for keeping Customer.totalRevenue consistent no matter how status changes.
const updatePaymentStatus = async (paymentId, newStatus, notes) => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }

  const previousStatus = payment.status;

  if (previousStatus === newStatus) {
    if (notes !== undefined) payment.notes = notes;
    await payment.save();
    return payment;
  }

  const wasCompleted = previousStatus === "completed";
  const willBeCompleted = newStatus === "completed";

  payment.status = newStatus;
  if (notes !== undefined) payment.notes = notes;
  if (newStatus === "completed" && !payment.paidAt) {
    payment.paidAt = new Date();
  }

  await payment.save();

  // Revenue reconciliation: only adjust when completed-state actually changes
  if (!wasCompleted && willBeCompleted) {
    await customerService.adjustRevenue(payment.customer, payment.amount / 100);
  } else if (wasCompleted && !willBeCompleted) {
    // covers both "failed" and "refunded" transitions away from completed
    await customerService.adjustRevenue(payment.customer, -(payment.amount / 100));
  }

  return payment;
};

const getPaymentSummary = async (query = {}, user) => {
  const { customer, dateFrom, dateTo } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId
  if (customer) filter.customer = customer;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const results = await Payment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$status",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    totalCollected: 0,
    totalPending: 0,
    totalFailed: 0,
    totalRefunded: 0,
    countCollected: 0,
    countPending: 0,
    countFailed: 0,
    countRefunded: 0,
  };

  const keyMap = {
    completed: ["totalCollected", "countCollected"],
    pending: ["totalPending", "countPending"],
    failed: ["totalFailed", "countFailed"],
    refunded: ["totalRefunded", "countRefunded"],
  };

  results.forEach((r) => {
    const keys = keyMap[r._id];
    if (keys) {
      summary[keys[0]] = r.total;
      summary[keys[1]] = r.count;
    }
  });

  return summary;
};

// Used internally by billing.service.js when a PayPal order is captured or a
// webhook event fires — creates or updates the payment record tied to a PayPal order.
const findByPayPalOrderId = async (orderId) => {
  return Payment.findOne({ paypalOrderId: orderId });
};

module.exports = {
  recordManualPayment,
  getPayments,
  getPaymentById,
  getPaymentsByCustomer,
  updatePaymentStatus,
  getPaymentSummary,
  findByPayPalOrderId,
};