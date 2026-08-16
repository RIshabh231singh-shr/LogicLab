const { kafka } = require("../config/kafka");
const Post = require("../models/post");
const Comment = require("../models/comment");
const redisclient = require("../config/redis");

const consumer = kafka.consumer({
  groupId: "feed-processing-group",
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

let isConsumerRunning = false;

const startFeedConsumer = async () => {
  try {
    await consumer.connect();
    isConsumerRunning = true;
    console.log("[Kafka] Feed Consumer connected successfully");

    await consumer.subscribe({ topic: "feed-events", fromBeginning: false });

    await consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        let event;
        try {
          event = JSON.parse(message.value.toString());
        } catch (parseErr) {
          console.error("[Kafka Feed Consumer] Malformed JSON message, skipping:", parseErr.message);
          return;
        }

        const eventId = event.eventId || `${event.type}:${event.payload?._id || message.offset}`;
        const dedupKey = `event:processed:feed:${eventId}`;

        // Deduplication using Redis NX (7-day TTL)
        try {
          const isNewEvent = await redisclient.set(dedupKey, "1", {
            NX: true,
            EX: 604800,
          });

          if (!isNewEvent) {
            console.log(`[Kafka Feed Consumer] Duplicate event ignored: ${eventId}`);
            return;
          }
        } catch (redisErr) {
          console.warn("[Kafka Feed Consumer] Redis dedup check failed, proceeding with DB write:", redisErr.message);
        }

        const eventType = event.eventType || event.type;
        console.log(`[Kafka Feed Consumer] Processing event ${eventType} (ID: ${eventId})`);

        try {
          switch (eventType) {
            case "POST_CREATED":
              await handlePostCreated(event.payload);
              break;
            case "UPVOTE":
              await handleUpvote(event.payload, eventId);
              break;
            case "DOWNVOTE":
              await handleDownvote(event.payload, eventId);
              break;
            case "COMMENT":
              await handleCommentCreated(event.payload, eventId);
              break;
            case "UPVOTE_COMMENT":
              await handleUpvoteComment(event.payload, eventId);
              break;
            default:
              console.warn(`[Kafka Feed Consumer] Unknown event type: ${eventType}`);
          }
        } catch (handlerErr) {
          console.error(`[Kafka Feed Consumer] Error processing event ${eventId}:`, handlerErr.message);
          // Re-throw so KafkaJS does not commit failed offset on critical DB error
          throw handlerErr;
        }
      },
    });
  } catch (error) {
    console.error("[Kafka Feed Consumer] Failed to start:", error.message);
  }
};

const stopFeedConsumer = async () => {
  try {
    if (isConsumerRunning) {
      await consumer.disconnect();
      isConsumerRunning = false;
      console.log("[Kafka Feed Consumer] Disconnected cleanly.");
    }
  } catch (err) {
    console.error("[Kafka Feed Consumer] Error disconnecting:", err.message);
  }
};

// ── Handlers with Atomic Operations & Stale Resource Protection ──

const handlePostCreated = async (payload) => {
  // Safe creation: If post already exists (replay), catch duplicate key error gracefully
  try {
    const post = await Post.create({
      _id: payload._id,
      content: payload.content,
      tags: payload.tags,
      image: payload.image,
      imagePublicId: payload.imagePublicId,
      author: payload.author,
    });
    return post;
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[Kafka Feed Consumer] Post ${payload._id} already exists (idempotent skip).`);
      return null;
    }
    throw err;
  }
};

const handleUpvote = async (payload, eventId) => {
  const { postId, userId, currentVote, newVote } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    console.log(`[Kafka Feed Consumer] Post ${postId} not found or deleted. Stale event ${eventId} safely ignored.`);
    return;
  }

  // Atomic MongoDB operators
  if (currentVote === "upvote" || newVote === "none") {
    // Toggled off: remove upvote
    await Post.updateOne(
      { _id: postId },
      {
        $pull: { upvotes: userId },
        $inc: { upvotesCount: -1 },
      }
    );
  } else {
    // Toggled on
    const updateOps = {
      $addToSet: { upvotes: userId },
      $inc: { upvotesCount: 1 },
    };

    if (currentVote === "downvote") {
      updateOps.$pull = { downvotes: userId };
      updateOps.$inc.downvotesCount = -1;
    }

    await Post.updateOne({ _id: postId }, updateOps);
  }
};

const handleDownvote = async (payload, eventId) => {
  const { postId, userId, currentVote, newVote } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    console.log(`[Kafka Feed Consumer] Post ${postId} not found or deleted. Stale event ${eventId} safely ignored.`);
    return;
  }

  if (currentVote === "downvote" || newVote === "none") {
    // Toggled off: remove downvote
    await Post.updateOne(
      { _id: postId },
      {
        $pull: { downvotes: userId },
        $inc: { downvotesCount: -1 },
      }
    );
  } else {
    const updateOps = {
      $addToSet: { downvotes: userId },
      $inc: { downvotesCount: 1 },
    };

    if (currentVote === "upvote") {
      updateOps.$pull = { upvotes: userId };
      updateOps.$inc.upvotesCount = -1;
    }

    await Post.updateOne({ _id: postId }, updateOps);
  }
};

const handleCommentCreated = async (payload, eventId) => {
  const post = await Post.findById(payload.post);
  if (!post) {
    console.log(`[Kafka Feed Consumer] Post ${payload.post} not found or deleted. Skipping comment creation.`);
    return;
  }

  try {
    await Comment.create({
      _id: payload._id,
      content: payload.content,
      author: payload.author,
      post: payload.post,
      parentComment: payload.parentComment || null,
    });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[Kafka Feed Consumer] Comment ${payload._id} already exists (idempotent skip).`);
      return;
    }
    throw err;
  }
};

const handleUpvoteComment = async (payload, eventId) => {
  const { commentId, userId, currentVote, newVote } = payload;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    console.log(`[Kafka Feed Consumer] Comment ${commentId} not found or deleted. Stale event ${eventId} safely ignored.`);
    return;
  }

  if (currentVote === "upvote" || newVote === "none") {
    await Comment.updateOne(
      { _id: commentId },
      {
        $pull: { upvotes: userId },
        $inc: { upvotesCount: -1 },
      }
    );
  } else {
    const updateOps = {
      $addToSet: { upvotes: userId },
      $inc: { upvotesCount: 1 },
    };

    if (currentVote === "downvote") {
      updateOps.$pull = { downvotes: userId };
      updateOps.$inc.downvotesCount = -1;
    }

    await Comment.updateOne({ _id: commentId }, updateOps);
  }
};

module.exports = { startFeedConsumer, stopFeedConsumer };

