const express = require("express");
const submitRouter = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const rateLimiter = require("../middleware/rateLimiter");
const { submitCode, runCode, checkSubmissionStatus } = require("../controllers/userSubmission");

// Rate limited: max 5 submissions per user per 60 seconds
submitRouter.post("/submit/:id", userMiddleware, rateLimiter("submit", 5, 60), submitCode);

// Polling endpoint for checking submission status
submitRouter.get("/status/:idempotencyKey", userMiddleware, checkSubmissionStatus);

// Run (test without saving) — rate limited as well to prevent abuse
submitRouter.post("/run/:id", userMiddleware, rateLimiter("run", 10, 60), runCode);
module.exports = submitRouter;
