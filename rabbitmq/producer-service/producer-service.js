import amqp from "amqplib";
import { 
  promiseHandler as handler,
  getCurrentTimestamp
} from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { getConcentrations } from "./shared/concentration-generator.js";

const EXCHANGE_NAME = "air-quality-observation-exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "air-quality-observation-queue";
const BINDING_KEY = "air-quality-observation-binding";
const ROUTING_KEY = BINDING_KEY;
const SECONDS_BETWEEN_CONNECTION_RETRIES = 2;
const MAXIMUM_NUMBER_OF_RETRIES = 30;
const NUMBER_OF_MESSAGES = process.env.NUMBER_OF_MESSAGES || 10_000;
let previousConcentrations;

// Properties included in air quality data point that never changes for an air quality sensor station
// Will be merged into each air quality data point
const defaultStationProperties = {
  stationId: "air-station-01",
  coordinates: {
    lat: 37.5665,
    long: 126.9780
  }
};

// Settings used to connect to RabbitMQ
const amqpConnectionSettings = {
  protocol: "amqp",
  hostname: "rabbit-node-1",
  port: 5672,
  username: "guest",
  password: "guest",
  vhost: "/",
};

(async () => {
  const [connectionError, connection] = await connectToRabbitMQ(amqpConnectionSettings, SECONDS_BETWEEN_CONNECTION_RETRIES, MAXIMUM_NUMBER_OF_RETRIES);
  if(connectionError) {
    return console.error("Exceeded maximum number of failed connection retries to RabbitMQ. Exiting...");
  }
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

  for(let i = 0; i < NUMBER_OF_MESSAGES; i++) {
    previousConcentrations = getConcentrations(previousConcentrations);

    // Merge default properties into new object by spreading and add generated concentrations and add timestamp
    const airQualityObservation = {
      ...defaultStationProperties,
      concentrations: previousConcentrations,
      timestamp: getCurrentTimestamp()
    };

    // Publish air quality observation to exchange with routing key
    channel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(JSON.stringify(airQualityObservation)));
    console.log(`Published air quality observation to exchange "${EXCHANGE_NAME}".`);
  }

  await handler(channel.close());
  await handler(connection.close())

  process.exit(0);
})();
