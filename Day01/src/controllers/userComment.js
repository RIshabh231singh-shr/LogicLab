const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Comment = require("../models/comment");
const Post = require("../models/post");
const { producer } = require("../config/kafka");
const { executeAtomicVote } = require("../config/redis");
const redisclient = require("../config/redis");

const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.result._id;

    if (!content || content.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Comment too short." });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: "Invalid Post ID." });
    }

    // Fetch post to verify it exists and get its author
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }
    const postAuthorId = post.author;

    // Fetch parent comment if parentCommentId is provided
    let parentCommentAuthorId = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ success: false, message: "Invalid parent comment ID." });
      }
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        parentCommentAuthorId = parentComment.author;
      }
    }

    // Pre-generate the object ID for optimistic UI
    const newCommentId = new mongoose.Types.ObjectId();

    const sender = {
      _id: req.result._id,
      firstName: req.result.firstName,
      lastName: req.result.lastName,
      nickname: req.result.nickname,
      profilePicture: req.result.profilePicture,
    };

    const payload = {
      _id: newCommentId,
      content: content.trim(),
      author: userId,
      post: postId,
      parentComment: parentCommentId || null,
      postAuthorId,
      parentCommentAuthorId,
      sender,
    };

    const event = {
      eventId: uuidv4(),
      eventType: "COMMENT",
      type: "COMMENT",
      entityId: postId.toString(),
      actorId: userId.toString(),
      recipientId: postAuthorId.toString(),
      timestamp: Date.now(),
      payload,
    };

    // Publish to Kafka partitioned by postId to guarantee sequential order of comments on that post
    await producer.send({
      topic: "feed-events",
      messages: [
        {
          key: postId.toString(),
          value: JSON.stringify(event),
        },
      ],
    });

    res.status(202).json({
      success: true,
      message: "Comment event queued successfully!",
      comment: {
        _id: newCommentId,
      },
    });
  } catch (err) {
    console.error("[Create Comment Error]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: "Invalid Comment ID" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    if (comment.author.toString() !== req.result._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this comment!" });
    }

    // Delete comment and any replies
    await Comment.deleteMany({
      $or: [{ _id: commentId }, { parentComment: commentId }],
    });

    // Clean up Redis score
    try {
      await redisclient.del(`comment:${commentId}:score`);
    } catch (redisErr) {
      console.error("[Redis clean comment score error]", redisErr.message);
    }

    res.status(200).json({ success: true, message: "Comment deleted successfully!" });
  } catch (err) {
    console.error("[Delete Comment Error]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const upvoteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.result._id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: "Invalid Comment ID" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    const voteKey = `vote:comment:${commentId}:user:${userId}`;
    const scoreKey = `comment:${commentId}:score`;
    const initialScore = (comment.upvotesCount || 0) - (comment.downvotesCount || 0);

    // Execute vote transition atomically via Redis Lua script
    const voteResult = await executeAtomicVote({
      voteKey,
      scoreKey,
      targetAction: "upvote",
      initialScore,
      ttlSeconds: 86400,
    });

    const sender = {
      _id: req.result._id,
      firstName: req.result.firstName,
      lastName: req.result.lastName,
      nickname: req.result.nickname,
      profilePicture: req.result.profilePicture,
    };

    const event = {
      eventId: uuidv4(),
      eventType: "UPVOTE_COMMENT",
      type: "UPVOTE_COMMENT",
      entityId: commentId.toString(),
      actorId: userId.toString(),
      recipientId: comment.author.toString(),
      timestamp: Date.now(),
      payload: {
        commentId,
        userId,
        currentVote: voteResult.currentVote,
        newVote: voteResult.newVote,
        scoreDelta: voteResult.scoreDelta,
        newScore: voteResult.newScore,
        recipientId: comment.author,
        postReference: comment.post,
        sender,
      },
    };

    // Publish to Kafka partitioned by commentId
    await producer.send({
      topic: "feed-events",
      messages: [
        {
          key: commentId.toString(),
          value: JSON.stringify(event),
        },
      ],
    });

    res.status(202).json({
      success: true,
      message: "Comment upvote event queued",
      vote: voteResult.newVote,
      score: voteResult.newScore,
    });
  } catch (err) {
    console.error("[Upvote Comment Error]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createComment,
  deleteComment,
  upvoteComment,
};

