const Expense = require("./expense.model");

const createExpense = async (payload, user) => {
  const expense = await Expense.create({
    ...payload,
    workspaceId: user.workspaceId,
    submittedBy: user.id,
  });
  
  return expense;
};

const getExpenses = async (query, user) => {
  const {
    search,
    category,
    status,
    isRecurring,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sortBy = "expenseDate",
    sortOrder = "desc",
  } = query;
  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (isRecurring !== undefined) filter.isRecurring = isRecurring;

  if (dateFrom || dateTo) {
    filter.expenseDate = {};
    if (dateFrom) filter.expenseDate.$gte = new Date(dateFrom);
    if (dateTo) filter.expenseDate.$lte = new Date(dateTo);
  }

  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: "i" } },
      { vendor: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("submittedBy", "name email")
      .populate("approvedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return {
    expenses,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getExpenseById = async (expenseId) => {
  const expense = await Expense.findById(expenseId)
    .populate("submittedBy", "name email")
    .populate("approvedBy", "name email");

  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  return expense;
};

const updateExpense = async (expenseId, payload) => {
  const existing = await Expense.findById(expenseId);
  if (!existing) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  if (existing.status === "approved" || existing.status === "paid") {
    const error = new Error(
      `Cannot edit an expense with status "${existing.status}" — it has already been processed`
    );
    error.statusCode = 400;
    throw error;
  }

  const expense = await Expense.findByIdAndUpdate(
    expenseId,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .populate("submittedBy", "name email")
    .populate("approvedBy", "name email");

  return expense;
};

const approveExpense = async (expenseId, approverId) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  if (expense.status !== "pending") {
    const error = new Error("Only pending expenses can be approved");
    error.statusCode = 400;
    throw error;
  }

  expense.status = "approved";
  expense.approvedBy = approverId;
  expense.approvedAt = new Date();
  expense.rejectionReason = "";
  await expense.save();

  return expense;
};

const rejectExpense = async (expenseId, rejectionReason, approverId) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  if (expense.status !== "pending") {
    const error = new Error("Only pending expenses can be rejected");
    error.statusCode = 400;
    throw error;
  }

  expense.status = "rejected";
  expense.rejectionReason = rejectionReason;
  expense.approvedBy = approverId; // tracks who made the rejection decision, not just approvals
  expense.approvedAt = new Date();
  await expense.save();

  return expense;
};

const markExpensePaid = async (expenseId, paidAt) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  if (expense.status !== "approved") {
    const error = new Error("Only approved expenses can be marked as paid");
    error.statusCode = 400;
    throw error;
  }

  expense.status = "paid";
  await expense.save();

  return expense;
};

const deleteExpense = async (expenseId) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  if (expense.status === "approved" || expense.status === "paid") {
    const error = new Error("Cannot delete an approved or paid expense");
    error.statusCode = 400;
    throw error;
  }

  await Expense.findByIdAndDelete(expenseId);
  return expense;
};

const getExpensesSummary = async (query = {}, user) => {
  const { dateFrom, dateTo } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (dateFrom || dateTo) {
    filter.expenseDate = {};
    if (dateFrom) filter.expenseDate.$gte = new Date(dateFrom);
    if (dateTo) filter.expenseDate.$lte = new Date(dateTo);
  }

  const [statusBreakdown, categoryBreakdown] = await Promise.all([
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { ...filter, status: { $in: ["approved", "paid"] } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const summary = {
    totalPending: 0,
    totalApproved: 0,
    totalPaid: 0,
    totalRejected: 0,
    byCategory: {},
  };

  statusBreakdown.forEach((s) => {
    if (s._id === "pending") summary.totalPending = s.total;
    if (s._id === "approved") summary.totalApproved = s.total;
    if (s._id === "paid") summary.totalPaid = s.total;
    if (s._id === "rejected") summary.totalRejected = s.total;
  });

  categoryBreakdown.forEach((c) => {
    summary.byCategory[c._id] = c.total;
  });

  return summary;
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  deleteExpense,
  getExpensesSummary,
};