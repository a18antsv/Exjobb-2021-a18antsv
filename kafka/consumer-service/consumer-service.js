import { promiseHandler as handler } from "./shared/utils.js";
import { saveMessage } from "./shared/aggregations.js";
import { startExperiment } from "./shared/consumer-to-dashboard.js";
import { createKafkaInstance } from "./shared/kafka-create-instance.js";
import { createTopics } from "./shared/kafka-create-topics.js";

const {
  TOPIC_NAME = "air-quality-observation-topic",
  NUMBER_OF_PARTITIONS = 1,
  CONSUMER_ID = "consumer-service-1",
  CONSUMER_GROUP_ID = "test-consumer-group",
} = process.env;

(async () => {
  const kafka = createKafkaInstance(CONSUMER_ID);
  await createTopics(kafka);
  const consumer = kafka.consumer({ groupId: CONSUMER_GROUP_ID });

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
    partitionsConsumedConcurrently: parseInt(NUMBER_OF_PARTITIONS),
    eachMessage: async ({ topic, partition, message }) => {
      saveMessage(JSON.parse(message.value.toString()));
    }
  }));
})();
