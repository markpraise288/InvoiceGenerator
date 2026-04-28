
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const { createUserSchema, updateUserSchema } = require('./user.validate');
const { createUserHandler, getUserHandler, updateUserHandler } = require('./user.controller');
const validate = require('../../middlewares/validate');

router.post('/', authMiddleware, validate(createUserSchema), createUserHandler);
router.get('/', authMiddleware, getUserHandler);
router.patch('/', authMiddleware, validate(updateUserSchema), updateUserHandler);

module.exports = router;