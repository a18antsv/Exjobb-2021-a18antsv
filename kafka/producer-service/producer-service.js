import { CompressionTypes, Kafka } from "kafkajs";
import { 
  promiseHandler as handler
} from "./utils.js";

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

const TOPIC_NAME = "test-topic";

const MESSAGE_OBJECT = {
  key: "air_station_01",
  value: JSON.stringify(airQualityObservation),
};

const kafka = new Kafka({
  clientId: "producer-service-1",
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

  const [sendError, producerRecordMetadata] = await handler(producer.send({
    topic: TOPIC_NAME,
    messages: [
      MESSAGE_OBJECT
    ],
    acks: -1, // 0 = no acks, 1 = Only leader, -1 = All insync replicas
    timeout: 30000,
    compression: CompressionTypes.None,
  }));

  if(!sendError) {
    console.log(`Successfully sent message! Response: ${JSON.stringify(producerRecordMetadata)}`);
  }

  await handler(producer.disconnect());

  process.exit(0);
})();
