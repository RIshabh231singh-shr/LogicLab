const { Kafka } = require("kafkajs");

const broker = process.env.KAFKA_BROKER || "localhost:9092";

const cleanCert = (cert) => {
  if (!cert) return undefined;
  return cert.replace(/\\n/g, "\n");
};

const kafkaConfig = {
  clientId: "logiclab-notifications",
  brokers: [broker],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
};

if (broker.includes("aivencloud.com") || process.env.KAFKA_CA_CERT) {
  kafkaConfig.ssl = {
    rejectUnauthorized: true,
    ca: [cleanCert(process.env.KAFKA_CA_CERT)],
    key: cleanCert(process.env.KAFKA_CLIENT_KEY),
    cert: cleanCert(process.env.KAFKA_CLIENT_CERT),
  };
}

const kafka = new Kafka(kafkaConfig);

module.exports = { kafka };

