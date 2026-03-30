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

const PORT = process.env.PORT || 3000;
const InitializeConnection = async () => {
  try {
    await Promise.all([main(), redisClient.connect()]);
    console.log("DB connected");

    app.listen(PORT, () => {
      console.log("Server listening at " + PORT);
    });
  } catch (err) {
    console.log("Error " + err.message);
  }
};
InitializeConnection();
