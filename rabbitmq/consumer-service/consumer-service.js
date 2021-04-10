import amqp from "amqplib";
import http from "http";
import { 
  promiseHandler as handler
} from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import {
  aggregations,
  saveMessage
} from "./shared/aggregations.js";

const QUEUE_NAME = "air-quality-observation-queue";
const SECONDS_BETWEEN_CONNECTION_RETRIES = 2;
const MAXIMUM_NUMBER_OF_RETRIES = 30;
const EXPERIMENT_TIME_MS = (process.env.NUMBER_OF_MINUTES || 10) * 60 * 1000;
const AGGREGATE_PUBLISH_RATE = process.env.AGGREGATE_PUBLISH_RATE || 1000;

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
  
  setInterval(() => {
    const data = JSON.stringify(aggregations);
    const request = http.request({
      hostname: 'dashboard-app',
      port: 3000,
      path: '/aggregations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    });
    request.write(data);
    request.end();

    // Empty aggregations after every time we send to dashboard backend
    Object.keys(aggregations).forEach(stationId => delete aggregations[stationId]);

  }, AGGREGATE_PUBLISH_RATE);

  setTimeout(() => {
    const request = http.request({
      hostname: "dashboard-app",
      port: 3000,
      path: "/completed",
      method: "POST",
    });
    request.end();
  }, EXPERIMENT_TIME_MS);

  console.log(`Consuming messages from ${QUEUE_NAME}...`);
  const [consumeError, { consumerTag }] = await handler(channel.consume(QUEUE_NAME, (messageObject) => {
    console.log(`Consumed air quality observation.`);
    const message = JSON.parse(messageObject.content.toString());
    saveMessage(message);

    // Acknowledge successful message consumption to delete message from queue
    channel.ack(messageObject);
  }));
  if(consumeError) {
    console.log(`Could not consume from queue ${QUEUE_NAME}`);
  }
})();
