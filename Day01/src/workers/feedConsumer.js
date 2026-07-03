const { kafka } = require("../config/kafka");
const Post = require("../models/post");
const Comment = require("../models/comment");
const redisclient = require("../config/redis");

const consumer = kafka.consumer({ groupId: "feed-processing-group" });

const startFeedConsumer = async () => {
  try {
    await consumer.connect();
    console.log("[Kafka] Feed Consumer connected successfully");
    
    // Subscribe to the topic
    await consumer.subscribe({ topic: "feed-events", fromBeginning: false });

    // Process messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());

          switch (event.type) {
            case "POST_CREATED":
              await handlePostCreated(event.payload);
              break;
            case "UPVOTE":
              await handleUpvote(event.payload);
              break;
            case "DOWNVOTE":
              await handleDownvote(event.payload);
              break;
            case "COMMENT":
              await handleCommentCreated(event.payload);
              break;
            case "UPVOTE_COMMENT":
              await handleUpvoteComment(event.payload);
              break;
            default:
              console.warn(`[Kafka Consumer] Unknown event type: ${event.type}`);
          }
        } catch (err) {
          console.error(`[Kafka Consumer] Error processing message`);
        }
      },
    });
  } catch (error) {
    console.error("[Kafka Consumer] Failed to start");
  }
};

// --- Handlers ---

const handlePostCreated = async (payload) => {
  const post = await Post.create({
    _id: payload._id,
    content: payload.content,
    tags: payload.tags,
    image: payload.image,
    imagePublicId: payload.imagePublicId,
    author: payload.author,
  });
  // Clear feed cache if exists
  await redisclient.del("feed:all"); // Example of cache invalidation
  return post;
};

const handleUpvote = async (payload) => {
  const { postId, userId, currentVote, newScore } = payload;
  
  const post = await Post.findById(postId);
  if (!post) return;

  if (currentVote === "upvote") {
    // It was toggled off
    post.upvotes = post.upvotes.filter(id => id.toString() !== userId.toString());
    post.upvotesCount = Math.max(0, post.upvotesCount - 1);
  } else {
    // Toggled on
    if (!post.upvotes.includes(userId)) {
      post.upvotes.push(userId);
      post.upvotesCount += 1;
    }
    if (currentVote === "downvote") {
      post.downvotes = post.downvotes.filter(id => id.toString() !== userId.toString());
      post.downvotesCount = Math.max(0, post.downvotesCount - 1);
    }
  }

  // Force sync count with redis score just to be safe, though not strictly required
  post.upvotesCount = Math.max(0, newScore); // Basic synchronization if needed
  
  await post.save();
};

const handleDownvote = async (payload) => {
  const { postId, userId, currentVote, newScore } = payload;
  
  const post = await Post.findById(postId);
  if (!post) return;

  if (currentVote === "downvote") {
    post.downvotes = post.downvotes.filter(id => id.toString() !== userId.toString());
    post.downvotesCount = Math.max(0, post.downvotesCount - 1);
  } else {
    if (!post.downvotes.includes(userId)) {
      post.downvotes.push(userId);
      post.downvotesCount += 1;
    }
    if (currentVote === "upvote") {
      post.upvotes = post.upvotes.filter(id => id.toString() !== userId.toString());
      post.upvotesCount = Math.max(0, post.upvotesCount - 1);
    }
  }

  await post.save();
};

const handleCommentCreated = async (payload) => {
  const post = await Post.findById(payload.post);
  if (!post) return;

  await Comment.create({
    _id: payload._id,
    content: payload.content,
    author: payload.author,
    post: payload.post,
    parentComment: payload.parentComment || null
  });
};

const handleUpvoteComment = async (payload) => {
  const { commentId, userId, currentVote, newScore } = payload;

  const comment = await Comment.findById(commentId);
  if (!comment) return;

  if (currentVote === "upvote") {
    comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId.toString());
    comment.upvotesCount = Math.max(0, comment.upvotesCount - 1);
  } else {
    if (!comment.upvotes.includes(userId)) {
      comment.upvotes.push(userId);
      comment.upvotesCount += 1;
    }
    if (currentVote === "downvote") {
      comment.downvotes = comment.downvotes.filter(id => id.toString() !== userId.toString());
      comment.downvotesCount = Math.max(0, comment.downvotesCount - 1);
    }
  }

  await comment.save();
};

module.exports = { startFeedConsumer };
