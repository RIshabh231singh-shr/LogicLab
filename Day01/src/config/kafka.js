const { Kafka } = require("kafkajs");

const broker = process.env.KAFKA_BROKER || "localhost:9092";

const cleanCert = (cert) => {
  if (!cert) return undefined;
  return cert.replace(/\\n/g, "\n");
};

const kafkaConfig = {
  clientId: "logiclab-backend",
  brokers: [broker],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
};

// Cloud SSL configuration
if (broker.includes("aivencloud.com") || process.env.KAFKA_CA_CERT) {
  kafkaConfig.ssl = {
    rejectUnauthorized: true,
    ca: [cleanCert(process.env.KAFKA_CA_CERT)],
    key: cleanCert(process.env.KAFKA_CLIENT_KEY),
    cert: cleanCert(process.env.KAFKA_CLIENT_CERT),
  };
}

const kafka = new Kafka(kafkaConfig);
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});
const admin = kafka.admin();

let isProducerConnected = false;

const connectProducer = async () => {
  try {
    await producer.connect();
    isProducerConnected = true;
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
      .filter((topic) => !existingTopics.includes(topic))
      .map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: broker.includes("aivencloud.com") ? 3 : 1,
      }));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({ topics: topicsToCreate });
      console.log(`[Kafka] Created topics: ${topicsToCreate.map((t) => t.topic).join(", ")}`);
    } else {
      console.log("[Kafka] All required topics already exist.");
    }
  } catch (err) {
    console.warn("[Kafka] Topic creation notice/fallback:", err.message);
    if (err.message && err.message.includes("Replication factor")) {
      try {
        console.log("[Kafka] Retrying topic creation with cluster defaults...");
        await admin.createTopics({
          topics: [{ topic: "feed-events" }],
        });
        console.log("[Kafka] Created feed-events with default replication.");
      } catch (retryErr) {
        console.warn("[Kafka] Topic creation retry notice:", retryErr.message);
      }
    }
  } finally {
    try {
      await admin.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
};

const disconnectKafka = async () => {
  try {
    if (isProducerConnected) {
      await producer.disconnect();
      isProducerConnected = false;
      console.log("[Kafka] Producer disconnected cleanly.");
    }
  } catch (err) {
    console.error("[Kafka] Error disconnecting producer:", err.message);
  }
};

module.exports = {
  kafka,
  producer,
  admin,
  connectProducer,
  createKafkaTopics,
  disconnectKafka,
};

