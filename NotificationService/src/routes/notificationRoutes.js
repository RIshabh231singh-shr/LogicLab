const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  streamNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationController");

// SSE streaming endpoint (used by client to receive real-time events)
router.get("/stream", authMiddleware, streamNotifications);

// REST API for managing notifications list
router.get("/", authMiddleware, getNotifications);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.patch("/:id/read", authMiddleware, markAsRead);
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;
