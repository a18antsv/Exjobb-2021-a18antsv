import amqp from "amqplib";
import { promiseHandler as handler, delay } from "./utils.js";

const {
  PROTOCOL: protocol = "amqp",
  HOSTNAME: hostname = "rabbitmq-node-1",
  PORT: port = 5672,
  USERNAME: username = "guest",
  PASSWORD: password = "guest",
  VHOST: vhost = "/",
  SECONDS_BETWEEN_CONNECTION_RETRIES = 2,
  MAXIMUM_NUMBER_OF_RETRIES = 30
} = process.env;

/**
 * The settings object used to connect to RabbitMQ with AMQP
 */
const amqpConnectionSettings = { protocol, hostname, port, username, password, vhost };

/**
 * Recursive function that attempts to connect to RabbitMQ until a successful connection is made.
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
