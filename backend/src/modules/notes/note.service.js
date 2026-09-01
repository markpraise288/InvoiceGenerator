const Note = require("./note.model");

const createNote = async (leadId, userId, body) => {
  const { type, title, description } = body;

  const note = await Note.create({
    lead: leadId,
    createdBy: userId,
    type,
    title,
    description,
  });

  await note.populate("createdBy", "name email");

  return note;
};

const getLeadNotes = async (leadId) => {
  const notes = await Note.find({ lead: leadId })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return notes;
};

const deleteNote = async (noteId, userId) => {
  const note = await Note.findOne({ _id: noteId, createdBy: userId });

  if (!note) {
    return null;
  }

  await note.deleteOne();

  return note;
};

module.exports = {
  createNote,
  getLeadNotes,
  deleteNote,
};