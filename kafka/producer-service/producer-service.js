import { CompressionTypes, Kafka } from "kafkajs";

const TOPIC_NAME = "test-topic";
const MESSAGE_OBJECT = {
  key: "test-key",
  value: "test-message",
};

const kafka = new Kafka({
  clientId: "producer-service-1",
  brokers: ["localhost:9092"]
});
const producer = kafka.producer();

(async () => {
  await producer.connect();

  await producer.send({
    topic: TOPIC_NAME,
    messages: [ MESSAGE_OBJECT ],
    acks: -1, // 0 = no acks, 1 = Only leader, -1 = All insync replicas
    timeout: 30000,
    compression: CompressionTypes.None,
  });

  await producer.disconnect();

  process.exit(0);
})();
