const Expense = require("./expense.model");
const ApiError = require("../../utils/ApiError");

// ==============================
// 🔹 CREATE EXPENSE
// ==============================
const createExpense = async (userId, expenseData) => {
  const expense = await Expense.create({
    ...expenseData,
    userId,
  });
  return expense;
};

// ==============================
// 🔹 GET EXPENSES WITH FILTERS & PAGINATION
// ==============================
const getExpenses = async (userId, query) => {
  const {
    category,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = "date",
    sortOrder = -1,
  } = query;

  // Build filter
  const filter = { userId };

  if (category) {
    filter.category = category;
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

  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    Expense.countDocuments(filter),
  ]);

  return {
    data: expenses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
};

// ==============================
// 🔹 GET EXPENSE BY ID
// ==============================
const getExpenseById = async (id, userId) => {
  const expense = await Expense.findOne({
    _id: id,
    userId,
    isDeleted: false,
  }).lean();

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  return expense;
};

// ==============================
// 🔹 UPDATE EXPENSE
// ==============================
const updateExpense = async (id, userId, updateData) => {
  const expense = await Expense.findOneAndUpdate(
    {
      _id: id,
      userId,
      isDeleted: false,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  return expense;
};

// ==============================
// 🔹 DELETE EXPENSE (SOFT DELETE)
// ==============================
const deleteExpense = async (id, userId) => {
  const expense = await Expense.findOneAndUpdate(
    {
      _id: id,
      userId,
      isDeleted: false,
    },
    { isDeleted: true },
    {
      new: true,
    }
  );

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  return expense;
};

// ==============================
// 🔹 DELETE EXPENSE PERMANENTLY
// ==============================
const deleteExpensePermanently = async (id, userId) => {
  const result = await Expense.deleteOne({
    _id: id,
    userId,
  });

  if (result.deletedCount === 0) {
    throw new ApiError(404, "Expense not found");
  }

  return { message: "Expense permanently deleted successfully" };
};

const restoreExpense = async (id, userId) => {
  const expense = await Expense.findOneAndUpdate(
    {
      _id: id,
      userId,
      isDeleted: true,
    },
    { isDeleted: false },
    {
      new: true,
    }
  );

  if (!expense) {
    throw new ApiError(404, "Expense not found or not deleted");
  }

  return expense;
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  deleteExpensePermanently,
  restoreExpense
};