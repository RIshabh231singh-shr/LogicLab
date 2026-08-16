const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utilities/cloudinaryUpload");
const { producer } = require("../config/kafka");
const { executeAtomicVote } = require("../config/redis");
const redisclient = require("../config/redis");

const createPost = async (req, res) => {
  try {
    const { content, tags } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ message: "Content or an image is required" });
    }

    if (content && content.trim().length < 2) {
      return res.status(400).json({ message: "Content too short" });
    }

    let imageUrl = null;
    let imageId = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, "logiclab_posts");
        imageUrl = result.secure_url;
        imageId = result.public_id;
      } catch (err) {
        return res.status(500).json({ message: "Image upload failed: " + err.message });
      }
    }

    let cleanTags = [];
    if (tags) {
      if (typeof tags === "string") {
        cleanTags = tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        cleanTags = tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      }
    }

    const newPostId = new mongoose.Types.ObjectId();

    const payload = {
      _id: newPostId,
      content: content ? content.trim() : "",
      tags: cleanTags,
      image: imageUrl,
      imagePublicId: imageId,
      author: req.result._id,
    };

    const event = {
      eventId: uuidv4(),
      eventType: "POST_CREATED",
      type: "POST_CREATED", // Backward-compatibility
      entityId: newPostId.toString(),
      actorId: req.result._id.toString(),
      recipientId: null,
      timestamp: Date.now(),
      payload,
    };

    // Publish to Kafka with partition key (postId) to guarantee partition-level FIFO ordering
    await producer.send({
      topic: "feed-events",
      messages: [
        {
          key: newPostId.toString(),
          value: JSON.stringify(event),
        },
      ],
    });

    res.status(202).json({
      success: true,
      message: "Post creation event published to queue.",
      post: {
        _id: newPostId,
      },
    });
  } catch (err) {
    console.error("[Create Post Error]", err.message);
    res.status(500).json({ message: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Post ID" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.author.toString() !== req.result._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Delete image from Cloudinary
    if (post.imagePublicId) {
      try {
        await deleteFromCloudinary(post.imagePublicId);
      } catch (err) {
        console.error("[Cloudinary delete failed]:", err.message);
      }
    }

    // Cascade delete comments
    try {
      await Comment.deleteMany({ post: id });
    } catch (err) {
      console.error("[Associated comments delete failed]:", err.message);
    }

    await post.deleteOne();

    // Clean up Redis score and votes
    try {
      await redisclient.del(`post:${id}:score`);
    } catch (redisErr) {
      console.error("[Redis delete score error]:", redisErr.message);
    }

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("author", "firstName lastName nickname profilePicture role emailId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = skip + posts.length < totalPosts;

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const count = await Comment.countDocuments({ post: post._id });
        return { ...post.toObject(), commentCount: count };
      })
    );

    res.status(200).json({
      success: true,
      posts: postsWithCounts,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ author: userId })
      .populate("author", "firstName lastName nickname profilePicture")
      .sort({ createdAt: -1 });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const count = await Comment.countDocuments({ post: post._id });
        return { ...post.toObject(), commentCount: count };
      })
    );

    res.status(200).json({
      success: true,
      posts: postsWithCounts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const upvotePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.result._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Post ID" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const voteKey = `vote:post:${id}:user:${userId}`;
    const scoreKey = `post:${id}:score`;
    const initialScore = (post.upvotesCount || 0) - (post.downvotesCount || 0);

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
      eventType: "UPVOTE",
      type: "UPVOTE",
      entityId: id.toString(),
      actorId: userId.toString(),
      recipientId: post.author.toString(),
      timestamp: Date.now(),
      payload: {
        postId: id,
        userId,
        currentVote: voteResult.currentVote,
        newVote: voteResult.newVote,
        scoreDelta: voteResult.scoreDelta,
        newScore: voteResult.newScore,
        recipientId: post.author,
        sender,
      },
    };

    // Publish to Kafka with post partition key
    await producer.send({
      topic: "feed-events",
      messages: [
        {
          key: id.toString(),
          value: JSON.stringify(event),
        },
      ],
    });

    res.status(202).json({
      success: true,
      message: "Upvote event queued",
      vote: voteResult.newVote,
      score: voteResult.newScore,
    });
  } catch (err) {
    console.error("[Upvote Post Error]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const downvotePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.result._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Post ID" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const voteKey = `vote:post:${id}:user:${userId}`;
    const scoreKey = `post:${id}:score`;
    const initialScore = (post.upvotesCount || 0) - (post.downvotesCount || 0);

    // Execute vote transition atomically via Redis Lua script
    const voteResult = await executeAtomicVote({
      voteKey,
      scoreKey,
      targetAction: "downvote",
      initialScore,
      ttlSeconds: 86400,
    });

    const event = {
      eventId: uuidv4(),
      eventType: "DOWNVOTE",
      type: "DOWNVOTE",
      entityId: id.toString(),
      actorId: userId.toString(),
      recipientId: post.author.toString(),
      timestamp: Date.now(),
      payload: {
        postId: id,
        userId,
        currentVote: voteResult.currentVote,
        newVote: voteResult.newVote,
        scoreDelta: voteResult.scoreDelta,
        newScore: voteResult.newScore,
      },
    };

    // Publish to Kafka with post partition key
    await producer.send({
      topic: "feed-events",
      messages: [
        {
          key: id.toString(),
          value: JSON.stringify(event),
        },
      ],
    });

    res.status(202).json({
      success: true,
      message: "Downvote event queued",
      vote: voteResult.newVote,
      score: voteResult.newScore,
    });
  } catch (err) {
    console.error("[Downvote Post Error]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleBookmarkPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.result._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Post ID" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const user = await User.findById(userId).select("bookmarkPosts");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isBookmarked = user.bookmarkPosts && user.bookmarkPosts.some((p) => p && p.toString() === id.toString());

    // Atomic update using MongoDB operators
    if (isBookmarked) {
      await User.updateOne({ _id: userId }, { $pull: { bookmarkPosts: id } });
    } else {
      await User.updateOne({ _id: userId }, { $addToSet: { bookmarkPosts: id } });
    }

    res.status(200).json({ success: true, isBookmarked: !isBookmarked });
  } catch (err) {
    console.error("[Bookmark Error]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBookmarkPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate({
      path: "bookmarkPosts",
      populate: {
        path: "author",
        select: "firstName lastName nickname profilePicture role emailId",
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const posts = user.bookmarkPosts ? user.bookmarkPosts.filter((post) => post !== null) : [];
    posts.reverse();

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const count = await Comment.countDocuments({ post: post._id });
        return { ...post.toObject(), commentCount: count };
      })
    );

    res.status(200).json({
      success: true,
      posts: postsWithCounts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createPost,
  deletePost,
  getAllPosts,
  getPostsByUser,
  upvotePost,
  downvotePost,
  toggleBookmarkPost,
  getBookmarkPostsByUser,
};