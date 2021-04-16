import { CompressionTypes, Kafka } from "kafkajs";
import { promiseHandler as handler } from "./shared/utils.js";
import { getConcentrations } from "./shared/concentration-generator.js";

const TOPIC_NAME = "air-quality-observation-topic";
const START_TOPIC_NAME = "start";
const NUMBER_OF_PRODUCERS = process.env.NUMBER_OF_PRODUCERS || 5;
let previousConcentrations;
let numberOfReadyProducers = 0;

// Properties included in air quality data point that never changes for an air quality sensor station
// Will be merged into each air quality data point
const defaultStationProperties = {
  stationId: process.env.STATION_ID || "producer-service-1",
  coordinates: {
    lat: process.env.LAT || 37.5665,
    long: process.env.LONG || 126.9780
  }
}

const kafka = new Kafka({
  clientId: defaultStationProperties.stationId,
  brokers: [ 
    "kafka-broker-1:9092" 
  ]
});
const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: defaultStationProperties.stationId
});

(async () => {
  const [producerConnectionError] = await handler(producer.connect());
  const [consumerConnectionError] = await handler(consumer.connect());
  if(producerConnectionError || consumerConnectionError) {
    return console.error("Could not connect to Kafka...");
  }

  const produce = async () => {
    // Produce messages indefinitely until consumer detects experiment completion based on time and dashboard shuts containers down
    while(true) {
      previousConcentrations = getConcentrations(previousConcentrations);

      // Merge default properties into new object by spreading and add generated concentrations and add timestamp
      const airQualityObservation = {
        ...defaultStationProperties,
        concentrations: previousConcentrations,
        timestamp: new Date().toISOString()
      };

      // Send air quality observation to Kafka topic
      await handler(producer.send({
        topic: TOPIC_NAME,
        messages: [{
          key: airQualityObservation.stationId,
          value: JSON.stringify(airQualityObservation)
        }],
        acks: -1, // 0 = no acks, 1 = Only leader, -1 = All insync replicas
        timeout: 30000,
        compression: CompressionTypes.None,
      }));
      //await new Promise(resolve => setTimeout(resolve));
    }

    await handler(producer.disconnect());
    process.exit(0);
  }

  const [subscribeError] = await handler(consumer.subscribe({
    topic: START_TOPIC_NAME,
    fromBeginning: true
  }));
  if(!subscribeError) {
    console.log(`Successfully subscribed to topic ${START_TOPIC_NAME}!`);
  }

  await handler(consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      numberOfReadyProducers++;
      if(numberOfReadyProducers === NUMBER_OF_PRODUCERS + 1) {
        produce();
        handler(consumer.disconnect());
      }
    }
  }));

  const [sendError] = await handler(producer.send({
    topic: START_TOPIC_NAME,
    messages: [{ 
      key: defaultStationProperties.stationId,
      value: `${defaultStationProperties.stationId} is ready!`,
      acks: -1
    }]
  }));
  if(sendError) {
    console.log(`Could not send start notification to topic ${START_TOPIC_NAME}`);
  }
})();
