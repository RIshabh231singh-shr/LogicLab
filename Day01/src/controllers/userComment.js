const Comment = require("../models/comment");
const Post = require("../models/post");

const { producer } = require("../config/kafka");
const redisclient = require("../config/redis");
const mongoose = require("mongoose");

// TEACHING NOTE: Why REST for Creating/Deleting? 
// REST works exceptionally well for "mutations" (actions that CHANGE data). 
// When you create or delete a comment, you are performing a clear, singular action. 
// Standard HTTP methods like POST and DELETE make this incredibly predictable and easy to secure using our standard Express userMiddleware.

const createComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, parentCommentId } = req.body;
        const userId = req.result._id;

        if (!content || content.trim().length < 2) {
            return res.status(400).json({ success: false, message: "Comment too short." });
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

        // Pre-generate the object ID so the frontend can use it immediately for optimistic UI
        const newCommentId = new mongoose.Types.ObjectId();

        const sender = {
            _id: req.result._id,
            firstName: req.result.firstName,
            lastName: req.result.lastName,
            nickname: req.result.nickname,
            profilePicture: req.result.profilePicture
        };

        const payload = {
            _id: newCommentId,
            content: content.trim(),
            author: userId,
            post: postId,
            parentComment: parentCommentId || null,
            postAuthorId,
            parentCommentAuthorId,
            sender
        };

        await producer.send({
            topic: "feed-events",
            messages: [
                {
                    value: JSON.stringify({
                        type: "COMMENT",
                        payload
                    })
                }
            ]
        });

        res.status(202).json({
            success: true,
            message: "Comment event queued successfully!",
            comment: {
                _id: newCommentId
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ success: false, message: "Invalid Comment ID" });
        }

        // 1. Locate the comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Comment not found." });
        }

        // TEACHING NOTE: Security Validation
        // We ALWAYS verify that the person requesting the DELETE is actually the author of the comment!
        if (comment.author.toString() !== req.result._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this comment!" });
        }

        // 2. Erase from the Database
        await comment.deleteOne();
        
        res.status(200).json({ success: true, message: "Comment deleted successfully!" });

    } catch (err) {
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

        // Check Redis idempotency/vote tracking
        const currentVote = await redisclient.get(voteKey);
        
        let scoreDelta = 0;
        if (currentVote === "upvote") {
            // Remove upvote
            await redisclient.del(voteKey);
            scoreDelta = -1;
        } else {
            // Add upvote
            await redisclient.setEx(voteKey, 86400, "upvote");
            scoreDelta = currentVote === "downvote" ? 2 : 1;
        }

        // Initialize score if it does not exist in Redis
        const exists = await redisclient.exists(scoreKey);
        if (!exists) {
            const initialScore = (comment.upvotesCount || 0) - (comment.downvotesCount || 0);
            await redisclient.set(scoreKey, initialScore);
        }

        // Atomic counter update
        const newScore = await redisclient.incrBy(scoreKey, scoreDelta);
        // Set 7-day TTL (604800 seconds)
        await redisclient.expire(scoreKey, 604800);

        const sender = {
            _id: req.result._id,
            firstName: req.result.firstName,
            lastName: req.result.lastName,
            nickname: req.result.nickname,
            profilePicture: req.result.profilePicture
        };

        // Publish event to Kafka
        await producer.send({
            topic: "feed-events",
            messages: [
                {
                    value: JSON.stringify({
                        type: "UPVOTE_COMMENT",
                        payload: { 
                            commentId, 
                            userId, 
                            currentVote, 
                            newScore,
                            recipientId: comment.author,
                            postReference: comment.post,
                            sender
                        }
                    })
                }
            ]
        });

        res.status(202).json({ success: true, message: "Comment upvote event queued" });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createComment,
    deleteComment,
    upvoteComment
};
