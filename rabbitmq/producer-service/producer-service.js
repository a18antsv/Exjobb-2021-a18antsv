import amqp from "amqplib";

const EXCHANGE_NAME = "test-exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "test-queue";

(async () => {

  const connection = await amqp.connect({
    protocol: "amqp",
    hostname: "localhost",
    port: 5672,
    username: "guest",
    password: "guest",
    vhost: "/",
  });

  const channel = await connection.createChannel();

  // Create exchange with given name if it does not already exist
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE);

  // Create queue with given name if it does not already exist
  await channel.assertQueue(QUEUE_NAME);

})();
