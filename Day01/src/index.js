const express = require("express");
const app = express();
require("dotenv").config(); //env file reading
const main = require("./config/db");
const cookieParser = require("cookie-parser");
const redisClient = require("./config/redis");
app.use(cookieParser());
app.use(express.json()); //json se jsobject me
const cors = require("cors"); 


const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
//just to test when backend is not there
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
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
const { connectProducer, createKafkaTopics } = require("./config/kafka");
const { startFeedConsumer } = require("./workers/feedConsumer");

app.all("/graphql", createHandler({ schema: commentSchema }));

const PORT = process.env.PORT || 3000;
const InitializeConnection = async () => {
  try {
    await Promise.all([main(), redisClient.connect()]);
    console.log("DB connected");

    // Initialize Background Workers & Queues
    await connectProducer();
    await createKafkaTopics(); // Ensure topics exist before starting consumer
    await startFeedConsumer();

    app.listen(PORT, () => {
      console.log("Server listening at " + PORT);
    });
  } catch (err) {
    console.log("Error " + err.message);
  }
};
InitializeConnection();
