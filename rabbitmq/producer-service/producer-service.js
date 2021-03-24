import amqp from "amqplib";
import { 
  promiseHandler as handler
} from "./utils.js";
import { connectToRabbitMQ } from "./connection.js";

const EXCHANGE_NAME = "test-exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "test-queue";
const BINDING_KEY = "test-binding";
const ROUTING_KEY = BINDING_KEY;
const SECONDS_BETWEEN_CONNECTION_ATTEMPTS = 2;

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
  const connection = await connectToRabbitMQ(amqpConnectionSettings, SECONDS_BETWEEN_CONNECTION_ATTEMPTS);
  console.log("Successfully connected to RabbitMQ");

  const [channelError, channel] = await handler(connection.createChannel());
  if(channelError) {
    return console.error("Could not create channel within connection...");
  }

  // Create exchange with given name if it does not already exist
  const [assertExchangeError, exchangeInfo] = await handler(channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE));
  if(assertExchangeError) {
    console.log("Could not create exchange or assert exchange existance.");
  }

  // Create queue with given name if it does not already exist
  const [assertQueueError, queueInfo] = await handler(channel.assertQueue(QUEUE_NAME));
  if(assertQueueError) {
    console.log("Could not create queue or assert queue existance.");
  }

  // Binds queue to exchange according to exchange type and binding key
  const [bindError] = await handler(channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY));
  if(bindError) {
    console.error("Could not bind queue to exchange");
  }

  // Publish message to exchange with routing key
  channel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(JSON.stringify(airQualityObservation)));
  console.log(`Published message "${JSON.stringify(airQualityObservation)}" to exchange "${EXCHANGE_NAME}".`);

  await handler(channel.close());
  await handler(connection.close())

  process.exit(0);
})();
