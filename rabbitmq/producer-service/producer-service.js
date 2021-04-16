import { promiseHandler as handler } from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { getConcentrations } from "./shared/concentration-generator.js";

const EXCHANGE_NAME = "air-quality-observation-exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "air-quality-observation-queue";
const BINDING_KEY = "air-quality-observation-binding";
const ROUTING_KEY = BINDING_KEY;
let previousConcentrations;

// Properties included in air quality data point that never changes for an air quality sensor station
// Will be merged into each air quality data point
const defaultStationProperties = {
  stationId: process.env.STATION_ID || "producer-service-1",
  coordinates: {
    lat: process.env.LAT || 37.5665,
    long: process.env.LONG || 126.9780
  }
};

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

  // REMOVE THIS? Producer does not need to know about the queue
  // Create queue with given name if it does not already exist
  const [assertQueueError, queueInfo] = await handler(channel.assertQueue(QUEUE_NAME, { noAck: true }));
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
