import { CompressionTypes } from "kafkajs";
import { promiseHandler as handler } from "./shared/utils.js";
import { getConcentrations } from "./shared/concentration-generator.js";
import { createKafkaInstance } from "./shared/kafka-create-instance.js";
import { createTopics } from "./shared/kafka-create-topics.js";

const {
  TOPIC_NAME = "air-quality-observation-topic",
  STATION_ID: stationId = "producer-service-1",
  LAT: lat = 37.5665,
  LONG: long = 126.9780
} = process.env;

let previousConcentrations;

// Properties included in air quality data point that never changes for an air quality sensor station
// Will be merged into each air quality data point
const defaultStationProperties = { stationId, coordinates: { lat, long } };

(async () => {
  const kafka = createKafkaInstance(stationId);
  await createTopics(kafka);
  const producer = kafka.producer();

  // Some promises return void when resolving, making the response undefined and not necessary to destructure.
  const [connectionError] = await handler(producer.connect());
  if(connectionError) {
    return console.error("Could not connect to Kafka...");
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
  
    /*if(!sendError) {
      console.log(`Successfully sent air quality observation to topic ${TOPIC_NAME}`);
    }*/
  }

  await handler(producer.disconnect());

  process.exit(0);
})();
