const { kafka } = require("../config/kafka");
const Notification = require("../models/notification");

const consumer = kafka.consumer({ groupId: "notification-processing-group" });

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
    console.log("[Kafka Consumer] Notification Worker connected successfully.");

    await consumer.subscribe({ topic: "feed-events", fromBeginning: false });

    // We import this dynamically to avoid circular references if any
    const { sendRealTimeNotification } = require("../controllers/notificationController");

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) return;
          const event = JSON.parse(message.value.toString());
          console.log(`[Kafka Consumer] Received event: ${event.type}`);

          switch (event.type) {
            case "UPVOTE":
              await handlePostUpvote(event.payload, sendRealTimeNotification);
              break;

            case "COMMENT":
              await handleCommentCreated(event.payload, sendRealTimeNotification);
              break;

            case "UPVOTE_COMMENT":
              await handleCommentUpvote(event.payload, sendRealTimeNotification);
              break;

            default:
              // Ignore non-notification events like post creation itself, downvotes, etc.
              break;
          }
        } catch (err) {
          console.error("[Kafka Consumer] Error processing event:", err.message);
        }
      }
    });
  } catch (error) {
    console.error("[Kafka Consumer] Failed to start:", error.message);
  }
};

const handlePostUpvote = async (payload, sendRealTimeNotification) => {
  const { postId, userId, currentVote, recipientId, sender } = payload;

  // Only notify if it was an upvote toggle-on (not removing the upvote)
  if (currentVote === "upvote") {
    return;
  }

  if (!recipientId) {
    console.log(`[Kafka Consumer] recipientId is missing in event payload`);
    return;
  }

  // Don't notify oneself
  if (recipientId.toString() === userId.toString()) {
    return;
  }

  const senderName = formatSenderName(sender);

  // Check if a similar unread notification already exists to avoid spamming
  const existingNotification = await Notification.findOne({
    recipient: recipientId,
    "sender._id": userId,
    type: "POST_LIKE",
    postReference: postId,
    isRead: false
  });

  if (existingNotification) {
    return;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: sender,
    type: "POST_LIKE",
    postReference: postId,
    content: `${senderName} upvoted your post.`
  });

  console.log(`[Notification Created] POST_LIKE for user ${recipientId}`);
  sendRealTimeNotification(recipientId.toString(), notification);
};

const handleCommentCreated = async (payload, sendRealTimeNotification) => {
  const { _id, content, author, post: postId, parentComment: parentCommentId, postAuthorId, parentCommentAuthorId, sender } = payload;

  const senderName = formatSenderName(sender);
  const shortComment = content.length > 30 ? `${content.substring(0, 30)}...` : content;

  // Case 1: Reply to a comment
  if (parentCommentId && parentCommentAuthorId) {
    const recipientId = parentCommentAuthorId;
    // Don't notify self
    if (recipientId.toString() !== author.toString()) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: sender,
        type: "COMMENT_CREATED",
        postReference: postId,
        commentReference: _id,
        content: `${senderName} replied to your comment: "${shortComment}"`
      });

      console.log(`[Notification Created] COMMENT_CREATED (reply) for user ${recipientId}`);
      sendRealTimeNotification(recipientId.toString(), notification);
    }
  }

  // Case 2: Standard comment on a post (always notify post author)
  if (postAuthorId) {
    const recipientId = postAuthorId;
    // Don't notify self, and don't double-notify if they reply to themselves on their own post
    if (recipientId.toString() !== author.toString()) {
      // Also, if the parent comment author is the same as the post author, we avoid double notifying them
      if (parentCommentId && parentCommentAuthorId && parentCommentAuthorId.toString() === recipientId.toString()) {
        // Already notified via Case 1, so do not double-notify
      } else {
        const notification = await Notification.create({
          recipient: recipientId,
          sender: sender,
          type: "COMMENT_CREATED",
          postReference: postId,
          commentReference: _id,
          content: `${senderName} commented on your post: "${shortComment}"`
        });

        console.log(`[Notification Created] COMMENT_CREATED (comment) for user ${recipientId}`);
        sendRealTimeNotification(recipientId.toString(), notification);
      }
    }
  }
};

const handleCommentUpvote = async (payload, sendRealTimeNotification) => {
  const { commentId, userId, currentVote, recipientId, postReference, sender } = payload;

  // Only notify if toggle-on
  if (currentVote === "upvote") {
    return;
  }

  if (!recipientId) {
    console.log(`[Kafka Consumer] recipientId is missing in event payload`);
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
    isRead: false
  });

  if (existingNotification) {
    return;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: sender,
    type: "COMMENT_LIKE",
    postReference: postReference,
    commentReference: commentId,
    content: `${senderName} upvoted your comment.`
  });

  console.log(`[Notification Created] COMMENT_LIKE for user ${recipientId}`);
  sendRealTimeNotification(recipientId.toString(), notification);
};

module.exports = { startNotificationConsumer };
