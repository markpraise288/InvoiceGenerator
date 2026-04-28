// modules/search/search.service.js
const Invoice = require("../invoices/invoice.model");
const Client = require("../client/client.model");
const SearchHistory = require("./search.model");

const globalSearch = async (userId, query) => {
  const regex = new RegExp(query, "i");

  const [invoices, clients] = await Promise.all([
    Invoice.find({
      userId: userId,
      $or: [{ invoiceNumber: regex }, { "clientSnapshot.name": regex }],
    })
      .sort({ createdAt: -1 })
      .limit(5),

    Client.find({
      userId: userId,
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

const saveSearch = async (userId, query) => {
  return SearchHistory.findOneAndUpdate(
    { userId, query },
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
