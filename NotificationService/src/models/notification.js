const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sender: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      firstName: { type: String },
      lastName: { type: String },
      nickname: { type: String },
      profilePicture: { type: String },
    },
    type: {
      type: String,
      enum: ["POST_LIKE", "COMMENT_CREATED", "COMMENT_LIKE", "SYSTEM_ALERT"],
      required: true,
    },
    postReference: {
      type: mongoose.Schema.Types.ObjectId,
    },
    commentReference: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    eventId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound deduplication index to prevent duplicate notifications under race conditions
notificationSchema.index(
  { recipient: 1, "sender._id": 1, type: 1, postReference: 1, commentReference: 1, isRead: 1 }
);

// Auto-delete notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;

