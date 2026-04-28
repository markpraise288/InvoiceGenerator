const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String, // e.g., 'invoice', 'payment', 'system'
    default: 'system',
  },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = { Notification };
