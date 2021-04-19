import { promiseHandler as handler } from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { getConcentrations } from "./shared/concentration-generator.js";

const {
  QUEUE_NAME = "air-quality-observation-queue",
  EXCHANGE_NAME = "air-quality-observation-exchange",
  EXCHANGE_TYPE = "direct",
  BINDING_KEY = "air-quality-observation-binding",
  STATION_ID: stationId = "producer-service-1",
  LAT: lat = 37.5665,
  LONG: long = 126.9780
} = process.env;
const ROUTING_KEY = BINDING_KEY;

let previousConcentrations;

// Properties included in air quality data point that never changes for an air quality sensor station
// Will be merged into each air quality data point
const defaultStationProperties = { stationId, coordinates: { lat, long } };

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

  // Produce messages indefinitely until consumer detects experiment completion based on time
  while(true) {
    previousConcentrations = getConcentrations(previousConcentrations);
  
    // Merge default properties into new object by spreading and add generated concentrations and add timestamp
    const airQualityObservation = {
      ...defaultStationProperties,
      concentrations: previousConcentrations,
      timestamp: new Date().toISOString()
    };
  
    // Publish air quality observation to exchange with routing key
    channel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(JSON.stringify(airQualityObservation)));
    //console.log(`Published air quality observation to exchange "${EXCHANGE_NAME}".`);
    
    // When sending a lot of messages in a loop, nothing actually gets published on the socket until the code returns to the event loop
    // This is discussed here for another amqp library for node.js https://github.com/squaremo/amqp.node/issues/144
    // This seems to be a workaround that makes it possible to flush the publish
    await new Promise(resolve => setTimeout(resolve));
  }

  await handler(channel.close());
  await handler(connection.close())

  process.exit(0);
})();
