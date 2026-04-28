const { createInvoice, downloadInvoicePDF, getInvoiceById, updateInvoice, deleteInvoice, getInvoices, restoreInvoice, deleteInvoicePermanently } = require('./invoice.service');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const createInvoiceHandler = asyncHandler( async(req, res) => {
    const invoice = await createInvoice(req.user.id, req.body, req.query.send);
    res.status(201).json( new ApiResponse(201, 'Invoice created successfully', invoice) );
});

const downloadInvoicePDFHandler = asyncHandler( async(req, res) => {
    const filePath = await downloadInvoicePDF(req.params.id);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).json(new ApiResponse(500, 'Error downloading invoice PDF'));
        }
    });
});

const getInvoiceByIdHandler = asyncHandler( async(req, res) => {
    const invoice = await getInvoiceById(req.params.id, req.user.id);
    if (!invoice) {
        return res.status(404).json( new ApiResponse(404, 'Invoice not found') );
    }
    res.json( new ApiResponse(200, 'Invoice retrieved successfully', invoice) );
});

const updateInvoiceHandler = asyncHandler( async(req, res) => {
    const invoice = await updateInvoice(req.params.id, req.body);
    if (!invoice) {
        return res.status(404).json( new ApiResponse(404, 'Invoice not found') );
    }
    res.json( new ApiResponse(200, 'Invoice updated successfully', invoice) );
});

const deleteInvoiceHandler = asyncHandler( async(req, res) => {
    const invoice = await deleteInvoice(req.params.id);
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
    const invoices = await getInvoices(req.user.id);
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

