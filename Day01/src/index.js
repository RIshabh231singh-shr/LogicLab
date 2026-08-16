const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const main = require("./config/db");
const cookieParser = require("cookie-parser");
const redisClient = require("./config/redis");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

app.use(cookieParser());
app.use(express.json());

// Request correlation ID & structured request logging
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
});

const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const { AuthRouter } = require("./routes/userAuth");
app.use("/user", AuthRouter);

const ProblemRouter = require("./routes/problemCreator");
app.use("/problem", ProblemRouter);

const submitRouter = require("./routes/submit");
app.use("/submission", submitRouter);

const aiRouter = require("./routes/aiRoute");
app.use("/ai", aiRouter);

const postRouter = require("./routes/postRoute");
app.use("/post", postRouter);

const commentRouter = require("./routes/commentRoute");
app.use("/comment", commentRouter);

const { createHandler } = require("graphql-http/lib/use/express");
const commentSchema = require("./graphql/commentSchema");
const { connectProducer, createKafkaTopics, disconnectKafka } = require("./config/kafka");
const { startFeedConsumer, stopFeedConsumer } = require("./workers/feedConsumer");
const submissionQueue = require("./workers/submissionQueue");

app.all("/graphql", createHandler({ schema: commentSchema }));

const PORT = process.env.PORT || 3000;
let server;

const InitializeConnection = async () => {
  try {
    await Promise.all([main(), redisClient.connect()]);
    console.log("[DB] MongoDB and Redis connected successfully.");

    // Initialize Background Workers & Queues
    await connectProducer();
    await createKafkaTopics();
    await startFeedConsumer();

    server = app.listen(PORT, () => {
      console.log(`[Server] LogicLab Backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("[Startup Error] Initialization failed:", err.message);
  }
};

InitializeConnection();

// ── Graceful Shutdown ──
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      console.log("[Shutdown] HTTP server closed to new requests.");
    });
  }

  try {
    await stopFeedConsumer();
    await disconnectKafka();
    await submissionQueue.close();
    console.log("[Shutdown] Bull Queue and workers closed.");

    await redisClient.quit();
    console.log("[Shutdown] Redis client disconnected.");

    await mongoose.disconnect();
    console.log("[Shutdown] MongoDB connection closed.");

    console.log("[Shutdown] Graceful shutdown completed cleanly.");
    process.exit(0);
  } catch (err) {
    console.error("[Shutdown Error] Error during teardown:", err.message);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, InitializeConnection };

