import { CompressionTypes, Kafka } from "kafkajs";
import { 
  promiseHandler as handler,
  getCurrentTimestamp
} from "./shared/utils.js";
import { getConcentrations } from "./shared/concentration-generator.js";

const NUMBER_OF_MESSAGES = process.env.NUMBER_OF_MESSAGES || 10_000;
const TOPIC_NAME = "air-quality-observation-topic";
let previousConcentrations;

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

(async () => {
  // Some promises return void when resolving, making the response undefined and not necessary to destructure.
  const [connectionError] = await handler(producer.connect());
  if(connectionError) {
    return console.error("Could not connect to Kafka...");
  }

  for(let i = 0; i < NUMBER_OF_MESSAGES; i++) {
    previousConcentrations = getConcentrations(previousConcentrations);

    // Merge default properties into new object by spreading and add generated concentrations and add timestamp
    const airQualityObservation = {
      ...defaultStationProperties,
      concentrations: previousConcentrations,
      timestamp: getCurrentTimestamp()
    };

    // Send air quality observation to Kafka topic
    const [sendError, producerRecordMetadata] = await handler(producer.send({
      topic: TOPIC_NAME,
      messages: [{
        key: airQualityObservation.stationId,
        value: JSON.stringify(airQualityObservation)
      }],
      acks: -1, // 0 = no acks, 1 = Only leader, -1 = All insync replicas
      timeout: 30000,
      compression: CompressionTypes.None,
    }));
  
    if(!sendError) {
      console.log(`Successfully sent air quality observation to topic ${TOPIC_NAME}`);
    }
  }

  await handler(producer.disconnect());

  process.exit(0);
})();
