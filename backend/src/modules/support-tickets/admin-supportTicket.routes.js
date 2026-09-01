const express = require("express");
const {
  uploadMiddleware,
  listAllTickets,
  getTicketStats,
  getTicket,
  addAdminMessage,
  updateStatus,
} = require("./admin-supportTicket.controller");
const verifyToken = require("../../middlewares/auth.middleware");
const requireSuperAdmin = require("../../middlewares/requireSuperAdmin.middleware");

const router = express.Router();

router.use(verifyToken);
router.use(requireSuperAdmin);

router.get("/stats", getTicketStats);
router.get("/", listAllTickets);
router.get("/:id", getTicket);
router.post("/:id/messages", uploadMiddleware, addAdminMessage);
router.patch("/:id/status", updateStatus);

module.exports = router;