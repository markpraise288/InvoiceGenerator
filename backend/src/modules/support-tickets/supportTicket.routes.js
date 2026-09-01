const express = require("express");
const {
  uploadMiddleware,
  createTicket,
  listMyTickets,
  getMyTicket,
  addUserMessage,
} = require("./supportTicket.controller");
const verifyToken = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(verifyToken);

router.post("/", uploadMiddleware, createTicket);
router.get("/", listMyTickets);
router.get("/:id", getMyTicket);
router.post("/:id/messages", uploadMiddleware, addUserMessage);

module.exports = router;