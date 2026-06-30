const { Kafka } = require("kafkajs");

const broker = process.env.KAFKA_BROKER;
if (!broker) {
  console.error("[Kafka] KAFKA_BROKER is not defined in environment variables.");
}

const cleanCert = (cert) => {
  if (!cert) return undefined;
  // If the cert is passed with literal '\n' sequences, convert them back to actual newlines
  return cert.replace(/\\n/g, "\n");
};

const kafkaConfig = {
  clientId: "logiclab-notifications",
  brokers: [broker || "localhost:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
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

module.exports = { kafka };
