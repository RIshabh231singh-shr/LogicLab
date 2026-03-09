const express = require("express");
const aiRouter = express.Router();
const userMiddleware = require("../middleware/userMiddleware");
const { aiChat } = require("../controllers/aiController");

// POST /ai/chat  — requires logged-in user
aiRouter.post("/chat", userMiddleware, aiChat);

module.exports = aiRouter;
