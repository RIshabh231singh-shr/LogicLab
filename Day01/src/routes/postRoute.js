const express = require("express");
const postRouter = express.Router();
const { createPost, deletePost, getAllPosts } = require("../controllers/userPost");
const userMiddleware = require("../middleware/userMiddleware");
const { upload } = require("../utilities/cloudinaryUpload");

postRouter.get("/", userMiddleware, getAllPosts);
postRouter.post("/create", userMiddleware, upload.single("image"), createPost);
postRouter.delete("/:id", userMiddleware, deletePost);

module.exports = postRouter;
