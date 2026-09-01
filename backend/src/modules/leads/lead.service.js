const Lead = require("./lead.model");
const customerService = require("../customers/customer.service");
const { logActivity } = require("../activities/activity.service");
const dealModel = require("../deals/deal.model");

const createLead = async (payload, user) => {
  const lead = await Lead.create({
    ...payload,
    createdBy: user.id,
    workspaceId: user.workspaceId,
    owner: payload.owner || user.id,
  });

  await logActivity({
    relatedId: lead._id,
    relatedTo: "Lead",
    body: lead.description,
    userId: user.id,
    type: "created",
    title: `Lead created: ${lead.name}`,
    workspaceId: lead.workspaceId,
    meta: {
      leadId: lead._id,
    },
  });

  return lead;
};

const getLeads = async (query, user) => {
  const {
    search,
    stage,
    source,
    owner,
    minScore,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (stage) filter.stage = stage;
  if (source) filter.source = source;
  if (owner) filter.owner = owner;
  if (minScore !== undefined) filter.score = { $gte: Number(minScore) };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("owner", "name email")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Returns ALL leads grouped by stage — used by the Kanban board, same pattern
// as project.service.js's getProjectsKanban.
const getLeadsKanban = async (filter = {}, user) => {
  filter.workspaceId = user.workspaceId;
  const leads = await Lead.find(filter)
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const columns = {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: [],
  };

  leads.forEach((lead) => {
    columns[lead.stage]?.push(lead);
  });

  return columns;
};

const getLeadById = async (leadId) => {
  const lead = await Lead.findById(leadId)
    .populate("owner", "name email")
    .populate("createdBy", "name email")
    .populate("convertedCustomer", "name email status");

  if (!lead) {
    const error = new Error("Lead not found");
    error.statusCode = 404;
    throw error;
  }

  return lead;
};

const updateLead = async (leadId, payload, user) => {
  const existing = await Lead.findById(leadId);
  if (!existing) {
    const error = new Error("Lead not found");
    error.statusCode = 404;
    throw error;
  }

  if (existing.convertedCustomer) {
    const error = new Error(
      "Cannot edit a lead that has already been converted to a customer",
    );
    error.statusCode = 400;
    throw error;
  }

  const lead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: payload },
    { new: true, runValidators: true },
  ).populate("owner", "name email");

  await logActivity({
    relatedId: lead._id,
    relatedTo: "Lead",
    body: lead.description,
    userId: user.id,
    type: "updated",
    title: `Lead updated: ${lead.name}`,
    workspaceId: lead.workspaceId,
    meta: {
      leadId: lead._id,
    },
  });

  return lead;
};

const updateLeadStage = async (leadId, stage, lostReason, user) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    const error = new Error("Lead not found");
    error.statusCode = 404;
    throw error;
  }

  if (lead.convertedCustomer) {
    const error = new Error(
      "Cannot change stage of a lead that has already been converted",
    );
    error.statusCode = 400;
    throw error;
  }

  lead.stage = stage;
  if (stage === "lost" && lostReason !== undefined) {
    lead.lostReason = lostReason;

    await logActivity({
      relatedId: lead._id,
      relatedTo: "Lead",
      body: lead.description,
      userId: user.id,
      type: "stage_changed",
      title: `Lead lost: ${lead.name}`,
      workspaceId: lead.workspaceId,
      meta: {
        leadId: lead._id,
      },
    });
  }
  if (stage !== "lost") {
    lead.lostReason = "";
  }

  await logActivity({
    relatedId: lead._id,
    relatedTo: "Lead",
    body: lead.description,
    userId: user.id,
    type: "stage_changed",
    title: `Lead updated: ${lead.name}`,
    workspaceId: lead.workspaceId,
    meta: {
      leadId: lead._id,
    },
  });

  await lead.save();
  return lead;
};

const deleteLead = async (leadId, user) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    const error = new Error("Lead not found");
    error.statusCode = 404;
    throw error;
  }

  await Lead.deleteOne(leadId);

  await logActivity({
    relatedId: lead._id,
    relatedTo: "Lead",
    body: lead.description,
    userId: user.id,
    type: "deleted",
    title: `Lead deleted: ${lead.name}`,
    workspaceId: lead.workspaceId,
    meta: {
      leadId: lead._id,
    },
  });

  return lead;
};

// Converts a won lead into a real Customer record — bridges CRM (Leads) into
// billing (Customers). Reuses customerService.createCustomer rather than
// duplicating Customer-creation logic.
const convertLeadToCustomer = async (leadId, payload, user) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    const error = new Error("Lead not found");
    error.statusCode = 404;
    throw error;
  }

  if (lead.convertedCustomer) {
    const error = new Error("Lead has already been converted to a customer");
    error.statusCode = 400;
    throw error;
  }

  if (lead.stage !== "won") {
    const error = new Error(
      "Only leads in the 'won' stage can be converted to a customer",
    );
    error.statusCode = 400;
    throw error;
  }

  const userId = user.id;
  console.log("Converting lead to customer:", { leadId, user, payload });
  const customer = await customerService.createCustomer(
    {
      name: lead.company || lead.name,
      email: lead.email,
      phone: lead.phone,
      billingAddress: payload.billingAddress,
      company: payload.company || null,
      contact: payload.contact || null,
      status: "active",
      currency: lead.currency,
      notes: `Converted from lead: ${lead.name}${lead.notes ? ` — ${lead.notes}` : ""}`,
      owner: lead.owner,
      workspaceId: user.workspaceId,
      createdBy: userId,
    },
    userId,
  );

  lead.convertedCustomer = customer._id;
  lead.convertedAt = new Date();
  await lead.save();

  await logActivity({
    relatedId: customer._id,
    relatedTo: "Customer",
    body: customer.notes,
    userId: user.id,
    type: "created",
    title: `Lead converted: ${lead.name}`,
    workspaceId: customer.workspaceId,
    meta: {
      customerId: customer._id,
    },
  });

  return { lead, customer };
};

const getLeadsSummary = async (filter = {}, user) => {
  filter.workspaceId = user.workspaceId;
  const results = await Lead.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        totalValue: { $sum: "$value" },
      },
    },
  ]);

  const summary = {
    totalLeads: 0,
    totalPipelineValue: 0,
    byStage: {},
  };

  results.forEach((r) => {
    summary.byStage[r._id] = { count: r.count, value: r.totalValue };
    summary.totalLeads += r.count;
    if (r._id !== "won" && r._id !== "lost") {
      summary.totalPipelineValue += r.totalValue;
    }
  });

  return summary;
};

module.exports = {
  createLead,
  getLeads,
  getLeadsKanban,
  getLeadById,
  updateLead,
  updateLeadStage,
  deleteLead,
  convertLeadToCustomer,
  getLeadsSummary,
};
