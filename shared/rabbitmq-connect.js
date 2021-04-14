import amqp from "amqplib";
import { promiseHandler as handler, delay } from "./utils.js";

const SECONDS_BETWEEN_CONNECTION_RETRIES = 2;
const MAXIMUM_NUMBER_OF_RETRIES = 30;

/**
 * The settings object used to connect to RabbitMQ with AMQP
 */
const amqpConnectionSettings = {
  protocol: "amqp",
  hostname: "rabbit-node-1",
  port: 5672,
  username: "guest",
  password: "guest",
  vhost: "/",
};

/**
 * Recursive function that attempts to connect to RabbitMQ until a successful connection is made.
 * @param {Object} amqpConnectionSettings The object with settings used when trying to conenct to RabbitMQ
 * @param {Number} SECONDS_BETWEEN_CONNECTION_RETRIES The number of seconds to delay between retries
 * @param {Number} MAXIMUM_NUMBER_OF_RETRIES The maximum number of connection retries before exiting recursive function with an error
 * @param {Number} retryNumber The current retry attempt number
 * @returns {Array} Two element array where the first position is the possible connection error and second position is the RabbitMQ connection
 */
export const connectToRabbitMQ = async (retryNumber = 0) => {
  if(retryNumber >= MAXIMUM_NUMBER_OF_RETRIES) {
    return [true, undefined];
  }

  const [connectionError, connection] = await handler(amqp.connect(amqpConnectionSettings));

  if(connectionError) {
    console.error(`Could not connect to RabbitMQ. Retrying every ${SECONDS_BETWEEN_CONNECTION_RETRIES} second(s)...`);
    await handler(delay(SECONDS_BETWEEN_CONNECTION_RETRIES * 1000));
    return await connectToRabbitMQ(retryNumber + 1);
  }

  return [connectionError, connection];
}
