const express = require("express");
const submitRouter = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const submissionRateLimiter = require("../middleware/submissionRateLimiter");
const { submitCode, runCode } = require("../controllers/userSubmission");

// Rate limited: max 50 submissions per user per hour (sliding window via Redis)
submitRouter.post("/submit/:id", userMiddleware, submissionRateLimiter, submitCode);

// Run (test without saving) — not rate limited
submitRouter.post("/run/:id", userMiddleware, runCode);
module.exports = submitRouter;
