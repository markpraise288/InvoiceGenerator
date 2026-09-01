// modules/contacts/contact.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const contactService = require("./contact.service");

// ─── Create Contact ────────────────────────────────────────────────────────────

const createContact = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.user.workspaceId;

  const contact = await contactService.createContact({
    data: req.body,
    userId,
    workspaceId
  });

  return res.status(201).json(
    new ApiResponse(201, "Contact created successfully", contact)
  );
});

// ─── Get Contacts ──────────────────────────────────────────────────────────────

const getContacts = asyncHandler(async (req, res) => {
  const result = await contactService.getContacts({
    filters: req.query,
    user: req.user
  });

  return res.status(200).json(
    new ApiResponse(200, "Contacts fetched successfully", result)
  );
});

// ─── Get Single Contact ────────────────────────────────────────────────────────

const getContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  const contact = await contactService.getContactById(contactId);

  if (!contact) {
    return res.status(404).json(
      new ApiResponse(404, "Contact not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Contact fetched successfully", contact)
  );
});

// ─── Search Contacts (combobox) ────────────────────────────────────────────────

const searchContacts = asyncHandler(async (req, res) => {
  const search = req.query.q ?? "";
  const limit = parseInt(req.query.limit) || 10;
  const companyId = req.query.company ?? undefined;

  const contacts = await contactService.searchContacts({
    search,
    limit,
    companyId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Contacts fetched successfully", contacts)
  );
});

// ─── Update Contact ────────────────────────────────────────────────────────────

const updateContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  const contact = await contactService.updateContact({
    contactId,
    data: req.body,
    userId: req.user.id
  });

  if (!contact) {
    return res.status(404).json(
      new ApiResponse(404, "Contact not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Contact updated successfully", contact)
  );
});

// ─── Delete Contact ────────────────────────────────────────────────────────────

const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  
  const contact = await contactService.deleteContact(contactId, req.user);

  if (!contact) {
    return res.status(404).json(
      new ApiResponse(404, "Contact not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Contact deleted successfully", null)
  );
});

// ─── Get Contacts by Company ───────────────────────────────────────────────────

const getContactsByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const contacts = await contactService.getContactsByCompany({
    companyId,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, "Contacts fetched successfully", contacts)
  );
});

// ─── Get Contact Stats ─────────────────────────────────────────────────────────

const getContactStats = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  const stats = await contactService.getContactStats(contactId);

  if (!stats) {
    return res.status(404).json(
      new ApiResponse(404, "Contact not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Contact stats fetched successfully", stats)
  );
});

// ─── Update Last Contacted ─────────────────────────────────────────────────────

const updateLastContacted = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  await contactService.updateLastContacted(contactId, req.user);

  return res.status(200).json(
    new ApiResponse(200, "Last contacted updated successfully", null)
  );
});

module.exports = {
  createContact,
  getContacts,
  getContact,
  searchContacts,
  updateContact,
  deleteContact,
  getContactsByCompany,
  getContactStats,
  updateLastContacted,
};