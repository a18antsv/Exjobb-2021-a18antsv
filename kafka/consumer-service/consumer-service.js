import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "consumer-service-1",
  brokers: [
    "kafka-broker-1:9092"
  ]
});

// Create a consumer that joins a consumer group (required)
const consumer = kafka.consumer({
  groupId: "test-consumer-group"
});

(async () => {
  await consumer.connect();

  // Subscribe consumer group to topic and start using latest offset
  await consumer.subscribe({
    topic: "test-topic",
    fromBeginning: false
  });
  
  // Run consumer and handle one message at a time
  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`
        Consumed message offset ${message.offset} from partition ${partition} of topic ${topic}.
        Message had key ${message.key.toString()} and value ${message.value.toString()}.
      `);
    }
  });
  
})();