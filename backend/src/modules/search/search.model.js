// modules/search/search.model.js
const mongoose = require("mongoose");

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const SearchHistory =
  mongoose.models.SearchHistory ||
  mongoose.model("SearchHistory", searchHistorySchema);

module.exports = SearchHistory;