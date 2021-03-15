import amqp from "amqplib";

const EXCHANGE_NAME = "test-exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "test-queue";
const BINDING_KEY = "test-binding";
const ROUTING_KEY = BINDING_KEY;

const airQualityObservation = {
  stationId: "air_station_01",
  timestamp: "2021-03-15 21:00:00",
  coordinates: {
    lat: 37.5665,
    long: 126.9780
  },
  concentrations: {
    pm25: 58.78,
    pm10: 88.05,
    no2: 45.79,
    co: 0.96,
    o3: 55.69,
    so2: 8.98
  }
};

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

  // Create exchange with given name if it does not already exist
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE);

  // Create queue with given name if it does not already exist
  await channel.assertQueue(QUEUE_NAME);

  // Binds queue to exchange according to exchange type and binding key
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);

  // Publish message to exchange with routing key
  channel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(JSON.stringify(airQualityObservation)));
  console.log(`Published message "${JSON.stringify(airQualityObservation)}" to exchange "${EXCHANGE_NAME}".`);

  await channel.close();
  await connection.close();

  process.exit(0);
})();
