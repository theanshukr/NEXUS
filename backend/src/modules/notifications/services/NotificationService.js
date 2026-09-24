import NotificationRepository from '../repositories/NotificationRepository.js';

class NotificationService {
  /**
   * Get notifications for the current user
   */
  async getMyNotifications(tenantId, user) {
    const userId = user._id || user.userId;
    let roles = user.roles || [];
    
    if (roles.length === 0 && userId) {
      await import('../../roles/models/Role.js').catch(() => {});
      const UserRoleRepository = (await import('../../roles/repositories/UserRoleRepository.js')).default;
      const userRolesDocs = await UserRoleRepository.findRolesByUser(userId, tenantId);
      roles = userRolesDocs.map(ur => ur.roleId?.name).filter(Boolean);
    }
    
    const notifications = await NotificationRepository.findForUser(tenantId, userId, roles);
    
    // Format notifications for the frontend and calculate the 'read' status
    return notifications.map(notif => {
      // Check if the current user's ID is in the readBy array
      const isRead = notif.readBy && notif.readBy.some(id => id.toString() === userId.toString());
      
      // Calculate human readable time (simplified logic)
      const diffMs = Date.now() - new Date(notif.createdAt).getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);
      
      let timeStr = 'Just now';
      if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins} mins ago`;
      else if (diffHours >= 1 && diffHours < 24) timeStr = `${diffHours} hours ago`;
      else if (diffDays >= 1) timeStr = `${diffDays} days ago`;

      return {
        id: notif._id,
        title: notif.title,
        message: notif.message,
        priority: notif.priority,
        channel: notif.channel,
        roles: notif.targetRoles,
        time: timeStr,
        read: isRead
      };
    });
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(tenantId, userId, notificationIds) {
    await NotificationRepository.markAsRead(tenantId, userId, notificationIds);
    return { success: true };
  }

  /**
   * Send a global notification (Internal API for other modules to use)
   */
  async sendNotification(tenantId, { title, message, priority = 'info', channel = 'in-app', targetRoles = [], targetUserIds = [] }) {
    return NotificationRepository.create({
      tenantId,
      title,
      message,
      priority,
      channel,
      targetRoles,
      targetUserIds
    });
  }
}

export default new NotificationService();
