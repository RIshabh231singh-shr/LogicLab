const Comment = require("../models/comment");
const Post = require("../models/post");

// TEACHING NOTE: Why REST for Creating/Deleting? 
// REST works exceptionally well for "mutations" (actions that CHANGE data). 
// When you create or delete a comment, you are performing a clear, singular action. 
// Standard HTTP methods like POST and DELETE make this incredibly predictable and easy to secure using our standard Express userMiddleware.

const createComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, parentCommentId } = req.body;

        if (!content || content.trim().length < 2) {
            return res.status(400).json({ success: false, message: "Comment too short." });
        }

        // 1. Ensure the Post actually exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        // 2. Create the comment using Mongoose
        const comment = await Comment.create({
            content: content.trim(),
            author: req.result._id, // Secured via userMiddleware
            post: postId,
            parentComment: parentCommentId || null
        });

        res.status(201).json({
            success: true,
            comment,
            message: "Comment added successfully!"
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

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

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Comment not found." });
        }

        const isUpvoted = comment.upvotes.includes(userId);

        if (isUpvoted) {
            // Remove Upvote
            comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId.toString());
            comment.upvotesCount = Math.max(0, comment.upvotesCount - 1);
        } else {
            // Add Upvote & Remove Downvote if exists
            comment.upvotes.push(userId);
            comment.upvotesCount += 1;
            
            // Clean up downvotes if any
            if (comment.downvotes.includes(userId)) {
                comment.downvotes = comment.downvotes.filter(id => id.toString() !== userId.toString());
                comment.downvotesCount = Math.max(0, comment.downvotesCount - 1);
            }
        }

        await comment.save();
        res.status(200).json({ success: true, upvotesCount: comment.upvotesCount, isUpvoted: !isUpvoted });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createComment,
    deleteComment,
    upvoteComment
};
