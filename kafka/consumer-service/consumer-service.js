import { promiseHandler as handler } from "./shared/utils.js";
import { saveMessage } from "./shared/aggregations.js";
import { startExperiment } from "./shared/consumer-to-dashboard.js";
import { createKafkaInstance } from "./shared/kafka-create-instance.js";

const TOPIC_NAME = "air-quality-observation-topic";

(async () => {
  const kafka = createKafkaInstance("consumer-service-1");
  const consumer = kafka.consumer({ groupId: "test-consumer-group" });

  const [connectionError] = await handler(consumer.connect());
  if(connectionError) {
    return console.error("Could not connect to Kafka...");
  }

  // Subscribe consumer group to topic
  await handler(consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false }));

  // Start publish interval, experiment timeout and inform dashboard-backend
  startExperiment();

  // Run consumer and handle one message at a time
  await handler(consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      saveMessage(JSON.parse(message.value.toString()));
    }
  }));
})();
