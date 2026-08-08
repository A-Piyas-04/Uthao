import { createContext, useState, useCallback } from "react";
import { getNotifications, markNotificationRead } from "../api/notificationApi";

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (userId) => {
    setLoading(true);
    try {
      const data = await getNotifications(userId);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value = { notifications, unreadCount, loading, fetchNotifications, markRead };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}
