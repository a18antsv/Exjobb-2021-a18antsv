import { Kafka } from "kafkajs";
import { 
  promiseHandler as handler
} from "./utils.mjs";

const TOPIC_NAME = "test-topic";

const kafka = new Kafka({
  clientId: "consumer-service-1",
  brokers: [
    "kafka-broker-1:9092"
  ]
});

// Create a consumer that joins a consumer group (required)
const consumer = kafka.consumer({
  groupId: "test-consumer-group"
});

(async () => {
  const [connectionError] = await handler(consumer.connect());
  if(connectionError) {
    return console.error("Could not connect to Kafka...");
  }

  // Subscribe consumer group to topic and start using latest offset
  const [subscribeError] = await handler(consumer.subscribe({
    topic: TOPIC_NAME,
    fromBeginning: false
  }));
  if(!subscribeError) {
    console.log(`Successfully subscribed to topic ${TOPIC_NAME}!`);
  }
  
  // Run consumer and handle one message at a time
  await handler(consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const { 
        stationId,
        timestamp,
        coordinates,
        concentrations
      } = JSON.parse(message.value.toString());

      console.log(`
        Consumed message offset ${message.offset} from partition ${partition} of topic ${topic}.
        Message had key ${message.key.toString()}.
        Air quality observation from station with id ${stationId}.
        Timestamp: ${timestamp}
        Coordinates: 
          - Lat: ${coordinates.lat}
          - Long: ${coordinates.long}
        Concentrations: 
          - PM2.5 ${concentrations.pm25}
          - PM10 ${concentrations.pm10}
          - NO2 ${concentrations.no2}
          - CO ${concentrations.co}
          - O3 ${concentrations.o3}
          - SO2 ${concentrations.so2}
      `);
    }
  }));
})();
