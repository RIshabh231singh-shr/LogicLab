const express = require("express");
const app = express();
require("dotenv").config(); //env file reading
const main = require("./config/db");
const cookieParser = require("cookie-parser");
const redisClient = require("./config/redis");
app.use(cookieParser());
app.use(express.json()); //json se jsobject me
const cors = require("cors"); 
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
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

// TEACHING NOTE: Why Two Different Routers?
// - The "commentRouter" exposes REST APIs to Modify (Create/Delete) the DB.
// - The "graphql" endpoint exposes a singular Query interface to Extract the DB fields!
const commentRouter = require("./routes/commentRoute");
app.use("/comment", commentRouter);

const { createHandler } = require("graphql-http/lib/use/express");
const commentSchema = require("./graphql/commentSchema");
const { connectProducer, createKafkaTopics } = require("./config/kafka");
const { startFeedConsumer } = require("./workers/feedConsumer");

// 'app.all' accepts both GET/POST requests allowing flexible client queries.
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
