const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const { upload, filesToAttachments } = require("../../middlewares/upload.middleware");
const {
  createTicket: createTicketService,
  listMyTickets: listMyTicketsService,
  getMyTicket: getMyTicketService,
  addUserMessage: addUserMessageService,
} = require("./supportTicket.service");

// Multer middleware — mount before the handler on any route that accepts files
exports.uploadMiddleware = upload.array("attachments", 5);

exports.createTicket = asyncHandler(async (req, res) => {
  const { category, subject, body } = req.body;
  const attachments = filesToAttachments(req);

  const result = await createTicketService({
    userId: req.user.id,
    workspaceId: req.user.workspaceId,
    category,
    subject,
    body,
    attachments,
  });

  res.status(201).json(new ApiResponse(true, "Ticket submitted", result));
});

exports.listMyTickets = asyncHandler(async (req, res) => {
  const tickets = await listMyTicketsService({ userId: req.user.id });
  res.status(200).json(new ApiResponse(true, "Tickets retrieved", tickets));
});

exports.getMyTicket = asyncHandler(async (req, res) => {
  const result = await getMyTicketService({ ticketId: req.params.id, userId: req.user.id });
  res.status(200).json(new ApiResponse(true, "Ticket retrieved", result));
});

exports.addUserMessage = asyncHandler(async (req, res) => {
  const { body } = req.body;
  const attachments = filesToAttachments(req);

  const message = await addUserMessageService({
    ticketId: req.params.id,
    userId: req.user.id,
    body,
    attachments,
  });

  res.status(201).json(new ApiResponse(true, "Message sent", message));
});