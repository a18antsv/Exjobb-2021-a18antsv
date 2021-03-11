import amqp from "amqplib";

const EXCHANGE_NAME = "test-exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "test-queue";
const BINDING_KEY = "test-binding";
const ROUTING_KEY = BINDING_KEY;
const MESSAGE = process.argv[2] || "test-message";

const amqpConnectionSettings = {
  protocol: "amqp",
  hostname: "localhost",
  port: 5672,
  username: "guest",
  password: "guest",
  vhost: "/",
};

(async () => {
  const connection = await amqp.connect(amqpConnectionSettings);
  const channel = await connection.createChannel();

  // Create exchange with given name if it does not already exist
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE);

  // Create queue with given name if it does not already exist
  await channel.assertQueue(QUEUE_NAME);

  // Binds queue to exchange according to exchange type and binding key
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);

  // Publish message to exchange with routing key
  channel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(MESSAGE));
  console.log(`Published message "${MESSAGE}" to exchange "${EXCHANGE_NAME}".`);

  await channel.close();
  await connection.close();

  process.exit(0);
})();
