import React, { createContext, useState, useEffect, useRef, useContext } from "react";
import { useSelector } from "react-redux";
import axiosNotification from "../utility/axiosNotification";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [activeToast, setActiveToast] = useState(null);

  const eventSourceRef = useRef(null);
  const notificationBaseUrl = import.meta.env.VITE_NOTIFICATION_API_BASE_URL || "http://localhost:3001";

  // Reset notifications on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      disconnectSSE();
    } else {
      fetchNotifications(1, true);
      connectSSE();
    }

    return () => {
      disconnectSSE();
    };
  }, [isAuthenticated, user?._id]);

  const fetchNotifications = async (targetPage = 1, replace = false) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const response = await axiosNotification.get(`/api/notifications?page=${targetPage}&limit=15`);
      const { success, notifications: fetchedNotifs, pagination, unreadCount: serverUnreadCount } = response.data;
      if (success) {
        if (replace) {
          setNotifications(fetchedNotifs);
        } else {
          // Merge lists and filter duplicates
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n._id));
            const uniqueNew = fetchedNotifs.filter((n) => !existingIds.has(n._id));
            return [...prev, ...uniqueNew];
          });
        }
        setUnreadCount(serverUnreadCount);
        setHasMore(pagination.hasMore);
        setPage(pagination.page);
      }
    } catch (error) {
      console.error("[NotificationContext] Error fetching notifications:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const connectSSE = () => {
    if (eventSourceRef.current) return;

    try {
      const sseUrl = `${notificationBaseUrl}/api/notifications/stream`;
      console.log("[SSE Connect] Initializing connection to:", sseUrl);

      // EventSource withCredentials ensures browser sends JWT cookie
      const es = new EventSource(sseUrl, { withCredentials: true });

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Ignore the connection confirmation message
          if (data.message && data.message.includes("SSE Connection")) {
            console.log("[SSE Connection] Established successfully.");
            return;
          }

          console.log("[SSE Received] New notification event:", data);

          // Add to start of array, making sure to avoid duplicates
          setNotifications((prev) => {
            if (prev.some((n) => n._id === data._id)) return prev;
            return [data, ...prev];
          });

          // Increment unread count
          if (!data.isRead) {
            setUnreadCount((prev) => prev + 1);
          }

          // Trigger dynamic UI toast
          showToast(data);
        } catch (err) {
          console.error("[SSE Parse Error] Failed to parse message:", err.message);
        }
      };

      es.onerror = (err) => {
        console.error("[SSE Connection Error] Reconnecting in background...", err);
      };

      eventSourceRef.current = es;
    } catch (err) {
      console.error("[SSE Setup Error] Failed to connect SSE:", err.message);
    }
  };

  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      console.log("[SSE Disconnect] Closing EventSource stream.");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const showToast = (notification) => {
    setActiveToast(notification);
    // Dismiss toast after 5 seconds
    setTimeout(() => {
      setActiveToast((prev) => (prev && prev._id === notification._id ? null : prev));
    }, 5000);
  };

  const markAsRead = async (id) => {
    try {
      const response = await axiosNotification.patch(`/api/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("[NotificationContext] Error marking as read:", error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axiosNotification.patch("/api/notifications/read-all");
      if (response.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("[NotificationContext] Error marking all as read:", error.message);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const notifToDelete = notifications.find((n) => n._id === id);
      const wasUnread = notifToDelete && !notifToDelete.isRead;

      const response = await axiosNotification.delete(`/api/notifications/${id}`);
      if (response.data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("[NotificationContext] Error deleting notification:", error.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        hasMore,
        page,
        activeToast,
        setActiveToast,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh: () => fetchNotifications(1, true),
      }}
    >
      {children}
      {/* Dynamic Floating Glassmorphic Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-sm animate-bounce-short glass border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex gap-3 items-start text-sm">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-indigo-500 flex items-center justify-center font-bold text-white">
            {activeToast.sender?.profilePicture ? (
              <img src={activeToast.sender.profilePicture} alt="User" className="w-full h-full object-cover" />
            ) : (
              activeToast.sender?.firstName ? activeToast.sender.firstName[0] : "S"
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-indigo-400">New Notification</p>
            <p className="text-slate-200 mt-1 leading-snug">{activeToast.content}</p>
          </div>
          <button 
            onClick={() => setActiveToast(null)} 
            className="text-slate-500 hover:text-slate-200 font-bold p-1 leading-none"
          >
            &times;
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
