import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "consumer-service-1",
  brokers: ["localhost:9092"]
});

const consumer = kafka.consumer({
  groupId: "test-consumer-group"
});

(async () => {
  await consumer.connect();

})();