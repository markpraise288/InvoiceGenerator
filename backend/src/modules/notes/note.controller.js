const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const noteService = require("./note.service");

const createNote = asyncHandler(async (req, res) => {
  const note = await noteService.createNote(
    req.params.leadId,
    req.user.id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Activity created successfully", note));
});

const getLeadNotes = asyncHandler(async (req, res) => {
  const notes = await noteService.getLeadNotes(req.params.leadId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Activities fetched successfully", notes));
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await noteService.deleteNote(req.params.id, req.user.id);

  if (!note) {
    return res
      .status(404)
      .json(new ApiResponse(404, "Activity not found or unauthorized", null));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Activity deleted successfully", note));
});

module.exports = {
  createNote,
  getLeadNotes,
  deleteNote,
};