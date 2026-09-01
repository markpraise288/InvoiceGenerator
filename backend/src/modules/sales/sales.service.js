const mongoose = require("mongoose");
const Sale = require("./sales.model");
const Customer = require("../customers/customer.model");
const Payment = require("../payments/payment.model");

// ---------- COMPUTATION HELPERS ----------

// Recomputes every line item's total and the sale's subtotal/total from raw
// input — this is the ONLY place sale math happens. Never trust a client-
// submitted total; always derive it here.
const computeSaleAmounts = (lineItems, discount = 0, tax = 0) => {
  const computedLineItems = lineItems.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  const subtotal = computedLineItems.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount + tax);

  return { lineItems: computedLineItems, subtotal, total };
};

// Generates a sequential, human-readable sale number (SALE-0001, SALE-0002, ...).
// Uses a count-based approach rather than a separate counter collection —
// acceptable for moderate volume; see note below on the race-condition tradeoff.
const generateSaleNumber = async () => {
  const count = await Sale.countDocuments();
  const next = count + 1;
  return `SALE-${String(next).padStart(4, "0")}`;
};

// ---------- CRUD ----------

const createSale = async (payload, user) => {
  const { customer, lineItems, discount = 0, tax = 0, ...rest } = payload;

  const customerDoc = await Customer.findById(customer);
  if (!customerDoc) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  const { lineItems: computedItems, subtotal, total } = computeSaleAmounts(
    lineItems,
    discount,
    tax
  );

  const saleNumber = await generateSaleNumber();

  const sale = await Sale.create({
    ...rest,
    customer,
    saleNumber,
    lineItems: computedItems,
    subtotal,
    discount,
    tax,
    total,
    createdBy: user.id,
    owner: payload.owner || user.id,
    workspaceId: user.workspaceId
  });

  return sale;
};

// Search-by-customer-name requires resolving customer IDs first (Sale only
// stores a ref, not a searchable name) — two-step rather than a full
// aggregation pipeline, simpler to read and reason about at this data volume.
const resolveCustomerSearchIds = async (search) => {
  const matchingCustomers = await Customer.find({
    name: { $regex: search, $options: "i" },
  })
    .select("_id")
    .lean();
  return matchingCustomers.map((c) => c._id);
};

const getSales = async (query, user) => {
  const {
    search,
    customer,
    status,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sortBy = "saleDate",
    sortOrder = "desc",
  } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId
  if (customer) filter.customer = customer;
  if (status) filter.status = status;

  if (dateFrom || dateTo) {
    filter.saleDate = {};
    if (dateFrom) filter.saleDate.$gte = new Date(dateFrom);
    if (dateTo) filter.saleDate.$lte = new Date(dateTo);
  }

  if (search) {
    const customerIds = await resolveCustomerSearchIds(search);
    filter.$or = [
      { saleNumber: { $regex: search, $options: "i" } },
      ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("customer", "name email")
      .populate("owner", "name email")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Sale.countDocuments(filter),
  ]);

  return {
    sales,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getSaleById = async (saleId) => {
  const sale = await Sale.findById(saleId)
    .populate("customer", "name email")
    .populate("owner", "name email")
    .populate("createdBy", "name email");

  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  // Amount paid = sum of completed Payments for this sale's customer, scoped
  // to a window around the sale's creation (see note below on this being an
  // approximation, same caveat as the Projects budget-vs-spent feature).
  const paymentAgg = await Payment.aggregate([
    {
      $match: {
        customer: sale.customer._id,
        status: "completed",
        createdAt: { $gte: sale.createdAt },
      },
    },
    { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
  ]);

  const amountPaid = paymentAgg[0]?.totalPaid || 0;

  return {
    ...sale.toObject(),
    amountPaid,
    amountDue: Math.max(0, sale.total - amountPaid),
  };
};

const updateSale = async (saleId, payload) => {
  const existing = await Sale.findById(saleId);
  if (!existing) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  if (existing.status === "paid" || existing.status === "refunded") {
    const error = new Error(
      `Cannot edit a sale with status "${existing.status}" — its financial record is final`
    );
    error.statusCode = 400;
    throw error;
  }

  const updatePayload = { ...payload };

  if (payload.lineItems) {
    const discount = payload.discount ?? existing.discount;
    const tax = payload.tax ?? existing.tax;
    const { lineItems: computedItems, subtotal, total } = computeSaleAmounts(
      payload.lineItems,
      discount,
      tax
    );
    updatePayload.lineItems = computedItems;
    updatePayload.subtotal = subtotal;
    updatePayload.total = total;
  } else if (payload.discount !== undefined || payload.tax !== undefined) {
    // Discount/tax changed without line items changing — recompute total
    // from existing line items rather than requiring the client to resend them.
    const discount = payload.discount ?? existing.discount;
    const tax = payload.tax ?? existing.tax;
    updatePayload.total = Math.max(0, existing.subtotal - discount + tax);
  }

  const sale = await Sale.findByIdAndUpdate(
    saleId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).populate("customer", "name email");

  return sale;
};

const updateSaleStatus = async (saleId, status) => {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  sale.status = status;
  await sale.save();
  return sale;
};

const deleteSale = async (saleId) => {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  if (sale.status === "paid") {
    const error = new Error("Cannot delete a paid sale — cancel or refund it instead");
    error.statusCode = 400;
    throw error;
  }

  await Sale.findByIdAndDelete(saleId);
  return sale;
};

const getSalesSummary = async (query = {}, user) => {
  const { dateFrom, dateTo } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (dateFrom || dateTo) {
    filter.saleDate = {};
    if (dateFrom) filter.saleDate.$gte = new Date(dateFrom);
    if (dateTo) filter.saleDate.$lte = new Date(dateTo);
  }

  const results = await Sale.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        total: { $sum: "$total" },
      },
    },
  ]);

  const summary = {
    totalRevenue: 0, // paid sales only
    pendingRevenue: 0, // pending sales
    totalSalesCount: 0,
    byStatus: {},
  };

  results.forEach((r) => {
    summary.byStatus[r._id] = { count: r.count, total: r.total };
    summary.totalSalesCount += r.count;
    if (r._id === "paid") summary.totalRevenue += r.total;
    if (r._id === "pending") summary.pendingRevenue += r.total;
  });

  return summary;
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  updateSale,
  updateSaleStatus,
  deleteSale,
  getSalesSummary,
};