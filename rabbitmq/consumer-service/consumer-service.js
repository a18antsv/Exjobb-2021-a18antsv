import amqp from "amqplib";

const QUEUE_NAME = "test-queue";

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

  // Create queue with given name if it does not already exist
  await channel.assertQueue(QUEUE_NAME);

})();
