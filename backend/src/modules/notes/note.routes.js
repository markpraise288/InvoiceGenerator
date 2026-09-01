const express = require("express");
const router = express.Router({ mergeParams: true });
const authMiddleware = require("../../middlewares/auth.middleware");
const noteController = require("./note.controller");
const validate = require("../../middlewares/validate");
const {
  createNoteSchema,
} = require("./note.validate");

router.post(
  "/leads/:leadId/notes",
  authMiddleware,
  validate(createNoteSchema),
  noteController.createNote
);

router.get(
  "/leads/:leadId/notes",
  authMiddleware,
  noteController.getLeadNotes
);

router.delete(
  "/notes/:id",
  authMiddleware,
  noteController.deleteNote
);

module.exports = router;