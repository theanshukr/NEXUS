import Notification from '../models/Notification.js';

class NotificationRepository {
  /**
   * Find notifications that target a user (by userId or by roles)
   */
  async findForUser(tenantId, userId, roles, limit = 50) {
    return Notification.find({
      tenantId,
      $or: [
        { targetRoles: { $in: roles } },
        { targetUserIds: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  }

  /**
   * Mark specific notifications as read by a user
   */
  async markAsRead(tenantId, userId, notificationIds) {
    if (!notificationIds || notificationIds.length === 0) return;
    
    return Notification.updateMany(
      {
        _id: { $in: notificationIds },
        tenantId
      },
      {
        $addToSet: { readBy: userId }
      }
    );
  }

  /**
   * Create a new notification
   */
  async create(data) {
    const notification = new Notification(data);
    return notification.save();
  }
}

export default new NotificationRepository();
