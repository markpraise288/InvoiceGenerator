const express = require('express');
const notificationController = require('./notification.controller.js');
const authMiddleware = require('../../middlewares/auth.middleware.js'); // Assuming you have an auth middleware

const router = express.Router();

// POST /api/notifications - Create a new notification (protected, likely used internally)
router.post('/', authMiddleware, notificationController.createNotification);

// GET /api/notifications - Get notifications for the logged-in user
router.get('/', authMiddleware , notificationController.getNotificationsByUser);

// PUT /api/notifications/:notificationId/read - Mark a specific notification as read
router.put('/:notificationId/read', authMiddleware, notificationController.markNotificationAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authMiddleware, notificationController.markAllNotificationsAsRead);

module.exports = router;
