const { Notification } = require('./notification.model.js');

const notificationService = {
  async createNotification(data) {
    const notification = new Notification(data);
    return await notification.save();
  },

  async getNotificationsByUserId(userId) {
    return await Notification.find({ userId }).sort({ createdAt: -1 });
  },

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
  },

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  }
};

module.exports = { notificationService };
