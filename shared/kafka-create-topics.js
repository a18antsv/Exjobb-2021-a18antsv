import { promiseHandler as handler } from "./utils.js";

const {
  TOPIC_NAME: topic = "air-quality-observation-topic",
  NUMBER_OF_PARTITIONS: numPartitions = 1,
  REPLICATION_FACTOR: replicationFactor = 1
} = process.env;

/**
 * Uses the Kafka.js admin client to create the Kafka topic that will be used.
 * @param {Kafka} kafka An instance of the Kafka class
 */
export const createTopics = async kafka => {
  const admin = kafka.admin();

  const [connectionError] = await handler(admin.connect());
  if(connectionError) {
    return console.log("Could not connect to Kafka...");
  }

  const [createError, isCreated] = await handler(admin.createTopics({
    topics: [{
      topic,
      numPartitions,
      replicationFactor
    }]
  }));

  await handler(admin.disconnect());

  if(createError) {
    return console.log("Error creating topics.");
  }
  if(!isCreated) {
    return console.log("Topics already exists.");
  }
  console.log("Created topics.");
}
