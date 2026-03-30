const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const { uploadToCloudinary,deleteFromCloudinary } = require("../utilities/cloudinaryUpload");

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

        const post = await Post.create({
            content: content ? content.trim() : "",
            tags: cleanTags,
            image: imageUrl,
            imagePublicId: imageId,
            author: req.result._id
        });

        res.status(201).json({
            success: true,
            post
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const deletePost = async (req,res)=>{
    try{
        const {id} = req.params;
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



module.exports = {
    createPost,
    deletePost,
    getAllPosts,
    getPostsByUser
};