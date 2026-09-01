const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const { upload, filesToAttachments } = require("../../middlewares/upload.middleware");
const {
  listAllTickets: listAllTicketsService,
  getTicketStats: getTicketStatsService,
  getTicketForAdmin: getTicketForAdminService,
  addAdminMessage: addAdminMessageService,
  updateTicketStatus: updateTicketStatusService,
} = require("./supportTicket.service");

exports.uploadMiddleware = upload.array("attachments", 5);

exports.listAllTickets = asyncHandler(async (req, res) => {
  const { status, category, page, limit } = req.query;
  const result = await listAllTicketsService({
    status,
    category,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.status(200).json(new ApiResponse(true, "Tickets retrieved", result));
});

exports.getTicketStats = asyncHandler(async (req, res) => {
  const stats = await getTicketStatsService();
  res.status(200).json(new ApiResponse(true, "Stats retrieved", stats));
});

exports.getTicket = asyncHandler(async (req, res) => {
  const result = await getTicketForAdminService({ ticketId: req.params.id });
  res.status(200).json(new ApiResponse(true, "Ticket retrieved", result));
});

exports.addAdminMessage = asyncHandler(async (req, res) => {
  const { body } = req.body;
  const attachments = filesToAttachments(req);

  const message = await addAdminMessageService({
    ticketId: req.params.id,
    adminUserId: req.user.id,
    body,
    attachments,
  });

  res.status(201).json(new ApiResponse(true, "Message sent", message));
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const ticket = await updateTicketStatusService({
    ticketId: req.params.id,
    status,
    adminUserId: req.user.id,
  });
  res.status(200).json(new ApiResponse(true, "Status updated", ticket));
});