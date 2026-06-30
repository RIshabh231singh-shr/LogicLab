require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { startNotificationConsumer } = require("./workers/notificationConsumer");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup matching frontend origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json());

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "notification-microservice", time: new Date() });
});

// Mounting Notification routes
app.use("/api/notifications", notificationRoutes);

// Initialize database, start Kafka consumer, and spin up Express Server
const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Start Kafka Consumer Background Worker
    await startNotificationConsumer();

    // 3. Listen to incoming requests
    app.listen(PORT, () => {
      console.log(`[Notification Microservice] Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("[Startup Error] Microservice failed to boot:", error.message);
    process.exit(1);
  }
};

startServer();
