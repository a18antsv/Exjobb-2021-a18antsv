import { CompressionTypes, Kafka } from "kafkajs";

const TOPIC_NAME = "test-topic";

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
  await producer.connect();

  await producer.send({
    topic: TOPIC_NAME,
    messages: [
      MESSAGE_OBJECT
    ],
    acks: -1, // 0 = no acks, 1 = Only leader, -1 = All insync replicas
    timeout: 30000,
    compression: CompressionTypes.None,
  });

  await producer.disconnect();

  process.exit(0);
})();
