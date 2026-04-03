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

postRouter.get("/", userMiddleware, getAllPosts);
postRouter.get("/user/:userId", userMiddleware, getPostsByUser);
postRouter.get("/user/:userId/bookmarked", userMiddleware, getBookmarkPostsByUser);
postRouter.post("/create", userMiddleware, upload.single("image"), createPost);
postRouter.delete("/:id", userMiddleware, deletePost);
postRouter.post("/upvote/:id", userMiddleware, upvotePost);
postRouter.post("/downvote/:id", userMiddleware, downvotePost);
postRouter.post("/bookmark/:id", userMiddleware, toggleBookmarkPost);

module.exports = postRouter;
