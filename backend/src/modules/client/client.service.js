const Invoice = require("../invoices/invoice.model");
const Client = require("./client.model");
const {
  notificationService,
} = require("../notifications/notification.service");
const generateInvoicePDF = require("../../utils/generateInvoicePdf");
const User = require("../users/user.model");
const remindTemplate = require("../../infrastructure/templates/reminder.template");
const { sendEmail } = require("../../infrastructure/email/email.service");
const fs = require("fs");

const createClient = async (userId, clientData) => {
  const client = await Client.create({ ...clientData, userId: userId });

  // Trigger notification for client creation
  await notificationService.createNotification({
    userId: userId,
    title: "New Client Created",
    description: `Client ${client.name} has been added to your account.`,
    type: "client",
  });
  return client;
};

const getClients = async (userId) => {
  const clients = Client.find({ userId });
  return clients;
};

const getClientById = async (clientId, userId) => {
  const client = Client.findOne({ _id: clientId, userId, isDeleted: false });
  return client;
};

const updateClient = async (clientId, userId, updateData) => {
  const client = Client.findOneAndUpdate(
    { _id: clientId, userId, isDeleted: false },
    updateData,
    { returnDocument: "after" },
  );
  return client;
};

const deleteClient = async (clientId, userId) => {
  const client = Client.findOneAndUpdate(
    { _id: clientId, userId, isDeleted: false },
    { isDeleted: true },
    { returnDocument: "after" },
  );
  return client;
};

const deleteClientPermanently = async (clientId, userId) => {
  await Client.deleteOne({ _id: clientId, userId });
  return "Client permanently deleted";
};

const restoreClient = async (clientId, userId) => {
  const client = Client.findOneAndUpdate(
    { _id: clientId, userId, isDeleted: true },
    { isDeleted: false },
    { returnDocument: "after" },
  );
  return client;
};

const remindClient = async (invoiceId, userId) => {
  const invoice = await Invoice.findOne({
    _id: invoiceId,
    userId,
    isDeleted: false,
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const filePath = await generateInvoicePDF(invoice, user, invoice.template);
  const pdfBuffer = fs.readFileSync(filePath);
  const fileContent = fs.readFileSync(filePath).toString("base64");
  await sendEmail({
    to: invoice.clientSnapshot.email,
    subject: `Invoice Reminder – Invoice #${invoice.invoiceNumber}`,

    text: `Hello ${invoice.clientSnapshot.name},`,

    html: remindTemplate({
      clientName: invoice.clientSnapshot.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      dueDate: invoice.dueDate,
      companyName: user.companyName,
    }),

    attachments: [
      {
        filename: "invoice.pdf",
        content: pdfBuffer.toString("base64"),
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  });
  return "Reminder sent";
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  deleteClientPermanently,
  restoreClient,
  remindClient,
};
