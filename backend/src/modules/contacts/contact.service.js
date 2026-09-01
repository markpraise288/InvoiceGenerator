// modules/contacts/contact.service.js

const Contact = require("./contact.model");
const { logActivity } = require("../activities/activity.service");

// ─── Populate helper ───────────────────────────────────────────────────────────

const defaultPopulate = (query) =>
  query
    .populate("owner", "name email avatar")
    .populate("createdBy", "name email avatar");

// ─── Create Contact ────────────────────────────────────────────────────────────

const createContact = async ({ data, userId, workspaceId }) => {
  const contact = await Contact.create({
    ...data,
    owner: data.owner ?? userId,
    workspaceId: workspaceId,
    createdBy: userId,
  });

  await logActivity({
    relatedId: contact._id,
    relatedTo: "Contact",
    body: contact.description,
    userId,
    type: "created",
    title: `Contact created: ${contact.name}`,
    workspaceId: contact.workspaceId,
    meta: {
      contactId: contact._id,
    },
  });

  return defaultPopulate(Contact.findById(contact._id)).lean({
    virtuals: true,
  });
};

// ─── Get Contacts (paginated + filtered) ──────────────────────────────────────

const getContacts = async ({ filters = {}, user }) => {
  const {
    relatedId,
    search,
    stage,
    owner,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortDir = "desc",
  } = filters;

  const query = {};

  query.workspaceId = user.workspaceId;
  // Text search across name and email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { position: { $regex: search, $options: "i" } },
    ];
  }

  if (relatedId) query.relatedId = relatedId;
  if (stage) query.stage = stage;
  if (owner) query.owner = owner;

  const sortOrder = sortDir === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  const [contacts, total] = await Promise.all([
    Contact.find(query)
      .populate("relatedId", "name")
      .populate("createdBy", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Contact.countDocuments(query),
  ]);

  return {
    contacts,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

// ─── Get Contact by ID ─────────────────────────────────────────────────────────

const getContactById = async (contactId) => {
  const contact = await defaultPopulate(Contact.findById(contactId)).lean({
    virtuals: true,
  });

  return contact;
};

// ─── Find Contact by Email ─────────────────────────────────────────────────────
// Used during lead conversion to avoid duplicate contacts

const findContactByEmail = async (email) => {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();
  return Contact.findOne({ email: normalized }).lean();
};

// ─── Update Contact ────────────────────────────────────────────────────────────

const updateContact = async ({ contactId, data, userId }) => {
  const contact = await defaultPopulate(
    Contact.findByIdAndUpdate(
      contactId,
      { $set: data },
      { returnDocument: "after", runValidators: true },
    ),
  ).lean({ virtuals: true });

  await logActivity({
    relatedId: contact._id,
    relatedTo: "Contact",
    body: contact.description,
    userId,
    type: "updated",
    title: `Contact updated: ${contact.name}`,
    workspaceId: contact.workspaceId,
    meta: {
      contactId: contact._id,
    },
  });

  return contact;
};

// ─── Delete Contact ────────────────────────────────────────────────────────────

const deleteContact = async (contactId, user) => {
  const contact = await Contact.findById(contactId);
  if(!contact){
    const error = new Error("Contact not found");
    error.statusCode = 404;
    throw error
  }

   await logActivity({
    relatedId: contact._id,
    relatedTo: "Contact",
    body: contact.description,
    userId: user.id,
    type: "deleted",
    title: `Contact deleted: ${contact.name}`,
    workspaceId: contact.workspaceId,
    meta: {
      contactId: contact._id,
    },
  });

  await Contact.deleteOne(contactId);

  return contact;
};

// ─── Update Last Contacted ─────────────────────────────────────────────────────
// Called internally when a call, email, or meeting activity is logged

const updateLastContacted = async (contactId, user) => {
  const contact = await Contact.findByIdAndUpdate(contactId, {
    $set: { lastContactedAt: new Date() },
  });

   await logActivity({
    relatedId: contact._id,
    relatedTo: "Contact",
    body: contact.description,
    userId: user.id,
    type: "updated",
    title: `Contact updated: ${contact.name}`,
    workspaceId: contact.workspaceId,
    meta: {
      contactId: contact._id,
    },
  });
};

// ─── Search Contacts (lightweight — for combobox) ─────────────────────────────

const searchContacts = async ({ search = "", limit = 10, companyId }) => {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (companyId) query.company = companyId;

  const contacts = await Contact.find(query)
    .select("name email position company")
    .populate("company", "name")
    .sort({ name: 1 })
    .limit(limit)
    .lean();

  return contacts;
};

// ─── Get Contacts for a Company ────────────────────────────────────────────────

const getContactsByCompany = async ({ companyId, limit = 50 }) => {
  const contacts = await defaultPopulate(
    Contact.find({ company: companyId }).sort({ createdAt: -1 }).limit(limit),
  ).lean({ virtuals: true });

  return contacts;
};

// ─── Get Contact Stats ─────────────────────────────────────────────────────────

const getContactStats = async (contactId) => {
  const Activity = require("../activities/activity.model");
  const Task = require("../tasks/task.model");

  const contact = await Contact.findById(contactId)
    .select("convertedFromLead")
    .lean();

  if (!contact) return null;

  const leadId = contact.convertedFromLead;

  const [activityCount, taskCount, openTaskCount] = await Promise.all([
    leadId ? Activity.countDocuments({ lead: leadId }) : Promise.resolve(0),
    leadId ? Task.countDocuments({ lead: leadId }) : Promise.resolve(0),
    leadId
      ? Task.countDocuments({ lead: leadId, completed: false })
      : Promise.resolve(0),
  ]);

  return {
    activityCount,
    taskCount,
    openTaskCount,
  };
};

module.exports = {
  createContact,
  getContacts,
  getContactById,
  findContactByEmail,
  updateContact,
  deleteContact,
  updateLastContacted,
  searchContacts,
  getContactsByCompany,
  getContactStats,
};
