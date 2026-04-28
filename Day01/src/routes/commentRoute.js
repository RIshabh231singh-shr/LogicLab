const express = require("express");
const commentRouter = express.Router();
const { createComment, deleteComment, upvoteComment } = require("../controllers/userComment");
const userMiddleware = require("../middleware/userMiddleware");
const rateLimiter = require("../middleware/rateLimiter");

// TEACHING NOTE: REST Routes
// Notice how clean these are. We are saying "POST /comment/{postId}" means CREATE a comment.
// "DELETE /comment/{commentId}" means DELETE that specific comment.
// 'userMiddleware' forces authentication, making sure anonymous users can't ruin your database!

commentRouter.post("/:postId", userMiddleware, rateLimiter("comment", 30, 60), createComment);
commentRouter.delete("/:commentId", userMiddleware, deleteComment);
commentRouter.post("/upvote/:commentId", userMiddleware, rateLimiter("upvote_comment", 100, 60), upvoteComment);

module.exports = commentRouter;
