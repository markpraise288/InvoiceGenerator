// modules/search/search.routes.js
const express = require("express");
const authMiddleware = require("../../middlewares/auth.middleware"); 
const {
  globalSearch,
  saveSearch,
  getHistory,
  deleteHistory,
  clearHistory,
} = require("./search.controller");

const router = express.Router();

// 🔍 SEARCH
router.get("/", authMiddleware, globalSearch);

// 💾 SAVE SEARCH
router.post("/history", authMiddleware, saveSearch);

// 🕘 GET HISTORY
router.get("/history", authMiddleware, getHistory);

// ❌ DELETE ONE
router.delete("/history/:id", authMiddleware, deleteHistory);

// 🧹 CLEAR ALL
router.delete("/history", authMiddleware, clearHistory);

module.exports = router;