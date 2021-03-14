import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "producer-service-1",
  brokers: ["localhost:9092"]
});

const producer = kafka.producer();

(async () => {
  
  await producer.connect();

})();
