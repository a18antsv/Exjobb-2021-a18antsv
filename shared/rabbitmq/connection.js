import amqp from "amqplib";
import { 
  promiseHandler as handler,
  delay
} from "./utils.js";

/**
 * Recursive function that attempts to connect to RabbitMQ until a successful connection is made.
 * @param {Object} amqpConnectionSettings The object with settings used when trying to conenct to RabbitMQ
 * @param {Number} delaySeconds The number of seconds to delay between retries
 * @param {Number} maxRetries The maximum number of connection retries before exiting recursive function with an error
 * @param {Number} retryNumber The current retry attempt number
 * @returns {Array} Two element array where the first position is the possible connection error and second position is the RabbitMQ connection
 */
export const connectToRabbitMQ = async (amqpConnectionSettings, delaySeconds = 3, maxRetries = 30, retryNumber = 0) => {
  if(retryNumber >= maxRetries) {
    return [true, undefined];
  }

  const [connectionError, connection] = await handler(amqp.connect(amqpConnectionSettings));

  if(connectionError) {
    console.error(`Could not connect to RabbitMQ. Retrying every ${delaySeconds} second(s)...`);
    await handler(delay(delaySeconds * 1000));
    return await connectToRabbitMQ(amqpConnectionSettings, delaySeconds, maxRetries, retryNumber + 1);
  }

  return [connectionError, connection];
}