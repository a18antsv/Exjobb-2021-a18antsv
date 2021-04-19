import { delay, promiseHandler as handler } from "./shared/utils.js";
import { connectToRabbitMQ } from "./shared/rabbitmq-connect.js";
import { getConcentrations } from "./shared/concentration-generator.js";

const {
  QUEUE_NAME = "air-quality-observation-queue",
  NUMBER_OF_QUEUES = 1,
  EXCHANGE_NAME = "air-quality-observation-exchange",
  EXCHANGE_TYPE = "direct",
  BINDING_KEY = "air-quality-observation-binding",
  STATION_ID: stationId = "producer-service-1",
  LAT: lat = 37.5665,
  LONG: long = 126.9780
} = process.env;

const bindingKeys = [];

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

  for(let i = 1; i <= NUMBER_OF_QUEUES; i++) {
    const queueName = `${QUEUE_NAME}-${i}`;
    const bindingKey = `${BINDING_KEY}-${i}`;
    
    // Create queue with given name if it does not already exist
    const [assertQueueError, queueInfo] = await handler(channel.assertQueue(queueName));
    if(assertQueueError) {
      console.log("Could not create queue or assert queue existance.");
    }
  
    // Binds queue to exchange according to exchange type and binding key
    const [bindError] = await handler(channel.bindQueue(queueName, EXCHANGE_NAME, bindingKey));
    if(bindError) {
      console.error("Could not bind queue to exchange");
    }

    bindingKeys.push(bindingKey);
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

    // Get random routing key from available binding keys to let exchange randomly route to one of available queues
    const routingKey = bindingKeys[bindingKeys.length * Math.random() | 0];
  
    /**
     * When sending a lot of messages in a loop, nothing actually gets published on the socket until the code returns to the event loop (drain event).
     * This is discussed here for another amqp library for node https://github.com/squaremo/amqp.node/issues/144.
     * Publish returns a boolean for if we can keep sending or if a drain event is needed.
     * Drain event seems to be needed for every 2048 messages published (tested by counting how often keepSending is false).
     * Waiting 0-1ms seems to be a workaround that makes it possible to flush the publish.
     */
    const keepSending = channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(airQualityObservation)));
    if(!keepSending) {
      await delay(0);
    }
  }

  await handler(channel.close());
  await handler(connection.close())

  process.exit(0);
})();
