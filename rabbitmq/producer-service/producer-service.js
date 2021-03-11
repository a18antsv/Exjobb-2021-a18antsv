import amqp from "amqplib";

(async () => {

  const connection = await amqp.connect({
    protocol: "amqp",
    hostname: "localhost",
    port: 5672,
    username: "guest",
    password: "guest",
    vhost: "/",
  });

})();
