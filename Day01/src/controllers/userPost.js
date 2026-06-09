const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const { uploadToCloudinary,deleteFromCloudinary } = require("../utilities/cloudinaryUpload");

const { producer } = require("../config/kafka");
const mongoose = require("mongoose");

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
                const result = await uploadToCloudinary(
                    req.file.buffer,
                    "logiclab_posts"
                );
                imageUrl = result.secure_url;
                imageId  = result.public_id;
            } catch (err) {
                return res.status(500).json({ message: "Image upload failed" });
            }
        }

        let cleanTags = [];
        if (tags) {
            if (typeof tags === 'string') {
                cleanTags = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
            } else if (Array.isArray(tags)) {
                cleanTags = tags.map(tag => tag.trim().toLowerCase()).filter(Boolean);
            }
        }

        const newPostId = new mongoose.Types.ObjectId();

        const payload = {
            _id: newPostId,
            content: content ? content.trim() : "",
            tags: cleanTags,
            image: imageUrl,
            imagePublicId: imageId,
            author: req.result._id
        };

        // Publish to Kafka instead of direct DB write
        await producer.send({
            topic: "feed-events",
            messages: [
                {
                    value: JSON.stringify({
                        type: "POST_CREATED",
                        payload
                    })
                }
            ]
        });

        res.status(202).json({
            success: true,
            message: "Post creation event published to queue.",
            post: {
                _id: newPostId
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



const deletePost = async (req,res)=>{
    try{
        const {id} = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Post ID" });
        }

        const post = await Post.findById(id);
        if(!post){
            return res.status(404).json({message:"Post not found"});
        }
        if(post.author.toString() !== req.result._id.toString()){
            return res.status(403).json({success:false,message:"Unauthorized"});
        }

        //DELETE IMAGE FROM CLOUDINARY
        if (post.imagePublicId) {
            try {
                await deleteFromCloudinary(post.imagePublicId);
            } catch (err) {
                console.error("Cloudinary delete failed:", err.message);
            }
        }


        // CASCADE DELETE COMMENTS
        try {
            await Comment.deleteMany({ post: id });
        } catch (err) {
            console.error("Failed to delete associated comments:", err.message);
        }

        await post.deleteOne();
        res.status(200).json({success:true,message:"Post deleted successfully"});
    }catch(err){
        res.status(500).json({success:false,message:err.message});
    }
}

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

        // Map comment counts
        const postsWithCounts = await Promise.all(
            posts.map(async (post) => {
                const count = await Comment.countDocuments({ post: post._id });
                return { ...post.toObject(), commentCount: count };
            })
        );

        res.status(200).json({
            success: true,
            posts: postsWithCounts,
            hasMore
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

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
            posts: postsWithCounts
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const redisclient = require("../config/redis");

const upvotePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.result._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Post ID" });
        }

        const voteKey = `vote:post:${id}:user:${userId}`;
        const scoreKey = `post:${id}:score`;

        // Check Redis idempotency/vote tracking
        const currentVote = await redisclient.get(voteKey);
        
        let scoreDelta = 0;
        if (currentVote === "upvote") {
            // Remove upvote
            await redisclient.del(voteKey);
            scoreDelta = -1;
        } else {
            // Add upvote (if it was downvote, delta is +2, else +1)
            await redisclient.setEx(voteKey, 86400, "upvote"); // 1 day TTL
            scoreDelta = currentVote === "downvote" ? 2 : 1;
        }

        // Initialize score if it does not exist in Redis
        const exists = await redisclient.exists(scoreKey);
        if (!exists) {
            const post = await Post.findById(id);
            if (post) {
                const initialScore = (post.upvotesCount || 0) - (post.downvotesCount || 0);
                await redisclient.set(scoreKey, initialScore);
            }
        }

        // Atomic counter update
        const newScore = await redisclient.incrBy(scoreKey, scoreDelta);
        // Set 7-day TTL (604800 seconds)
        await redisclient.expire(scoreKey, 604800);

        // Publish event to Kafka
        await producer.send({
            topic: "feed-events",
            messages: [
                {
                    value: JSON.stringify({
                        type: "UPVOTE",
                        payload: { postId: id, userId, currentVote, newScore }
                    })
                }
            ]
        });

        res.status(202).json({ success: true, message: "Upvote event queued" });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const downvotePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.result._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Post ID" });
        }

        const voteKey = `vote:post:${id}:user:${userId}`;
        const scoreKey = `post:${id}:score`;

        // Check Redis idempotency/vote tracking
        const currentVote = await redisclient.get(voteKey);
        
        let scoreDelta = 0;
        if (currentVote === "downvote") {
            // Remove downvote
            await redisclient.del(voteKey);
            scoreDelta = 1;
        } else {
            // Add downvote (if it was upvote, delta is -2, else -1)
            await redisclient.setEx(voteKey, 86400, "downvote");
            scoreDelta = currentVote === "upvote" ? -2 : -1;
        }

        // Initialize score if it does not exist in Redis
        const exists = await redisclient.exists(scoreKey);
        if (!exists) {
            const post = await Post.findById(id);
            if (post) {
                const initialScore = (post.upvotesCount || 0) - (post.downvotesCount || 0);
                await redisclient.set(scoreKey, initialScore);
            }
        }

        // Atomic counter update
        const newScore = await redisclient.incrBy(scoreKey, scoreDelta);
        // Set 7-day TTL (604800 seconds)
        await redisclient.expire(scoreKey, 604800);

        // Publish event to Kafka
        await producer.send({
            topic: "feed-events",
            messages: [
                {
                    value: JSON.stringify({
                        type: "DOWNVOTE",
                        payload: { postId: id, userId, currentVote, newScore }
                    })
                }
            ]
        });

        res.status(202).json({ success: true, message: "Downvote event queued" });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

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

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isBookmarked = user.bookmarkPosts && user.bookmarkPosts.includes(id);

        if (isBookmarked) {
            // Unbookmark
            user.bookmarkPosts = user.bookmarkPosts.filter(postId => postId.toString() !== id.toString());
        } else {
            // Bookmark
            if (!user.bookmarkPosts) user.bookmarkPosts = [];
            user.bookmarkPosts.push(id);
        }

        await user.save();
        res.status(200).json({ success: true, isBookmarked: !isBookmarked });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const getBookmarkPostsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).populate({
            path: 'bookmarkPosts',
            populate: {
                path: 'author',
                select: 'firstName lastName nickname profilePicture role emailId'
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // We filter out any null posts in case a bookmarked post was deleted
        const posts = user.bookmarkPosts ? user.bookmarkPosts.filter(post => post !== null) : [];

        // Reverse the array to show most recently bookmarked first
        posts.reverse();

        // Calculate comment counts if needed
        const postsWithCounts = await Promise.all(
            posts.map(async (post) => {
                const count = await Comment.countDocuments({ post: post._id });
                return { ...post.toObject(), commentCount: count };
            })
        );

        res.status(200).json({
            success: true,
            posts: postsWithCounts
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    createPost,
    deletePost,
    getAllPosts,
    getPostsByUser,
    upvotePost,
    downvotePost,
    toggleBookmarkPost,
    getBookmarkPostsByUser
};