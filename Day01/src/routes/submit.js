const express = require("express");
const submitRouter = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const rateLimiter = require("../middleware/rateLimiter");
const {
  submitCode,
  runCode,
  checkSubmissionStatus,
  streamSubmissionStatus,
} = require("../controllers/userSubmission");

// Rate limited: max 5 submissions per user per 60 seconds
submitRouter.post("/submit/:id", userMiddleware, rateLimiter("submit", 5, 60), submitCode);

// Polling endpoint for checking submission status (Fallback)
submitRouter.get("/status/:idempotencyKey", userMiddleware, checkSubmissionStatus);

// Real-time SSE streaming endpoint for instant submission completion push
submitRouter.get("/stream/:idempotencyKey", userMiddleware, streamSubmissionStatus);

// Run (test without saving) — rate limited to prevent abuse
submitRouter.post("/run/:id", userMiddleware, rateLimiter("run", 10, 60), runCode);

module.exports = submitRouter;

