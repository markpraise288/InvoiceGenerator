const Invoice = require("./invoice.model");
const User = require("../users/user.model");
const generateInvoiceNumber = require("../../utils/generateInvoiceNumber");
const generateInvoicePDF = require("../../utils/generateInvoicePdf");
const { emailQueue } = require("../../infrastructure/queues/email.queue");
const {
  notificationService,
} = require("../notifications/notification.service");

const createInvoice = async (userId, invoiceData, send) => {
  invoiceData.subtotal = invoiceData.items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0,
  );
  invoiceData.total =
    invoiceData.subtotal +
    ((invoiceData.tax.value / 100) * invoiceData.subtotal || 0) -
    ((invoiceData.discount.value / 100) * invoiceData.subtotal || 0);

  invoiceData.invoiceNumber = await generateInvoiceNumber(userId);
  const invoice = await Invoice.create({ ...invoiceData, userId });

  // Trigger notification for invoice creation
  await notificationService.createNotification({
    userId: userId,
    title: "New Invoice Created",
    description: `Invoice #${invoice.invoiceNumber} has been created for ${invoice.clientSnapshot.name}.`,
    type: "invoice",
  });

  await createInvoicePDF(invoice, send);

  return invoice;
};

const downloadInvoicePDF = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  const user = await User.findById(invoice.userId);
  if (!user) {
    throw new Error("User not found");
  }
  const filePath = await generateInvoicePDF(invoice, user, invoice.template);
  return filePath;
};

const getInvoices = async (userId) => {
  const invoices = await Invoice.find({ userId: userId });
  return invoices;
};

const getInvoiceById = async (id) => {
  const invoice = await Invoice.findOne({ _id: id });
  return invoice;
};

const { createSaleFromInvoice } = require("../sales/sales.service");

const updateInvoice = async (id, updateData) => {
  const invoice = await Invoice.findOne({ _id: id });
  
  const previousStatus = invoice.status;
  
  const totalPaid = updateData.payments
    ? updateData.payments.reduce((acc, payment) => acc + payment.amount, 0)
    : invoice.payments.reduce((acc, payment) => acc + payment.amount, 0);

  invoice.totalPaid = totalPaid;
  
  if (totalPaid >= invoice.total) {
    invoice.status = "paid";
  } else if (totalPaid > 0) {
    invoice.status = "partial";
  } else {
    invoice.status = "sent";
  }

  if (updateData.status) invoice.status = updateData.status;
  if (updateData.payments) invoice.payments = updateData.payments;
  
  await invoice.save();
  
  // If invoice status changed to "paid", create a Sale record
  if (previousStatus !== "paid" && invoice.status === "paid") {
    await createSaleFromInvoice(invoice);
    
    // Trigger notification for payment
    await notificationService.createNotification({
      userId: invoice.userId,
      title: "Invoice Paid",
      description: `Invoice #${invoice.invoiceNumber} has been marked as paid.`,
      type: "invoice",
    });
  }
  
  return invoice;
};

const deleteInvoice = async (id) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id },
    { isDeleted: true },
    { returnDocument: "after" },
  );
  return invoice;
};

const deleteInvoicePermanently = async (id) => {
  await Invoice.deleteOne({ _id: id });
};

const restoreInvoice = async (id) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id },
    { isDeleted: false },
    { returnDocument: "after" },
  );
  return invoice;
};

const createInvoicePDF = async (invoice, send) => {
  const user = await User.findById(invoice.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const filePath = await generateInvoicePDF(invoice, user, invoice.template);
  const dueDate = invoice.dueDate;

  const formatMoney = (number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(number);
  };

  if (send === "true") {
    await emailQueue.add(
      "Invoice Email",
      {
        email: invoice.clientSnapshot.email,
        clientName: invoice.clientSnapshot.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: formatMoney(invoice.total),
        dueDate: dueDate,
        companyName: user.companyName,
        filename: `INV-${invoice.invoiceNumber}.pdf`,
        path: filePath,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    );
  }
};

module.exports = {
  createInvoice,
  downloadInvoicePDF,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  restoreInvoice,
  createInvoicePDF,
  deleteInvoicePermanently,
};
