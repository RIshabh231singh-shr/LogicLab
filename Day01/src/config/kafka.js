const { Kafka } = require("kafkajs");
const fs = require("fs");
const path = require("path");

const broker = process.env.KAFKA_BROKER || "localhost:9092";

const kafkaConfig = {
  clientId: "logiclab-backend",
  brokers: [broker],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
};

// Check if we are connecting to a cloud broker that requires SSL (like Aiven)
if (broker.includes("aivencloud.com")) {
  kafkaConfig.ssl = {
    rejectUnauthorized: true,
    ca: [process.env.KAFKA_CA_CERT],
    key: process.env.KAFKA_CLIENT_KEY,
    cert: process.env.KAFKA_CLIENT_CERT
  };
}

const kafka = new Kafka(kafkaConfig);
const producer = kafka.producer();
const admin = kafka.admin();

// Connect the producer early
const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("[Kafka] Producer connected successfully");
  } catch (error) {
    console.error("[Kafka] Producer connection error:", error.message);
  }
};

const createKafkaTopics = async () => {
  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();
    
    const requiredTopics = ["feed-events"];
    const topicsToCreate = requiredTopics
      .filter(topic => !existingTopics.includes(topic))
      .map(topic => ({
         topic,
         numPartitions: 3,
         replicationFactor: 3 // Aiven generally requires replication factor 3
      }));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({ topics: topicsToCreate });
      console.log(`[Kafka] Created topics: ${topicsToCreate.map(t => t.topic).join(", ")}`);
    } else {
      console.log("[Kafka] All required topics already exist.");
    }
  } catch (err) {
    console.error("[Kafka] Error creating topics:", err.message);
    // Fallback: If 3x replication factor fails, try 1x or cluster defaults
    if (err.message.includes("Replication factor")) {
      try {
        console.log("[Kafka] Retrying topic creation with cluster defaults...");
        await admin.createTopics({ 
           topics: [{ topic: "feed-events" }] 
        });
        console.log("[Kafka] Created feed-events with default replication.");
      } catch (retryErr) {
        console.error("[Kafka] Retry failed:", retryErr.message);
      }
    }
  } finally {
    await admin.disconnect();
  }
};

module.exports = { kafka, producer, admin, connectProducer, createKafkaTopics };
