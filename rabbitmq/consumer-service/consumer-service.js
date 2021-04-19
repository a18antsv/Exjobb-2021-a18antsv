import { promiseHandler as handler } from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { saveMessage } from "./shared/aggregations.js";
import { startExperiment } from "./shared/consumer-to-dashboard.js";

const { 
  QUEUE_NAME = "air-quality-observation-queue",
  NUMBER_OF_QUEUES = 1
} = process.env;

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

  for(let i = 1; i <= NUMBER_OF_QUEUES; i++) {
    const queueName = `${QUEUE_NAME}-${i}`;

    const [assertQueueError, queueInfo] = await handler(channel.assertQueue(queueName));
    if(assertQueueError) {
      console.log("Could not create queue or assert queue existance.");
    }

    console.log(`Consuming messages from ${queueName}...`);
    const [consumeError, { consumerTag }] = await handler(channel.consume(queueName, (messageObject) => {
      saveMessage(JSON.parse(messageObject.content.toString()));
      // channel.ack(messageObject);
    }, { noAck: true }));
    if(consumeError) {
      console.log(`Could not consume from queue ${QUEUE_NAME}`);
    }
  }

  // Start publish interval, experiment timeout and inform dashboard-backend
  startExperiment();
})();
