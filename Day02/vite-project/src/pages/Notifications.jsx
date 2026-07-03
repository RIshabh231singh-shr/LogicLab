import React, { useEffect } from "react";
import { useNotification } from "../context/NotificationContext";
import { 
  Bell, Check, Trash2, ArrowLeft, Heart, MessageSquare, AlertCircle, RefreshCw, Eye
} from "lucide-react";
import { Link, useNavigate } from "react-router";

function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    page,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
  } = useNotification();

  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    if (notif.postReference) {
      navigate(`/feedlab?postId=${notif.postReference}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "POST_LIKE":
      case "COMMENT_LIKE":
        return <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />;
      case "COMMENT_CREATED":
        return <MessageSquare className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />;
      case "SYSTEM_ALERT":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 border-r border-slate-800">
      
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 glass border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link 
            to="/feedlab" 
            className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">Your social and system alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
          <button
            onClick={refresh}
            className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main List Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <span className="loading loading-spinner loading-lg text-indigo-500"></span>
            <p className="text-sm text-slate-400">Loading your inbox...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">Inbox Clean!</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-1">
                You're all caught up. New comments or upvotes will show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`relative group flex gap-4 p-4 rounded-2xl transition-all duration-300 border ${
                  notif.isRead 
                    ? "bg-slate-900/40 border-slate-900 hover:bg-slate-900/60" 
                    : "bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                }`}
              >
                {/* Unread Indicator Bar */}
                {!notif.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-2xl" />
                )}

                {/* Left: User Avatar + Type Icon Badge */}
                <div className="relative shrink-0">
                  <Link to={`/profile/${notif.sender?._id || ""}`}>
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white overflow-hidden hover:scale-105 transition-transform">
                      {notif.sender?.profilePicture ? (
                        <img src={notif.sender.profilePicture} alt="Sender" className="w-full h-full object-cover" />
                      ) : (
                        notif.sender?.firstName ? notif.sender.firstName[0] : "S"
                      )}
                    </div>
                  </Link>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-slate-800">
                    {getIcon(notif.type)}
                  </div>
                </div>

                {/* Middle: Content */}
                <div 
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-slate-200 text-sm hover:text-indigo-400 transition-colors">
                      {notif.sender?.nickname || `${notif.sender?.firstName || ""} ${notif.sender?.lastName || ""}`.trim() || "Someone"}
                    </span>
                    <span className="text-slate-500 text-xs">{formatRelativeTime(notif.createdAt)}</span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1 leading-snug break-words pr-8">
                    {notif.content}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead(notif._id)}
                      className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Mark as read"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif._id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => fetchNotifications(page + 1)}
                className="w-full py-3 rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading && <span className="loading loading-spinner loading-xs"></span>}
                Load More Notifications
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Notifications;
