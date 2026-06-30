const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connString = process.env.DB_CONNECT_STRING;
    if (!connString) {
      throw new Error("DB_CONNECT_STRING is not defined in environment variables");
    }
    await mongoose.connect(connString);
    console.log("[MongoDB] Connected to database successfully.");
  } catch (error) {
    console.error("[MongoDB] Connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
