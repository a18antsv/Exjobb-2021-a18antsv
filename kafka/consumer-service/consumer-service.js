import { Kafka } from "kafkajs";
import http from "http";
import { 
  promiseHandler as handler
} from "./shared/utils.js";
import {
  aggregations,
  saveMessage
} from "./shared/aggregations.js";

const TOPIC_NAME = "air-quality-observation-topic";
const EXPERIMENT_TIME_MS = (process.env.NUMBER_OF_MINUTES || 10) * 60 * 1000;
const AGGREGATE_PUBLISH_RATE = process.env.AGGREGATE_PUBLISH_RATE || 1000;

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
    fromBeginning: true
  }));
  if(!subscribeError) {
    console.log(`Successfully subscribed to topic ${TOPIC_NAME}!`);
  }

  setInterval(() => {
    const data = JSON.stringify(aggregations);
    const request = http.request({
      hostname: 'dashboard-app',
      port: 3000,
      path: '/aggregations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    });
    request.write(data);
    request.end();

    // Empty aggregations after every time we send to dashboard backend
    Object.keys(aggregations).forEach(stationId => delete aggregations[stationId]);

  }, AGGREGATE_PUBLISH_RATE);

  setTimeout(() => {
    const request = http.request({
      hostname: "dashboard-app",
      port: 3000,
      path: "/completed",
      method: "POST",
    });
    request.end();
  }, EXPERIMENT_TIME_MS);
  
  // Run consumer and handle one message at a time
  await handler(consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      //const { stationId, timestamp, coordinates, concentrations } = JSON.parse(message.value.toString());
      //console.log(`Consumed air quality observation from station with id ${stationId}. MO=${message.offset}, P=${partition} T=${topic} K=${message.key.toString()}.`);

      saveMessage(JSON.parse(message.value.toString()));
    }
  }));
})();
