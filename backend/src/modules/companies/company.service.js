// modules/companies/company.service.js

const Contact = require("../contacts/contact.model");
const Company = require("./company.model");
const { logActivity } = require("../activities/activity.service");

// ─── Populate helper ───────────────────────────────────────────────────────────

const defaultPopulate = (query) =>
  query
    .populate("owner", "name email avatar")
    .populate("createdBy", "name email avatar");

// ─── Create Company ────────────────────────────────────────────────────────────

const createCompany = async ({ data, userId, workspaceId }) => {
  const company = await Company.create({
    ...data,
    owner: data.owner ?? userId,
    workspaceId: workspaceId,
    createdBy: userId,
  });

  await logActivity({
    relatedId: company._id,
    relatedTo: "Company",
    body: company.description,
    userId,
    type: "created",
    title: `Company created: ${company.name}`,
    workspaceId: company.workspaceId,
    meta: {
      companyId: company._id,
    },
  });

  return defaultPopulate(Company.findById(company._id)).lean({
    virtuals: true,
  });
};

// ─── Get Companies (paginated + filtered) ─────────────────────────────────────

const getCompanies = async ({ filters = {}, workspaceId }) => {
  const {
    search,
    industry,
    size,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortDir = "desc",
  } = filters;

  const query = {};

  query.workspaceId = workspaceId;

  // Text search on name + domain
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { domain: { $regex: search, $options: "i" } },
      { industry: { $regex: search, $options: "i" } },
    ];
  }

  if (industry) query.industry = { $regex: industry, $options: "i" };
  if (size) query.size = size;

  const sortOrder = sortDir === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    defaultPopulate(
      Company.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
    ).lean({ virtuals: true }),
    Company.countDocuments(query),
  ]);

  return {
    companies,
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

// ─── Get Company by ID ─────────────────────────────────────────────────────────

const getCompanyById = async (companyId) => {
  const company = await defaultPopulate(
    Company.findById(companyId).populate({
      path: "contacts",
      select: "name email phone position createdAt",
      options: { limit: 50, sort: { createdAt: -1 } },
    }),
  ).lean({ virtuals: true });

  return company;
};

// ─── Find Company by Domain ────────────────────────────────────────────────────
// Used during lead conversion to avoid duplicates

const findCompanyByDomain = async (domain) => {
  if (!domain) return null;

  const normalized = domain.trim().toLowerCase();
  return Company.findOne({ domain: normalized }).lean();
};

// ─── Update Company ────────────────────────────────────────────────────────────

const updateCompany = async ({ companyId, data, user }) => {
  const company = await defaultPopulate(
    Company.findByIdAndUpdate(
      companyId,
      { $set: data },
      { returnDocument: "after", runValidators: true },
    ),
  ).lean({ virtuals: true });

  await logActivity({
    relatedId: company._id,
    relatedTo: "Company",
    body: company.description,
    userId: user.id,
    type: "created",
    title: `Company updated: ${company.name}`,
    workspaceId: company.workspaceId,
    meta: {
      companyId: company._id,
    },
  });

  return company;
};

// ─── Delete Company ────────────────────────────────────────────────────────────

const deleteCompany = async (companyId, user) => {
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: company._id,
    relatedTo: "Company",
    body: company.description,
    userId: user.id,
    type: "deleted",
    title: `Company deleted: ${company.name}`,
    workspaceId: company.workspaceId,
    meta: {
      companyId: company._id,
    },
  });

  await Company.deleteOne(companyId);

  return company;
};

// ─── Get Company Contact Count ─────────────────────────────────────────────────

const getCompanyStats = async (companyId) => {
  const Contact = require("../contacts/contact.model");

  const [contactCount, leadCount] = await Promise.all([
    Contact.countDocuments({ company: companyId }),
    require("../leads/lead.model").countDocuments({
      company: companyId,
    }),
  ]);

  return { contactCount, leadCount };
};

// ─── Search Companies (lightweight — for combobox) ────────────────────────────

const searchCompanies = async ({ search = "", limit = 10 }) => {
  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { domain: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const companies = await Company.find(query)
    .select("name domain industry size")
    .sort({ name: 1 })
    .limit(limit)
    .lean();

  return companies;
};

const getCompanyContacts = async (companyId) => {
  const contacts = await Contact.find({ company: companyId });

  return contacts;
};

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  getCompanyContacts,
  findCompanyByDomain,
  updateCompany,
  deleteCompany,
  getCompanyStats,
  searchCompanies,
};
