const Invoice = require("./invoice.model");
const User = require("../users/user.model");
const generateInvoiceNumber = require("../../utils/generateInvoiceNumber");
const generateInvoicePDF = require("../../utils/generateInvoicePdf");
const {
  notificationService,
} = require("../notifications/notification.service");
const invoiceTemplate = require("../../infrastructure/templates/invoice.template");
const { sendEmail } = require("../../infrastructure/email/email.service");
const formatDate = require("../../utils/formatDate");
const formatCurrency = require("../../utils/formatCurrency");
const { logActivity } = require("../activities/activity.service");

const createInvoice = async (user, invoiceData, send) => {
  // 🔹 Calculate subtotal
  invoiceData.subtotal = invoiceData.items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0,
  );

  // 🔹 Calculate total
  invoiceData.total =
    invoiceData.subtotal +
    ((invoiceData.tax?.value || 0) / 100) * invoiceData.subtotal -
    ((invoiceData.discount?.value || 0) / 100) * invoiceData.subtotal;

  // 🔹 Generate invoice number
  invoiceData.invoiceNumber = await generateInvoiceNumber(user.id);

  // 🔹 Save invoice
  const invoice = await Invoice.create({
    ...invoiceData,
    userId: user.id,
    createdBy: user.id,
    workspaceId: user.workspaceId,
  });

  // 🔹 Notification
  await notificationService.createNotification({
    userId: user.id,
    title: "New Invoice Created",
    description: `Invoice #${invoice.invoiceNumber} has been created for ${invoice.customerSnapshot.name}.`,
    type: "invoice",
  });

  const pdfBuffer = await createInvoicePDF(invoice, send);

  await logActivity({
    relatedId: invoice._id,
    relatedTo: "Invoice",
    body: `An Invoice ${invoice.invoiceNumber} was created`,
    userId: user.id,
    type: "created",
    title: `Invoice created: #${invoice.invoiceNumber}`,
    workspaceId: invoice.workspaceId,
    meta: {
      invoiceId: invoice._id,
    },
  });

  return {
    invoice,
    pdfBuffer,
  };
};

const downloadInvoicePDF = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const err = new Error("INVOICE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  const user = await User.findById(invoice.userId);
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  let pdfBuffer;
  try {
    // generateInvoicePDF returns a Buffer, not a file path — same util
    // used by createInvoicePDF above
    pdfBuffer = await generateInvoicePDF(invoice, user, invoice.template);
  } catch (err) {
    const wrapped = new Error("PDF_GENERATION_FAILED");
    wrapped.status = 500;
    wrapped.cause = err;
    throw wrapped;
  }

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    const err = new Error("PDF_BUFFER_INVALID");
    err.status = 500;
    throw err;
  }

  return {
    pdfBuffer,
    fileName: `invoice-${invoice.invoiceNumber ?? invoice._id}.pdf`,
  };
};

const getInvoices = async (user) => {
  const invoices = await Invoice.find({ workspaceId: user.workspaceId });
  return invoices;
};

const getInvoiceById = async (id) => {
  const invoice = await Invoice.findOne({ _id: id });
  return invoice;
};

const { createSaleFromInvoice } = require("../sales/sales.service");

const updateInvoice = async (id, updateData, user) => {
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

    await logActivity({
    relatedId: invoice._id,
    relatedTo: "Invoice",
    body: `An Invoice ${invoice.invoiceNumber} was created`,
    userId: user.id,
    type: "invoice_paid",
    title: `Invoice paid: #${invoice.invoiceNumber}`,
    workspaceId: invoice.workspaceId,
    meta: {
      invoiceId: invoice._id,
    },
  });
  }

  await logActivity({
    relatedId: invoice._id,
    relatedTo: "Invoice",
    body: `An Invoice ${invoice.invoiceNumber} was updated`,
    userId: user.id,
    type: "updated",
    title: `Invoice updated: #${invoice.invoiceNumber}`,
    workspaceId: invoice.workspaceId,
    meta: {
      invoiceId: invoice._id,
    },
  });

  return invoice;
};

const deleteInvoice = async (id, user) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id },
    { isDeleted: true },
    { returnDocument: "after" },
  );

  await logActivity({
    relatedId: invoice._id,
    relatedTo: "Invoice",
    body: `An Invoice ${invoice.invoiceNumber} was deleted`,
    userId: user.id,
    type: "deleted",
    title: `Invoice deleted: #${invoice.invoiceNumber}`,
    workspaceId: invoice.workspaceId,
    meta: {
      invoiceId: invoice._id,
    },
  });

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

  // Generate PDF as BUFFER (not file path)
  const pdfBuffer = await generateInvoicePDF(invoice, user, invoice.template);

  const dueDate = invoice.dueDate;

  const formatMoney = (number) => {
    return formatCurrency(number, "USD", "en-US");
  };

  // ✅ Send email with BUFFER attachment
  if (send === "true") {
    await sendEmail({
      to: invoice.customerSnapshot.email,
      subject: "Your Invoice",
      html: invoiceTemplate({
        email: invoice.customerSnapshot.email,
        customerName: invoice.customerSnapshot.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: formatMoney(invoice.total),
        dueDate: formatDate(dueDate),
        companyName: user.companyName,
      }),
      attachments: [
        {
          filename: `INV-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer.toString("base64"), // 🔥 FIX
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });
  }

  // 🔥 RETURN BUFFER so caller can send it to frontend
  return pdfBuffer;
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
