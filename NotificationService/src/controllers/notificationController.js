const Notification = require("../models/notification");

// In-memory registry to hold active SSE client connections: Map<userId, Set<responseObject>>
const activeClients = new Map();

/**
 * Registers an active client connection for Server-Sent Events (SSE).
 */
const streamNotifications = (req, res) => {
  const userId = req.user._id.toString();

  // Set appropriate headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  // Prevent connection timeout by writing headers and sending initial connection event
  res.write("retry: 10000\n");
  res.write(`data: ${JSON.stringify({ message: "SSE Connection established successfully." })}\n\n`);

  // Add the response object to active registry
  if (!activeClients.has(userId)) {
    activeClients.set(userId, new Set());
  }
  activeClients.get(userId).add(res);
  console.log(`[SSE Stream] User ${userId} connected. Total active connections for user: ${activeClients.get(userId).size}`);

  // Setup periodic heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(":\n\n"); // SSE comment as a keep-alive heartbeat
  }, 30000);

  // Clean up when client disconnects
  req.on("close", () => {
    clearInterval(heartbeat);
    const userConnections = activeClients.get(userId);
    if (userConnections) {
      userConnections.delete(res);
      if (userConnections.size === 0) {
        activeClients.delete(userId);
      }
    }
    console.log(`[SSE Stream] User ${userId} disconnected.`);
  });
};

/**
 * Utility to dispatch a live notification to connected SSE clients.
 */
const sendRealTimeNotification = (userId, notification) => {
  const userConnections = activeClients.get(userId.toString());
  if (userConnections && userConnections.size > 0) {
    console.log(`[SSE Stream] Dispatching notification in real-time to user: ${userId}`);
    const payload = JSON.stringify(notification);
    userConnections.forEach((res) => {
      res.write(`data: ${payload}\n\n`);
    });
  } else {
    console.log(`[SSE Stream] Recipient ${userId} is currently offline. Notification saved to DB only.`);
  }
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
        hasMore: skip + notifications.length < total
      },
      unreadCount
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

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    notification.isRead = true;
    await notification.save();

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
      modifiedCount: result.modifiedCount
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
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
