import http from "http";
import { promiseHandler as handler } from "./shared/utils.js";
import {  connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { aggregations, saveMessage } from "./shared/aggregations.js";

const QUEUE_NAME = "air-quality-observation-queue";
const EXPERIMENT_TIME_MS = (process.env.NUMBER_OF_MINUTES || 10) * 60 * 1000;
const AGGREGATE_PUBLISH_RATE = process.env.AGGREGATE_PUBLISH_RATE || 1000;

const commonRequestProperties = {
  hostname: "dashboard-app",
  port: 3000,
  method: "POST",
};

(async () => {
  const [connectionError, connection] = await connectToRabbitMQ();
  if(connectionError) {
    return console.error("Exceeded maximum number of failed connection retries to RabbitMQ. Exiting...");
  }
  console.log("Successfully connected to RabbitMQ");

  const [channelError, channel] = await handler(connection.createChannel());
  if(channelError) {
    return console.error("Could not create channel within connection...");
  }

  const [assertQueueError, queueInfo] = await handler(channel.assertQueue(QUEUE_NAME, { noAck: true }));
  if(assertQueueError) {
    console.log("Could not create queue or assert queue existance.");
  }
  
  const publishInterval = setInterval(() => {
    const data = JSON.stringify(aggregations);
    const request = http.request({
      path: "/aggregations",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      },
      ...commonRequestProperties
    });
    request.write(data);
    request.end();

    // Empty aggregations after every time we send to dashboard backend
    Object.keys(aggregations).forEach(stationId => delete aggregations[stationId]);

  }, AGGREGATE_PUBLISH_RATE);

  // A request to the dashboard backend for when the consumer will initialize its timeout function
  // Used to make it possible to have a decently correct countdown on the frontend
  {
    const request = http.request({
      path: "/start",
      ...commonRequestProperties
    });
    request.end();
  }

  setTimeout(() => {
    clearInterval(publishInterval);
    const request = http.request({
      path: "/completed",
      ...commonRequestProperties
    });
    request.end();
  }, EXPERIMENT_TIME_MS);

  console.log(`Consuming messages from ${QUEUE_NAME}...`);
  const [consumeError, { consumerTag }] = await handler(channel.consume(QUEUE_NAME, (messageObject) => {
    //console.log(`Consumed air quality observation.`);
    const message = JSON.parse(messageObject.content.toString());
    saveMessage(message);

    // Acknowledge successful message consumption to delete message from queue
    channel.ack(messageObject);
  }));
  if(consumeError) {
    console.log(`Could not consume from queue ${QUEUE_NAME}`);
  }
})();
