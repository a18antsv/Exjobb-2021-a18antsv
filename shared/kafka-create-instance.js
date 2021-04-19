import { Kafka } from "kafkajs";

const { BROKERS = "kafka-broker-1:9092" } = process.env;

// In case a multi-broker cluster is setup
const brokers = BROKERS.split(",");

/**
 * Creates a new Kafka class instance for a specific service
 * @param {String} clientId The id of the service that connects to Kafka
 * @returns {Kafka} An instance of the Kafka class
 */
export const createKafkaInstance = clientId => {
  return new Kafka({ clientId, brokers });
}
