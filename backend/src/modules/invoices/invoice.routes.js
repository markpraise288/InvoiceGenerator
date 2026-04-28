
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate');
const { createInvoiceSchema, updateInvoiceSchema } = require('./invoice.validate');
const { createInvoiceHandler, downloadInvoicePDFHandler, getInvoicesHandler, getInvoiceByIdHandler, updateInvoiceHandler, deleteInvoiceHandler, deleteInvoicePermanentlyHandler, restoreInvoiceHandler } = require('./invoice.controller');

router.post('/', authMiddleware, validate(createInvoiceSchema), createInvoiceHandler);
router.get('/:id/download', authMiddleware, downloadInvoicePDFHandler);
router.get('/', authMiddleware, getInvoicesHandler);
router.get('/:id', authMiddleware, getInvoiceByIdHandler);
router.put('/:id', authMiddleware, validate(updateInvoiceSchema), updateInvoiceHandler);
router.delete('/:id', authMiddleware, deleteInvoiceHandler);
router.delete('/:id/permanent', authMiddleware, deleteInvoicePermanentlyHandler);
router.patch('/:id', authMiddleware, restoreInvoiceHandler);

module.exports = router;
