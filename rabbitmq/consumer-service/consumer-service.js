import { promiseHandler as handler } from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { saveMessage } from "./shared/aggregations.js";
import { startExperiment } from "./shared/consumer-to-dashboard.js";

const { QUEUE_NAME = "air-quality-observation-queue" } = process.env;

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

  const [assertQueueError, queueInfo] = await handler(channel.assertQueue(QUEUE_NAME));
  if(assertQueueError) {
    console.log("Could not create queue or assert queue existance.");
  }
  
  // Start publish interval, experiment timeout and inform dashboard-backend
  startExperiment();

  console.log(`Consuming messages from ${QUEUE_NAME}...`);
  const [consumeError, { consumerTag }] = await handler(channel.consume(QUEUE_NAME, (messageObject) => {
    const message = JSON.parse(messageObject.content.toString());
    saveMessage(message);

    // Acknowledge successful message consumption to delete message from queue
    //channel.ack(messageObject);
  }, { noAck: true }));
  if(consumeError) {
    console.log(`Could not consume from queue ${QUEUE_NAME}`);
  }
})();
