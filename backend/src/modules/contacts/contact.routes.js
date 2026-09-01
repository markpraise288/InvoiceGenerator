// modules/contacts/contact.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  validate,
  createContactSchema,
  updateContactSchema,
  queryContactSchema,
} = require("./contact.validate");
const {
  createContact,
  getContacts,
  getContact,
  searchContacts,
  updateContact,
  deleteContact,
  getContactsByCompany,
  getContactStats,
  updateLastContacted,
} = require("./contact.controller");

const router = express.Router({ mergeParams: true });

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Search route ─────────────────────────────────────────────────────────────
// Declared before /:contactId to prevent "search" being captured as an id

router.get("/search", searchContacts);     // GET /api/contacts/search?q=jane

// ─── Collection routes ─────────────────────────────────────────────────────────

router
  .route("/")
  .get(
    validate(queryContactSchema, "query"), // GET  /api/contacts
    getContacts
  )
  .post(
    validate(createContactSchema),         // POST /api/contacts
    createContact
  );

// ─── Individual contact routes ─────────────────────────────────────────────────

router
  .route("/:contactId")
  .get(getContact)                         // GET    /api/contacts/:contactId
  .patch(
    validate(updateContactSchema),         // PATCH  /api/contacts/:contactId
    updateContact
  )
  .delete(deleteContact);                  // DELETE /api/contacts/:contactId

// ─── Contact sub-routes ────────────────────────────────────────────────────────

router.get(
  "/:contactId/stats",
  getContactStats                          // GET /api/contacts/:contactId/stats
);

router.patch(
  "/:contactId/last-contacted",
  updateLastContacted                      // PATCH /api/contacts/:contactId/last-contacted
);

module.exports = router;