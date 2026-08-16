const { kafka } = require("../config/kafka");
const Notification = require("../models/notification");

const consumer = kafka.consumer({
  groupId: "notification-processing-group",
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

let isConsumerRunning = false;

// Helper to get formatted name of a user from rich sender payload
const formatSenderName = (user) => {
  if (!user) return "Someone";
  if (user.nickname && user.nickname.trim() !== "") {
    return user.nickname;
  }
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Someone";
};

const startNotificationConsumer = async () => {
  try {
    await consumer.connect();
    isConsumerRunning = true;
    console.log("[Kafka Consumer] Notification Worker connected successfully.");

    await consumer.subscribe({ topic: "feed-events", fromBeginning: false });

    const { sendRealTimeNotification } = require("../controllers/notificationController");

    await consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        let event;
        try {
          event = JSON.parse(message.value.toString());
        } catch (parseErr) {
          console.error("[Kafka Notification Consumer] Malformed JSON, skipping:", parseErr.message);
          return;
        }

        const eventType = event.eventType || event.type;
        const eventId = event.eventId || `${eventType}:${message.offset}`;
        console.log(`[Kafka Notification Consumer] Received event: ${eventType} (ID: ${eventId})`);

        try {
          switch (eventType) {
            case "UPVOTE":
              await handlePostUpvote(event.payload, eventId, sendRealTimeNotification);
              break;

            case "COMMENT":
              await handleCommentCreated(event.payload, eventId, sendRealTimeNotification);
              break;

            case "UPVOTE_COMMENT":
              await handleCommentUpvote(event.payload, eventId, sendRealTimeNotification);
              break;

            default:
              // Non-notification events (POST_CREATED, DOWNVOTE) are ignored
              break;
          }
        } catch (err) {
          console.error(`[Kafka Notification Consumer] Database error processing event ${eventId}:`, err.message);
          // Re-throw so KafkaJS does not falsely commit offset on critical database failure
          throw err;
        }
      },
    });
  } catch (error) {
    console.error("[Kafka Consumer] Failed to start:", error.message);
  }
};

const stopNotificationConsumer = async () => {
  try {
    if (isConsumerRunning) {
      await consumer.disconnect();
      isConsumerRunning = false;
      console.log("[Kafka Notification Consumer] Disconnected cleanly.");
    }
  } catch (err) {
    console.error("[Kafka Notification Consumer] Error disconnecting:", err.message);
  }
};

const handlePostUpvote = async (payload, eventId, sendRealTimeNotification) => {
  const { postId, userId, currentVote, newVote, recipientId, sender } = payload;

  // Only notify if it was an upvote toggle-on (not removing the upvote)
  if (currentVote === "upvote" || newVote === "none") {
    return;
  }

  if (!recipientId) {
    console.log(`[Kafka Notification Consumer] recipientId is missing in event payload`);
    return;
  }

  // Don't notify oneself
  if (recipientId.toString() === userId.toString()) {
    return;
  }

  const senderName = formatSenderName(sender);

  // Check if a similar unread notification already exists to avoid notification spam
  const existingNotification = await Notification.findOne({
    recipient: recipientId,
    "sender._id": userId,
    type: "POST_LIKE",
    postReference: postId,
    isRead: false,
  });

  if (existingNotification) {
    console.log(`[Notification Deduplication] Unread POST_LIKE already exists for post ${postId}`);
    return;
  }

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: sender,
      type: "POST_LIKE",
      postReference: postId,
      content: `${senderName} upvoted your post.`,
      eventId,
    });

    console.log(`[Notification Created] POST_LIKE for user ${recipientId}`);
    // Best-effort real-time SSE push (does not affect MongoDB durability)
    sendRealTimeNotification(recipientId.toString(), notification);
  } catch (createErr) {
    if (createErr.code === 11000) {
      console.log(`[Notification Duplicate Skip] Compound key collision for post like ${postId}`);
      return;
    }
    throw createErr;
  }
};

const handleCommentCreated = async (payload, eventId, sendRealTimeNotification) => {
  const {
    _id,
    content,
    author,
    post: postId,
    parentComment: parentCommentId,
    postAuthorId,
    parentCommentAuthorId,
    sender,
  } = payload;

  const senderName = formatSenderName(sender);
  const shortComment = content.length > 30 ? `${content.substring(0, 30)}...` : content;

  // Case 1: Reply to a comment
  if (parentCommentId && parentCommentAuthorId) {
    const recipientId = parentCommentAuthorId;
    if (recipientId.toString() !== author.toString()) {
      try {
        const notification = await Notification.create({
          recipient: recipientId,
          sender: sender,
          type: "COMMENT_CREATED",
          postReference: postId,
          commentReference: _id,
          content: `${senderName} replied to your comment: "${shortComment}"`,
          eventId,
        });

        console.log(`[Notification Created] COMMENT_CREATED (reply) for user ${recipientId}`);
        sendRealTimeNotification(recipientId.toString(), notification);
      } catch (createErr) {
        if (createErr.code === 11000) {
          console.log(`[Notification Duplicate Skip] Compound key collision for comment reply ${_id}`);
        } else {
          throw createErr;
        }
      }
    }
  }

  // Case 2: Standard comment on a post (notify post author)
  if (postAuthorId) {
    const recipientId = postAuthorId;
    if (recipientId.toString() !== author.toString()) {
      // Avoid double-notifying if reply author is also post author
      if (parentCommentId && parentCommentAuthorId && parentCommentAuthorId.toString() === recipientId.toString()) {
        // Already notified via Case 1
      } else {
        try {
          const notification = await Notification.create({
            recipient: recipientId,
            sender: sender,
            type: "COMMENT_CREATED",
            postReference: postId,
            commentReference: _id,
            content: `${senderName} commented on your post: "${shortComment}"`,
            eventId,
          });

          console.log(`[Notification Created] COMMENT_CREATED (comment) for user ${recipientId}`);
          sendRealTimeNotification(recipientId.toString(), notification);
        } catch (createErr) {
          if (createErr.code === 11000) {
            console.log(`[Notification Duplicate Skip] Compound key collision for post comment ${_id}`);
          } else {
            throw createErr;
          }
        }
      }
    }
  }
};

const handleCommentUpvote = async (payload, eventId, sendRealTimeNotification) => {
  const { commentId, userId, currentVote, newVote, recipientId, postReference, sender } = payload;

  if (currentVote === "upvote" || newVote === "none") {
    return;
  }

  if (!recipientId) {
    console.log(`[Kafka Notification Consumer] recipientId is missing in event payload`);
    return;
  }

  if (recipientId.toString() === userId.toString()) {
    return;
  }

  const senderName = formatSenderName(sender);

  // Check if similar unread notification exists
  const existingNotification = await Notification.findOne({
    recipient: recipientId,
    "sender._id": userId,
    type: "COMMENT_LIKE",
    commentReference: commentId,
    isRead: false,
  });

  if (existingNotification) {
    console.log(`[Notification Deduplication] Unread COMMENT_LIKE already exists for comment ${commentId}`);
    return;
  }

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: sender,
      type: "COMMENT_LIKE",
      postReference: postReference,
      commentReference: commentId,
      content: `${senderName} upvoted your comment.`,
      eventId,
    });

    console.log(`[Notification Created] COMMENT_LIKE for user ${recipientId}`);
    sendRealTimeNotification(recipientId.toString(), notification);
  } catch (createErr) {
    if (createErr.code === 11000) {
      console.log(`[Notification Duplicate Skip] Compound key collision for comment like ${commentId}`);
      return;
    }
    throw createErr;
  }
};

module.exports = { startNotificationConsumer, stopNotificationConsumer };

