const { notificationService } = require('./notification.service.js');

const notificationController = {
  async createNotification(req, res) {
    try {
      const { userId, title, description, type } = req.body;
      // Basic validation: Ensure userId, title, and description are provided
      if (!userId || !title || !description) {
        return res.status(400).json({ message: 'Missing required fields: userId, title, description' });
      }
      const notificationData = { userId, title, description, type };
      const notification = await notificationService.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Error creating notification', error: error.message });
    }
  },

  async getNotificationsByUser(req, res) {
    try {
      const userId = req.user.id; // Assuming user ID is available from authentication middleware
      const notifications = await notificationService.getNotificationsByUserId(userId);
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
  },

  async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id; // Assuming user ID is available from authentication middleware

      if (!notificationId) {
        return res.status(400).json({ message: 'Notification ID is required' });
      }

      const updatedNotification = await notificationService.markAsRead(notificationId, userId);
      
      if (!updatedNotification) {
        return res.status(404).json({ message: 'Notification not found or not authorized' });
      }

      res.status(200).json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: 'Error marking notification as read', error: error.message });
    }
  },

  async markAllNotificationsAsRead(req, res) {
    try {
      const userId = req.user.id; // Assuming user ID is available from authentication middleware
      await notificationService.markAllAsRead(userId);
      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
    }
  }
};

module.exports = notificationController;
