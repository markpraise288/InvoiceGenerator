
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate');
const { createClientSchema, updateClientSchema } = require('./client.validate');
const { createClientHandler, getClientsHandler, getClientByIdHandler, updateClientHandler, deleteClientHandler, deleteClientPermanentlyHandler, restoreClientHandler, remindClientHandler } = require('./client.controller');

router.post('/', authMiddleware, validate(createClientSchema), createClientHandler);
router.get('/', authMiddleware, getClientsHandler);
router.get('/:id', authMiddleware, getClientByIdHandler);
router.put('/:id', authMiddleware, validate(updateClientSchema), updateClientHandler);
router.delete('/:id', authMiddleware, deleteClientHandler);
router.delete('/:id/permanent', authMiddleware, deleteClientPermanentlyHandler);
router.patch('/:id', authMiddleware, restoreClientHandler);
router.post('/:id/remind', authMiddleware, remindClientHandler);

module.exports = router;
