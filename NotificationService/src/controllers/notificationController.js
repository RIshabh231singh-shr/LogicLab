const Notification = require("../models/notification");

// In-memory registry to hold active SSE client connections: Map<userId, Set<responseObject>>
const activeClients = new Map();
const MAX_SSE_PER_USER = 5;

/**
 * Registers an active client connection for Server-Sent Events (SSE).
 */
const streamNotifications = (req, res) => {
  const userId = req.user._id.toString();

  // Enforce per-user connection limits to prevent connection exhaustion attacks
  const existingConnections = activeClients.get(userId);
  if (existingConnections && existingConnections.size >= MAX_SSE_PER_USER) {
    return res.status(429).json({
      success: false,
      message: `Maximum concurrent SSE connections (${MAX_SSE_PER_USER}) exceeded for this user.`,
    });
  }

  // Set appropriate headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Initial connection establishment frame
  res.write("retry: 10000\n");
  res.write(`data: ${JSON.stringify({ message: "SSE Connection established successfully." })}\n\n`);

  // Add response object to active registry
  if (!activeClients.has(userId)) {
    activeClients.set(userId, new Set());
  }
  activeClients.get(userId).add(res);
  console.log(`[SSE Stream] User ${userId} connected. Total active connections: ${activeClients.get(userId).size}`);

  let isClosed = false;

  // Periodic keep-alive heartbeat comment frame
  const heartbeat = setInterval(() => {
    if (!isClosed) {
      res.write(":\n\n"); // Standard SSE comment frame for keep-alive
    }
  }, 30000);

  const cleanupConnection = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(heartbeat);

    const userConnections = activeClients.get(userId);
    if (userConnections) {
      userConnections.delete(res);
      if (userConnections.size === 0) {
        activeClients.delete(userId);
      }
    }
    console.log(`[SSE Stream] User ${userId} disconnected.`);
  };

  req.on("close", cleanupConnection);
  res.on("error", (err) => {
    console.warn(`[SSE Stream Error] Connection error for user ${userId}:`, err.message);
    cleanupConnection();
  });
};

/**
 * Utility to dispatch a live notification to connected SSE clients.
 */
const sendRealTimeNotification = (userId, notification) => {
  const userConnections = activeClients.get(userId.toString());
  if (userConnections && userConnections.size > 0) {
    console.log(`[SSE Stream] Dispatching notification to ${userConnections.size} socket(s) for user: ${userId}`);
    const payload = JSON.stringify(notification);
    userConnections.forEach((res) => {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (err) {
        console.warn(`[SSE Stream] Failed write to user socket:`, err.message);
      }
    });
  } else {
    console.log(`[SSE Stream] Recipient ${userId} is currently offline. Notification saved to DB only.`);
  }
};

/**
 * Graceful termination of all active SSE sockets
 */
const closeAllSSEConnections = () => {
  console.log(`[SSE Stream] Closing all active SSE connections...`);
  for (const [userId, sockets] of activeClients.entries()) {
    for (const res of sockets) {
      try {
        res.write(`data: ${JSON.stringify({ type: "SERVER_SHUTDOWN", message: "Server restarting" })}\n\n`);
        res.end();
      } catch (e) {
        // ignore
      }
    }
  }
  activeClients.clear();
};

/**
 * Fetch list of notifications for the authenticated user (paginated).
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: userId });
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + notifications.length < total,
      },
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark a specific notification as read.
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark all user notifications as read.
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a notification.
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found or unauthorized." });
    }

    res.status(200).json({ success: true, message: "Notification deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  streamNotifications,
  sendRealTimeNotification,
  closeAllSSEConnections,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

