import amqp from "amqplib";
import { 
  promiseHandler as handler
} from "./utils.js";
import { connectToRabbitMQ } from "./connection.js";

const QUEUE_NAME = "test-queue";
const SECONDS_BETWEEN_CONNECTION_RETRIES = 2;
const MAXIMUM_NUMBER_OF_RETRIES = 30;

const amqpConnectionSettings = {
  protocol: "amqp",
  hostname: "rabbit-node-1",
  port: 5672,
  username: "guest",
  password: "guest",
  vhost: "/",
};

(async () => {
  const [connectionError, connection] = await connectToRabbitMQ(amqpConnectionSettings, SECONDS_BETWEEN_CONNECTION_RETRIES, MAXIMUM_NUMBER_OF_RETRIES);
  if(connectionError) {
    return console.error("Exceeded maximum number of failed connection retries to RabbitMQ. Exiting...");
  }
  console.log("Successfully connected to RabbitMQ");

  const [channelError, channel] = await handler(connection.createChannel());
  if(channelError) {
    return console.error("Could not create channel within connection...");
  }

  const [assertQueueError, queueInfo] = await handler(channel.assertQueue(QUEUE_NAME));
  if(assertQueueError) {
    console.log("Could not create queue or assert queue existance.");
  }

  console.log(`Consuming messages from ${QUEUE_NAME}...`);
  const [consumeError, { consumerTag }] = await handler(channel.consume(QUEUE_NAME, (messageObject) => {
    const { 
      stationId,
      timestamp,
      coordinates,
      concentrations
    } = JSON.parse(messageObject.content.toString());
    console.log(`
      Consumed air quality observation from station with id ${stationId}.
      Timestamp: ${timestamp}
      Coordinates: 
        - Lat: ${coordinates.lat}
        - Long: ${coordinates.long}
      Concentrations: 
        - PM2.5 ${concentrations.pm25}
        - PM10 ${concentrations.pm10}
        - NO2 ${concentrations.no2}
        - CO ${concentrations.co}
        - O3 ${concentrations.o3}
        - SO2 ${concentrations.so2}
    `);

    // Acknowledge successful message consumtion to delete message from queue
    channel.ack(messageObject);
  }));
  if(consumeError) {
    console.log(`Could not consume from queue ${QUEUE_NAME}`);
  }
})();
