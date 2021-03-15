import amqp from "amqplib";

const QUEUE_NAME = "test-queue";

const amqpConnectionSettings = {
  protocol: "amqp",
  hostname: "rabbit-node-1",
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

  console.log(`Consuming messages from ${QUEUE_NAME}...`);
  await channel.consume(QUEUE_NAME, (messageObject) => {
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
  });
})();
