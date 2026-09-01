const Customer = require("./customer.model");
const { logActivity } = require("../activities/activity.service");

const createCustomer = async (payload, user) => {
  const customer = await Customer.create({
    ...payload,
    createdBy: user.id || payload.createdBy,
    owner: payload.owner || user.id,
    workspaceId: user.workspaceId || payload.workspaceId,
  });

  await logActivity({
    relatedId: customer._id,
    relatedTo: "Customer",
    body: customer.description,
    userId: user.id,
    type: "created",
    title: `Customer created: ${customer.name}`,
    workspaceId: customer.workspaceId,
    meta: {
      customerId: customer._id,
    },
  });

  return customer;
};

const getCustomers = async (query, user) => {
  const {
    search,
    status,
    company,
    contact,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = {};

  filter.workspaceId = user.workspaceId;

  if (status) filter.status = status;
  if (company) filter.company = company;
  if (contact) filter.contact = contact;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .populate("company", "name")
      .populate("contact", "name email")
      .populate("owner", "name email")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Customer.countDocuments(filter),
  ]);

  return {
    customers,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getCustomerById = async (customerId) => {
  const customer = await Customer.findById(customerId)
    .populate("company", "name")
    .populate("contact", "name email")
    .populate("owner", "name email")
    .populate("createdBy", "name email");

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  return customer;
};

const updateCustomer = async (customerId, payload, user) => {
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $set: payload },
    { returnDocument: 'after', runValidators: true }
  )
    .populate("company", "name")
    .populate("contact", "name email")
    .populate("owner", "name email");

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: customer._id,
    relatedTo: "Customer",
    body: customer.description,
    userId: user.id,
    type: "updated",
    title: `Customer updated: ${customer.name}`,
    workspaceId: customer.workspaceId,
    meta: {
      customerId: customer._id,
    },
  });

  return customer;
};

const deleteCustomer = async (customerId, user) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: customer._id,
    relatedTo: "Customer",
    body: customer.description,
    userId: user.id,
    type: "created",
    title: `Customer created: ${customer.name}`,
    workspaceId: customer.workspaceId,
    meta: {
      customerId: customer._id,
    },
  });

  return customer;
};

// Increment/decrement totalRevenue — called by Payments service on completed/refunded payments
const adjustRevenue = async (customerId, amountDelta) => {
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $inc: { totalRevenue: amountDelta } },
    { returnDocument: 'after' }
  );

  await logActivity({
    relatedId: customer._id,
    relatedTo: "Customer",
    body: customer.description,
    type: "updated",
    title: `Customer updated: ${customer.name}`,
    workspaceId: customer.workspaceId,
    meta: {
      customerId: customer._id,
    },
  });

  return customer;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  adjustRevenue,
};