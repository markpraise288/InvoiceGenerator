const Budget = require("./budget.model");
const Sale = require("../sales/sales.model");
const Expense = require("../expense/expense.model");
const Payment = require("../payments/payment.model");

// ---------- BUDGET CRUD ----------

// Checks whether a proposed date range overlaps any existing budget in the
// same category. This is the real overlap-prevention logic the model's
// comment flagged as not being enforceable via a schema index alone.
const checkBudgetOverlap = async (category, periodStart, periodEnd, excludeBudgetId = null) => {
  const filter = {
    category,
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart },
  };
  if (excludeBudgetId) {
    filter._id = { $ne: excludeBudgetId };
  }

  const overlapping = await Budget.findOne(filter);
  return overlapping;
};

const createBudget = async (payload, user) => {
  const { category, periodStart, periodEnd } = payload;

  const overlap = await checkBudgetOverlap(category, periodStart, periodEnd);
  if (overlap) {
    const error = new Error(
      `A budget for "${category}" already exists covering an overlapping period`
    );
    error.statusCode = 400;
    throw error;
  }

  const budget = await Budget.create({ ...payload, createdBy: user.id, workspaceId: user.workspaceId });
  return budget;
};

const getBudgets = async (query, user) => {
  const { category, period, activeOnly, page = 1, limit = 20 } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (category) filter.category = category;
  if (period) filter.period = period;
  if (activeOnly) {
    const now = new Date();
    filter.periodStart = { $lte: now };
    filter.periodEnd = { $gte: now };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [budgets, total] = await Promise.all([
    Budget.find(filter).sort({ periodStart: -1 }).skip(skip).limit(Number(limit)).lean(),
    Budget.countDocuments(filter),
  ]);

  return {
    budgets,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  };
};

const updateBudget = async (budgetId, payload) => {
  const existing = await Budget.findById(budgetId);
  if (!existing) {
    const error = new Error("Budget not found");
    error.statusCode = 404;
    throw error;
  }

  const nextPeriodStart = payload.periodStart ?? existing.periodStart;
  const nextPeriodEnd = payload.periodEnd ?? existing.periodEnd;

  // Second consistency check flagged in finance.validate.js's notes — Joi
  // only validates the two fields against each other when BOTH are present
  // in the request; here we check the merged result against what's actually
  // being stored, covering the case where only one of the two was changed.
  if (nextPeriodEnd <= nextPeriodStart) {
    const error = new Error("periodEnd must be after periodStart");
    error.statusCode = 400;
    throw error;
  }

  if (payload.periodStart || payload.periodEnd) {
    const overlap = await checkBudgetOverlap(
      existing.category,
      nextPeriodStart,
      nextPeriodEnd,
      budgetId
    );
    if (overlap) {
      const error = new Error(
        `Updating this budget's period would overlap another budget for "${existing.category}"`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const budget = await Budget.findByIdAndUpdate(
    budgetId,
    { $set: payload },
    { new: true, runValidators: true }
  );

  return budget;
};

const deleteBudget = async (budgetId) => {
  const budget = await Budget.findByIdAndDelete(budgetId);
  if (!budget) {
    const error = new Error("Budget not found");
    error.statusCode = 404;
    throw error;
  }
  return budget;
};

// ---------- PROFIT & LOSS ----------

// Groups by calendar unit for time-series charting. Uses Mongo's $dateTrunc
// (available MongoDB 5.0+) rather than manual $year/$month grouping, since
// it handles "day"/"week"/"month" uniformly without three separate code paths.
const getDateTruncUnit = (groupBy) => {
  if (groupBy === "day") return "day";
  if (groupBy === "week") return "week";
  return "month";
};

const getProfitAndLoss = async (query, user) => {
  const { dateFrom, dateTo, groupBy = "month" } = query;
  const unit = getDateTruncUnit(groupBy);

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const [revenueByPeriod, expensesByPeriod, revenueTotal, expensesTotal] = await Promise.all([
    // Revenue = paid Sales only (matches sale.service.js's own "totalRevenue" definition)
    Sale.aggregate([
      { $match: { status: "paid", workspaceId: user.workspaceId, saleDate: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateTrunc: { date: "$saleDate", unit } },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Expenses = approved + paid only (matches expense.service.js's own category-breakdown definition)
    Expense.aggregate([
      {
        $match: {
          workspaceId: user.workspaceId,
          status: { $in: ["approved", "paid"] },
          expenseDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$expenseDate", unit } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: { status: "paid", saleDate: { $gte: from, $lte: to }, workspaceId: user.workspaceId } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Expense.aggregate([
      { $match: { status: { $in: ["approved", "paid"] }, expenseDate: { $gte: from, $lte: to }, workspaceId: user.workspaceId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  // Merge revenue and expense time series into one aligned array by period key
  const periodMap = {};
  revenueByPeriod.forEach((r) => {
    const key = r._id.toISOString();
    periodMap[key] = { period: key, revenue: r.total, expenses: 0 };
  });
  expensesByPeriod.forEach((e) => {
    const key = e._id.toISOString();
    if (!periodMap[key]) periodMap[key] = { period: key, revenue: 0, expenses: 0 };
    periodMap[key].expenses = e.total;
  });

  const series = Object.values(periodMap)
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
    .map((p) => ({ ...p, profit: p.revenue - p.expenses }));

  const totalRevenue = revenueTotal[0]?.total || 0;
  const totalExpenses = expensesTotal[0]?.total || 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
    series,
  };
};

// ---------- CASH FLOW ----------

// Cash flow differs from P&L deliberately: P&L uses Sale/Expense records
// (accrual-style — "paid" status means committed, not necessarily cash-in-hand
// yet). Cash flow uses actual Payment records (money that has genuinely moved)
// for the "in" side, and Expense.status === "paid" for the "out" side, since
// that's the closest proxy to actual cash leaving without a dedicated
// expense-payment-tracking model.
const getCashFlow = async (query, user) => {
  const { dateFrom, dateTo, groupBy = "month" } = query;
  const unit = getDateTruncUnit(groupBy);

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const [cashInByPeriod, cashOutByPeriod] = await Promise.all([
    Payment.aggregate([
      { $match: { status: "completed", paidAt: { $gte: from, $lte: to }, workspaceId: user.workspaceId } },
      {
        $group: {
          _id: { $dateTrunc: { date: "$paidAt", unit } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate([
      { $match: { status: "paid", expenseDate: { $gte: from, $lte: to }, workspaceId: user.workspaceId } },
      {
        $group: {
          _id: { $dateTrunc: { date: "$expenseDate", unit } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const periodMap = {};
  cashInByPeriod.forEach((r) => {
    const key = r._id.toISOString();
    periodMap[key] = { period: key, cashIn: r.total, cashOut: 0 };
  });
  cashOutByPeriod.forEach((e) => {
    const key = e._id.toISOString();
    if (!periodMap[key]) periodMap[key] = { period: key, cashIn: 0, cashOut: 0 };
    periodMap[key].cashOut = e.total;
  });

  const series = Object.values(periodMap)
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
    .map((p) => ({ ...p, netCashFlow: p.cashIn - p.cashOut }));

  const totalCashIn = series.reduce((sum, p) => sum + p.cashIn, 0);
  const totalCashOut = series.reduce((sum, p) => sum + p.cashOut, 0);

  return {
    totalCashIn,
    totalCashOut,
    netCashFlow: totalCashIn - totalCashOut,
    series,
  };
};

// ---------- BUDGET VS ACTUAL ----------

const getBudgetVsActual = async (query, user) => {
  const now = new Date();
  const periodStart = query.periodStart ? new Date(query.periodStart) : null;
  const periodEnd = query.periodEnd ? new Date(query.periodEnd) : null;

  const budgetFilter = periodStart && periodEnd
    ? { periodStart: { $lte: periodEnd }, periodEnd: { $gte: periodStart } }
    : { periodStart: { $lte: now }, periodEnd: { $gte: now } }; // default: currently active budgets

  const budgets = await Budget.find(budgetFilter).lean();

  const results = await Promise.all(
    budgets.map(async (budget) => {
      const spentAgg = await Expense.aggregate([
        {
          $match: {
            category: budget.category,
            status: { $in: ["approved", "paid"] },
            expenseDate: { $gte: budget.periodStart, $lte: budget.periodEnd },
            workspaceId: user.workspaceId
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const spent = spentAgg[0]?.total || 0;
      const remaining = budget.limit - spent;
      const percentUsed = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentUsed,
        isOverBudget: spent > budget.limit,
      };
    })
  );

  return results;
};

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getProfitAndLoss,
  getCashFlow,
  getBudgetVsActual,
};