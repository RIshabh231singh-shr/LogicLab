const express = require("express");
const commentRouter = express.Router();
const { createComment, deleteComment, upvoteComment } = require("../controllers/userComment");
const userMiddleware = require("../middleware/userMiddleware");

// TEACHING NOTE: REST Routes
// Notice how clean these are. We are saying "POST /comment/{postId}" means CREATE a comment.
// "DELETE /comment/{commentId}" means DELETE that specific comment.
// 'userMiddleware' forces authentication, making sure anonymous users can't ruin your database!

commentRouter.post("/:postId", userMiddleware, createComment);
commentRouter.delete("/:commentId", userMiddleware, deleteComment);
commentRouter.post("/upvote/:commentId", userMiddleware, upvoteComment);

module.exports = commentRouter;
