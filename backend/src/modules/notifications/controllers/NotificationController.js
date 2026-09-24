import NotificationService from '../services/NotificationService.js';

class NotificationController {
  /**
   * Get all notifications for the current authenticated user
   */
  async getMyNotifications(req, res, next) {
    try {
      const notifications = await NotificationService.getMyNotifications(req.user.organizationId, req.user);
      
      res.status(200).json({
        success: true,
        data: notifications,
        message: 'Notifications fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark an array of notifications as read
   */
  async markAsRead(req, res, next) {
    try {
      const { notificationIds } = req.body;
      
      await NotificationService.markAsRead(req.user.organizationId, req.user.userId, notificationIds);
      
      res.status(200).json({
        success: true,
        message: 'Notifications marked as read'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
