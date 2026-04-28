const express = require("express");
const postRouter = express.Router();
const { 
    createPost, 
    deletePost, 
    getAllPosts, 
    getPostsByUser, 
    upvotePost, 
    downvotePost,
    toggleBookmarkPost,
    getBookmarkPostsByUser
} = require("../controllers/userPost");
const userMiddleware = require("../middleware/userMiddleware");
const { upload } = require("../utilities/cloudinaryUpload");
const rateLimiter = require("../middleware/rateLimiter");

postRouter.get("/", userMiddleware, getAllPosts);
postRouter.get("/user/:userId", userMiddleware, getPostsByUser);
postRouter.get("/user/:userId/bookmarked", userMiddleware, getBookmarkPostsByUser);
postRouter.post("/create", userMiddleware, rateLimiter("feed_create", 10, 3600), upload.single("image"), createPost);
postRouter.delete("/:id", userMiddleware, deletePost);
postRouter.post("/upvote/:id", userMiddleware, rateLimiter("upvote", 100, 60), upvotePost);
postRouter.post("/downvote/:id", userMiddleware, rateLimiter("upvote", 100, 60), downvotePost);
postRouter.post("/bookmark/:id", userMiddleware, toggleBookmarkPost);

module.exports = postRouter;
