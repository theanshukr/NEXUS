import { useEffect, useRef } from 'react';
import { useToast } from './ToastProvider';
import { apiClient } from '../api/client';

export default function GlobalNotificationEngine() {
  const { showToast } = useToast();
  const seenIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/notifications/my');
        if (res.data?.data) {
          const notifications = res.data.data;
          const unreadNotifications = notifications.filter((n: any) => !n.read);

          if (isInitialLoad.current) {
            // On first load, don't toast existing unread notifications, just remember them
            unreadNotifications.forEach((n: any) => seenIds.current.add(n._id));
            isInitialLoad.current = false;
          } else {
            // On subsequent polls, toast any unread notifications we haven't seen yet
            unreadNotifications.forEach((n: any) => {
              if (!seenIds.current.has(n._id)) {
                // Toast the new notification
                const type = n.priority === 'info' ? 'info' :
                             n.priority === 'success' ? 'success' :
                             n.priority === 'warning' ? 'warning' : 'error';
                             
                showToast(n.title, type, n.message);
                
                // Mark as seen so we don't toast it again
                seenIds.current.add(n._id);
              }
            });
          }
        }
      } catch (err) {
        // Silently fail if auth is not ready or network error
      }
    };

    // Initial check (give it a small delay so we don't block immediate UI)
    setTimeout(() => {
      if (isMounted) fetchNotifications();
    }, 2000);

    // Poll every 10 seconds
    const interval = setInterval(() => {
      if (isMounted) fetchNotifications();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showToast]);

  return null; // Invisible global listener
}
