// modules/search/search.service.js
const Invoice = require("../invoices/invoice.model");
const Customer = require("../customers/customer.model");
const SearchHistory = require("./search.model");

const globalSearch = async (user, query) => {
  const regex = new RegExp(query, "i");

  const [invoices, clients] = await Promise.all([
    Invoice.find({
      workspaceId: user.workspaceId,
      $or: [{ invoiceNumber: regex }, { "clientSnapshot.name": regex }],
    })
      .sort({ createdAt: -1 })
      .limit(5),

    Customer.find({
      workspaceId: user.workspaceId,
      $or: [{ name: regex }, { email: regex }],
    })
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  return [
    ...invoices.map((i) => ({ type: "invoice", data: i })),
    ...clients.map((c) => ({ type: "client", data: c })),
  ];
};

const saveSearch = async (user, query) => {
  return SearchHistory.findOneAndUpdate(
    { userId: user.id, query },
    { query },
    { upsert: true, returnDocument: "after" },
  );
};

const getHistory = async (userId) => {
  return SearchHistory.find({ userId }).sort({ createdAt: -1 }).limit(8);
};

const deleteHistory = async (id) => {
  return SearchHistory.findByIdAndDelete(id);
};

const clearHistory = async (userId) => {
  return SearchHistory.deleteMany({ userId });
};

module.exports = {
  globalSearch,
  saveSearch,
  getHistory,
  deleteHistory,
  clearHistory,
};
