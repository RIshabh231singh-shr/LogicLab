require("dotenv").config();
const mongoose = require("mongoose");
const { Kafka } = require("kafkajs");

// Setup Kafka client
const broker = process.env.KAFKA_BROKER;
const cleanCert = (cert) => cert ? cert.replace(/\\n/g, "\n") : undefined;

const kafkaConfig = {
  clientId: "logiclab-notifications-test-publisher",
  brokers: [broker || "localhost:9092"]
};

if (broker && broker.includes("aivencloud.com")) {
  kafkaConfig.ssl = {
    rejectUnauthorized: true,
    ca: [cleanCert(process.env.KAFKA_CA_CERT)],
    key: cleanCert(process.env.KAFKA_CLIENT_KEY),
    cert: cleanCert(process.env.KAFKA_CLIENT_CERT)
  };
}

const kafka = new Kafka(kafkaConfig);
const producer = kafka.producer();

const verifyFlow = async () => {
  try {
    console.log("[Test Publisher] Connecting to MongoDB...");
    await mongoose.connect(process.env.DB_CONNECT_STRING);
    console.log("[Test Publisher] Connected to MongoDB.");

    // Generate mock ObjectIds
    const recipientId = new mongoose.Types.ObjectId();
    const senderId = new mongoose.Types.ObjectId();
    const postId = new mongoose.Types.ObjectId();
    const commentId = new mongoose.Types.ObjectId();

    const senderMock = {
      _id: senderId,
      firstName: "John",
      lastName: "Sender",
      nickname: "JohnS",
      profilePicture: "https://example.com/avatar.jpg"
    };

    console.log(`- Recipient (Author) Mock ID: ${recipientId}`);
    console.log(`- Sender (Actor) Mock ID: ${senderId}`);
    console.log(`- Post Mock ID: ${postId}`);

    // Connect Kafka Producer
    console.log("[Test Publisher] Connecting Kafka Producer...");
    await producer.connect();
    console.log("[Test Publisher] Kafka Producer connected.");

    // 1. Publish UPVOTE event
    console.log("[Test Publisher] Publishing UPVOTE event to Kafka...");
    const upvotePayload = {
      type: "UPVOTE",
      payload: {
        postId: postId,
        userId: senderId,
        currentVote: "none", // not "upvote", so it registers as a new upvote
        newScore: 1,
        recipientId: recipientId,
        sender: senderMock
      }
    };

    await producer.send({
      topic: "feed-events",
      messages: [
        { value: JSON.stringify(upvotePayload) }
      ]
    });
    console.log("[Test Publisher] UPVOTE event published.");

    // 2. Publish COMMENT event
    console.log("[Test Publisher] Publishing COMMENT event to Kafka...");
    const commentPayload = {
      type: "COMMENT",
      payload: {
        _id: commentId,
        content: "Awesome post! Thanks for sharing this.",
        author: senderId,
        post: postId,
        parentComment: null,
        postAuthorId: recipientId,
        parentCommentAuthorId: null,
        sender: senderMock
      }
    };

    await producer.send({
      topic: "feed-events",
      messages: [
        { value: JSON.stringify(commentPayload) }
      ]
    });
    console.log("[Test Publisher] COMMENT event published.");

    console.log("[Test Publisher] Done publishing. Disconnecting...");
    await producer.disconnect();
    await mongoose.disconnect();
    console.log("[Test Publisher] Disconnected successfully. Check microservice console logs!");
  } catch (error) {
    console.error("[Test Publisher] Error running flow:", error);
    process.exit(1);
  }
};

verifyFlow();
