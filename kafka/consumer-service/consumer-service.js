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

  await consumer.subscribe({
    topic: "test-topic",
    fromBeginning: false
  });
  
  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`
        Consumed message offset ${message.offset} from partition ${partition} of topic ${topic}.
        Message had key ${message.key.toString()} and value ${message.value.toString()}.
      `);
    }
  });
  
})();