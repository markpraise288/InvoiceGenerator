const Sale = require("./sales.model");
const ApiError = require("../../utils/ApiError");

// ==============================
// 🔹 CREATE SALE
// ==============================
const createSale = async (userId, saleData) => {
  const sale = await Sale.create({
    ...saleData,
    userId,
  });
  return sale;
};

// ==============================
// 🔹 CREATE SALE FROM INVOICE (AUTOMATED)
// ==============================
const createSaleFromInvoice = async (invoice) => {
  // Only create sale if invoice is paid
  if (invoice.status !== "paid") {
    return null;
  }

  // Check if sale already exists for this invoice
  const existingSale = await Sale.findOne({
    invoiceId: invoice._id,
    userId: invoice.userId,
  });

  if (existingSale) {
    return existingSale;
  }

  // Create sale record
  console.log(`Creating sale from invoice #${invoice.invoiceNumber} for user ${invoice.userId}`);
  const sale = await Sale.create({
    userId: invoice.userId,
    source: "invoice",
    invoiceId: invoice._id,
    clientId: invoice.clientId,
    client: invoice.clientSnapshot.name,
    amount: invoice.totalPaid || invoice.total,
    status: "paid",
    date: invoice.paidAt || new Date(),
    notes: `Payment from invoice #${invoice.invoiceNumber}`,
  });

  return sale;
};

// ==============================
// 🔹 GET SALES WITH FILTERS & PAGINATION
// ==============================
const getSales = async (userId, query) => {
  const {
    status,
    source,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = "date",
    sortOrder = -1,
  } = query;

  // Build filter
  const filter = { userId };

  if (status) {
    filter.status = status;
  }

  if (source) {
    filter.source = source;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder };

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("clientId", "name email")
      .lean(),
    Sale.countDocuments(filter),
  ]);

  return {
    data: sales,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
};

// ==============================
// 🔹 GET SALE BY ID
// ==============================
const getSaleById = async (id, userId) => {
  const sale = await Sale.findOne({
    _id: id,
    userId,
  })
    .populate("clientId", "name email phone")
    .lean();

  if (!sale) {
    throw new ApiError(404, "Sale not found");
  }

  return sale;
};

// ==============================
// 🔹 UPDATE SALE (MANUAL ONLY)
// ==============================
const updateSale = async (id, userId, updateData) => {
  // Prevent updating automated sales from invoices
  const existingSale = await Sale.findOne({
    _id: id,
    userId,
  });

  if (!existingSale) {
    throw new ApiError(404, "Sale not found");
  }

  if (existingSale.source === "invoice") {
    throw new ApiError(400, "Cannot update sales generated from invoices");
  }

  const sale = await Sale.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  return sale;
};

// ==============================
// 🔹 DELETE SALE (MANUAL ONLY)
// ==============================
const deleteSale = async (id, userId) => {
  const sale = await Sale.findOne({
    _id: id,
    userId,
  });

  if (!sale) {
    throw new ApiError(404, "Sale not found");
  }

  if (sale.source === "invoice") {
    throw new ApiError(400, "Cannot delete sales generated from invoices");
  }

  // Soft delete by setting isDeleted flag
  sale.isDeleted = true;
  await sale.save();
  return { message: "Sale deleted successfully" };
};

const deleteSalePermanently = async (id, userId) => {
  const sale = await Sale.findOne({
    _id: id,
    userId,
  });

  if (!sale) {
    throw new ApiError(404, "Sale not found");
  }

  if (sale.source === "invoice") {
    throw new ApiError(400, "Cannot delete sales generated from invoices");
  }

  await Sale.deleteOne({ _id: id, userId });
  return { message: "Sale permanently deleted" };
};

const restoreSale = async (id, userId) => {
  const sale = await Sale.findOne({
    _id: id,
    userId,
    isDeleted: true,
  });

  if (!sale) {
    throw new ApiError(404, "Sale not found or not deleted");
  }

  sale.isDeleted = false;
  await sale.save();
  return sale;
};

module.exports = {
  createSale,
  createSaleFromInvoice,
  getSales,
  getSaleById,
  updateSale,
  deleteSale,
  deleteSalePermanently,
  restoreSale
};