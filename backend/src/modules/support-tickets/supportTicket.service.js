const SupportTicket = require("./supportTicket.model");
const SupportMessage = require("./supportMessage.model");

const CATEGORIES = ["bug", "billing", "feature_request", "account", "other"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

// ─── User-facing ─────────────────────────────────────────────────────────────

const createTicket = async ({ userId, workspaceId, category, subject, body, attachments }) => {
  if (!CATEGORIES.includes(category)) {
    const error = new Error("Invalid category");
    error.statusCode = 400;
    throw error;
  }

  if (!subject?.trim()) {
    const error = new Error("Subject is required");
    error.statusCode = 400;
    throw error;
  }

  if (!body?.trim() && (!attachments || attachments.length === 0)) {
    const error = new Error("A message or attachment is required");
    error.statusCode = 400;
    throw error;
  }

  const ticket = await SupportTicket.create({
    userId,
    workspaceId,
    category,
    subject: subject.trim(),
    status: "open",
    lastMessageAt: new Date(),
    lastMessagePreview: body?.trim().slice(0, 200) || "[Attachment]",
    adminUnreadCount: 1,
    userUnreadCount: 0,
  });

  const message = await SupportMessage.create({
    ticketId: ticket._id,
    senderId: userId,
    senderRole: "user",
    body: body?.trim() || "",
    attachments: attachments || [],
  });

  return { ticket, message };
};

const listMyTickets = async ({ userId }) => {
  return SupportTicket.find({ userId }).sort({ lastMessageAt: -1 });
};

const getMyTicket = async ({ ticketId, userId }) => {
  const ticket = await SupportTicket.findOne({ _id: ticketId, userId });
  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  const messages = await SupportMessage.find({ ticketId }).sort({ createdAt: 1 });

  // Viewing the thread marks any admin replies as read
  if (ticket.userUnreadCount > 0) {
    ticket.userUnreadCount = 0;
    await ticket.save();
  }

  return { ticket, messages };
};

const addUserMessage = async ({ ticketId, userId, body, attachments }) => {
  const ticket = await SupportTicket.findOne({ _id: ticketId, userId });
  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (!body?.trim() && (!attachments || attachments.length === 0)) {
    const error = new Error("A message or attachment is required");
    error.statusCode = 400;
    throw error;
  }

  const message = await SupportMessage.create({
    ticketId,
    senderId: userId,
    senderRole: "user",
    body: body?.trim() || "",
    attachments: attachments || [],
  });

  // Replying to a resolved/closed ticket reopens it — the user replying
  // is telling us it isn't actually done
  if (ticket.status === "resolved" || ticket.status === "closed") {
    ticket.status = "open";
    ticket.closedAt = undefined;
    ticket.closedBy = undefined;
  }
  ticket.lastMessageAt = new Date();
  ticket.lastMessagePreview = body?.trim().slice(0, 200) || "[Attachment]";
  ticket.adminUnreadCount = (ticket.adminUnreadCount || 0) + 1;
  await ticket.save();

  return message;
};

// ─── Admin-facing ────────────────────────────────────────────────────────────

const listAllTickets = async ({ status, category, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("workspaceId", "name"),
    SupportTicket.countDocuments(filter),
  ]);

  return { tickets, total, page, limit };
};

const getTicketStats = async () => {
  const [open, inProgress, resolved, closed, unreadAgg] = await Promise.all([
    SupportTicket.countDocuments({ status: "open" }),
    SupportTicket.countDocuments({ status: "in_progress" }),
    SupportTicket.countDocuments({ status: "resolved" }),
    SupportTicket.countDocuments({ status: "closed" }),
    SupportTicket.aggregate([
      { $match: { adminUnreadCount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$adminUnreadCount" } } },
    ]),
  ]);

  return {
    open,
    inProgress,
    resolved,
    closed,
    unreadTotal: unreadAgg[0]?.total || 0,
  };
};

const getTicketForAdmin = async ({ ticketId }) => {
  const ticket = await SupportTicket.findById(ticketId)
    .populate("userId", "name email avatar")
    .populate("workspaceId", "name");
  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  const messages = await SupportMessage.find({ ticketId }).sort({ createdAt: 1 });

  if (ticket.adminUnreadCount > 0) {
    ticket.adminUnreadCount = 0;
    await ticket.save();
  }

  return { ticket, messages };
};

const addAdminMessage = async ({ ticketId, adminUserId, body, attachments }) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (!body?.trim() && (!attachments || attachments.length === 0)) {
    const error = new Error("A message or attachment is required");
    error.statusCode = 400;
    throw error;
  }

  const message = await SupportMessage.create({
    ticketId,
    senderId: adminUserId,
    senderRole: "admin",
    body: body?.trim() || "",
    attachments: attachments || [],
  });

  // Replying implies work has started, unless it's already past that
  if (ticket.status === "open") {
    ticket.status = "in_progress";
  }
  ticket.lastMessageAt = new Date();
  ticket.lastMessagePreview = body?.trim().slice(0, 200) || "[Attachment]";
  ticket.userUnreadCount = (ticket.userUnreadCount || 0) + 1;
  await ticket.save();

  return message;
};

const updateTicketStatus = async ({ ticketId, status, adminUserId }) => {
  if (!STATUSES.includes(status)) {
    const error = new Error("Invalid status");
    error.statusCode = 400;
    throw error;
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  ticket.status = status;
  if (status === "closed" || status === "resolved") {
    ticket.closedAt = new Date();
    ticket.closedBy = adminUserId;
  } else {
    ticket.closedAt = undefined;
    ticket.closedBy = undefined;
  }
  await ticket.save();

  return ticket;
};

module.exports = {
  CATEGORIES,
  STATUSES,
  createTicket,
  listMyTickets,
  getMyTicket,
  addUserMessage,
  listAllTickets,
  getTicketStats,
  getTicketForAdmin,
  addAdminMessage,
  updateTicketStatus,
};