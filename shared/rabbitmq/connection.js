import amqp from "amqplib";
import { 
  promiseHandler as handler,
  delay
} from "./utils.js";

/**
 * Recursive function that attempts to connect to RabbitMQ until a successful connection is made.
 * @param {Object} amqpConnectionSettings The object with settings used when trying to conenct to RabbitMQ
 * @param {Number} delaySeconds The number of seconds to delay between retries
 * @returns {Object} The connection object
 * @todo Set max number of retires (now it keeps trying forever)
 * @todo Return [error, connection] instead where error is set if max retries is exceeded, otherwise undefined
 */
export const connectToRabbitMQ = async (amqpConnectionSettings, delaySeconds) => {
  const [connectionError, connection] = await handler(amqp.connect(amqpConnectionSettings));

  if(connectionError) {
    console.error(`Could not connect to RabbitMQ. Retrying every ${delaySeconds} second(s)...`);
    await handler(delay(delaySeconds * 1000));
    return await connectToRabbitMQ(amqpConnectionSettings, delaySeconds);
  }

  return connection;
}