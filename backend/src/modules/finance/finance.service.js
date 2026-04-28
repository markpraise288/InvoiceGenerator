const mongoose = require("mongoose");
const Sale = require("../sales/sales.model");
const Expense = require("../expense/expense.model");
const { valid } = require("joi");

const { Types } = mongoose;

// ==============================
// 🔹 HELPERS
// ==============================
const buildDateFilter = (query = {}) => {
  const { startDate, endDate } = query;

  if (!startDate && !endDate) return {};

  const filter = {};

  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);

  return { date: filter };
};

const toObjectId = (id) => new Types.ObjectId(id);

// ==============================
// 🔹 FINANCE SUMMARY
// ==============================
const getFinanceSummary = async (userId, query) => {
  const match = {
    userId: toObjectId(userId),
    ...buildDateFilter(query),
  };

  const [salesAgg, expenseAgg] = await Promise.all([
    Sale.aggregate([
      { $match: { ...match, status: "paid" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { ...match, isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalRevenue = salesAgg[0]?.total || 0;
  const totalExpenses = expenseAgg[0]?.total || 0;
  const netProfit = totalRevenue - totalExpenses;

  const monthlyBreakdown = await getMonthlyBreakdown(userId, query);

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    monthlyBreakdown,
    summary: {
      revenueCount: salesAgg[0]?.count || 0,
      expenseCount: expenseAgg[0]?.count || 0,
      profitMargin:
        totalRevenue > 0
          ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
          : 0,
      trend: {
        value: monthlyBreakdown.length
          ? monthlyBreakdown[monthlyBreakdown.length - 1].profit -
            monthlyBreakdown[0].profit
          : 0,
        percentage:
          monthlyBreakdown.length && monthlyBreakdown[0].profit !== 0
            ? Number(
                (
                  ((monthlyBreakdown[monthlyBreakdown.length - 1].profit -
                    monthlyBreakdown[0].profit) /
                    Math.abs(monthlyBreakdown[0].profit)) *
                  100
                ).toFixed(2)
              )
            : 0,
      }
    },
  };
};

// ==============================
// 🔹 MONTHLY BREAKDOWN (OPTIMIZED)
// ==============================
const getMonthlyBreakdown = async (userId, query = {}) => {
  const match = {
    userId: toObjectId(userId),
    ...buildDateFilter(query),
  };

  // 🔥 Single pipeline using $facet (VERY IMPORTANT)
  const result = await Sale.aggregate([
    {
      $match: { ...match, status: "paid" },
    },
    {
      $facet: {
        sales: [
          {
            $group: {
              _id: {
                year: { $year: "$date" },
                month: { $month: "$date" },
              },
              revenue: { $sum: "$amount" },
            },
          },
        ],
        expenses: [
          {
            $lookup: {
              from: "expenses",
              pipeline: [
                {
                  $match: {
                    userId: match.userId,
                    isDeleted: false,
                    ...(match.date && { date: match.date }),
                  },
                },
                {
                  $group: {
                    _id: {
                      year: { $year: "$date" },
                      month: { $month: "$date" },
                    },
                    expenses: { $sum: "$amount" },
                  },
                },
              ],
              as: "expenseData",
            },
          },
        ],
      },
    },
  ]);

  const sales = result[0]?.sales || [];

  // fallback for expenses (simpler & safer)
  const expenses = await Expense.aggregate([
    {
      $match: { ...match, isDeleted: false },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        expenses: { $sum: "$amount" },
      },
    },
  ]);

  const map = {};

  sales.forEach((s) => {
    const key = `${s._id.year}-${s._id.month}`;
    map[key] = {
      year: s._id.year,
      month: s._id.month,
      revenue: s.revenue,
      expenses: 0,
    };
  });

  expenses.forEach((e) => {
    const key = `${e._id.year}-${e._id.month}`;
    if (!map[key]) {
      map[key] = {
        year: e._id.year,
        month: e._id.month,
        revenue: 0,
        expenses: e.expenses,
      };
    } else {
      map[key].expenses = e.expenses;
    }
  });

  return Object.values(map)
    .map((m) => ({
      ...m,
      profit: m.revenue - m.expenses,
    }))
    .sort((a, b) => a.year - b.year || a.month - b.month);
};

// ==============================
// 🔹 EXPENSE BREAKDOWN
// ==============================
const getExpenseBreakdown = async (userId, query) => {
  const match = {
    userId: toObjectId(userId),
    isDeleted: false,
    ...buildDateFilter(query),
  };

  const breakdown = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        avg: { $avg: "$amount" },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const totalExpenses = breakdown.reduce((sum, i) => sum + i.total, 0);

  return {
    totalExpenses,
    categories: breakdown.map((i) => ({
      category: i._id,
      total: i.total,
      count: i.count,
      average: Number(i.avg.toFixed(2)),
      percentage:
        totalExpenses > 0
          ? Number(((i.total / totalExpenses) * 100).toFixed(2))
          : 0,
    })),
  };
};

// ==============================
// 🔹 CASH FLOW
// ==============================
const getCashFlow = async (userId, limit = 20) => {
  const [sales, expenses] = await Promise.all([
    Sale.find({ userId, status: "paid" })
      .sort({ date: -1 })
      .limit(limit)
      .lean(),
    Expense.find({ userId, isDeleted: false })
      .sort({ date: -1 })
      .limit(limit)
      .lean(),
  ]);

  const transactions = [
    ...sales.map((s) => ({
      type: "income",
      amount: s.amount,
      date: s.date,
      description:
        s.source === "invoice" ? "Invoice Payment" : "Manual Sale",
    })),
    ...expenses.map((e) => ({
      type: "expense",
      amount: e.amount,
      date: e.date,
      description: e.title,
    })),
  ];

  return transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

module.exports = {
  getFinanceSummary,
  getMonthlyBreakdown,
  getExpenseBreakdown,
  getCashFlow,
};