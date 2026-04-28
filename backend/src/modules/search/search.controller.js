// modules/search/search.controller.js
const searchService = require("./search.service");

// 🔍 GLOBAL SEARCH
const globalSearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q) {
      return res.json({ invoices: [], clients: [] });
    }

    const result = await searchService.globalSearch(userId, q);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

// 💾 SAVE SEARCH
const saveSearch = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    await searchService.saveSearch(userId, query);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Save failed" });
  }
};

// 🕘 GET HISTORY
const getHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const history = await searchService.getHistory(userId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

// ❌ DELETE ONE
const deleteHistory = async (req, res) => {
  try {
    await searchService.deleteHistory(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
};

// 🧹 CLEAR ALL
const clearHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    await searchService.clearHistory(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Clear failed" });
  }
};

module.exports = {
  globalSearch,
  saveSearch,
  getHistory,
  deleteHistory,
  clearHistory,
};