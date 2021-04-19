import { promiseHandler as handler } from "./utils.js";

const {
  TOPIC_NAME: topic = "air-quality-observation-topic",
  NUMBER_OF_PARTITIONS = 1,
  REPLICATION_FACTOR = 1
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
      numPartitions: parseInt(NUMBER_OF_PARTITIONS),
      replicationFactor: parseInt(REPLICATION_FACTOR)
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
