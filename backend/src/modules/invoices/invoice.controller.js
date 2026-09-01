const { createInvoice, downloadInvoicePDF, getInvoiceById, updateInvoice, deleteInvoice, getInvoices, restoreInvoice, deleteInvoicePermanently } = require('./invoice.service');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const createInvoiceHandler = asyncHandler(async (req, res) => {
  const { invoice, pdfBuffer } = await createInvoice(
    req.user,
    req.body,
    req.query.send
  );

  // 🔥 Send PDF as download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=INV-${invoice.invoiceNumber}.pdf`
  );

  return res.status(201).send(pdfBuffer);
});

const downloadInvoicePDFHandler = asyncHandler(async (req, res) => {
  const invoiceId = req.params.id;

  let result;
  try {
    result = await downloadInvoicePDF(invoiceId);
  } catch (err) {
    const status = err.status ?? 500;
    const error = new Error(err.message || "Failed to generate invoice PDF");
    error.statusCode = status;
    throw error;
  }

  const { pdfBuffer, fileName } = result;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", pdfBuffer.length);

  return res.send(pdfBuffer);
});

const getInvoiceByIdHandler = asyncHandler( async(req, res) => {
    const invoice = await getInvoiceById(req.params.id, req.user.id);
    if (!invoice) {
        return res.status(404).json( new ApiResponse(404, 'Invoice not found') );
    }
    res.json( new ApiResponse(200, 'Invoice retrieved successfully', invoice) );
});

const updateInvoiceHandler = asyncHandler( async(req, res) => {
    const invoice = await updateInvoice(req.params.id, req.body, req.user);
    if (!invoice) {
        return res.status(404).json( new ApiResponse(404, 'Invoice not found') );
    }
    res.json( new ApiResponse(200, 'Invoice updated successfully', invoice) );
});

const deleteInvoiceHandler = asyncHandler( async(req, res) => {
    const invoice = await deleteInvoice(req.params.id, req.user);
    if (!invoice) {
        return res.status(404).json( new ApiResponse(404, 'Invoice not found') );
    }
    res.json( new ApiResponse(200, 'Invoice deleted successfully', invoice) );
});

const deleteInvoicePermanentlyHandler = asyncHandler( async(req, res) => {
    await deleteInvoicePermanently(req.params.id);
    res.json( new ApiResponse(200, 'Invoice permanently deleted successfully') );
});

const getInvoicesHandler = asyncHandler( async(req, res) => {
    const invoices = await getInvoices(req.user);
    res.json( new ApiResponse(200, 'Invoices retrieved successfully', invoices) );
});

const restoreInvoiceHandler = asyncHandler( async(req, res) => {
    const invoice = await restoreInvoice(req.params.id);
    if (!invoice) {
        return res.status(404).json( new ApiResponse(404, 'Invoice not found') );
    }
    res.json( new ApiResponse(200, 'Invoice restored successfully', invoice) );
});

module.exports = {
    createInvoiceHandler,
    downloadInvoicePDFHandler,
    getInvoiceByIdHandler,
    updateInvoiceHandler,
    deleteInvoiceHandler,
    deleteInvoicePermanentlyHandler,
    getInvoicesHandler,
    restoreInvoiceHandler,
};

