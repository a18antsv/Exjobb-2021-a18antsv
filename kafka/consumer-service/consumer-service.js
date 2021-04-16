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
const START_TOPIC_NAME = "start";
const NUMBER_OF_PRODUCERS = process.env.NUMBER_OF_PRODUCERS || 5;
const EXPERIMENT_TIME_MS = (process.env.NUMBER_OF_MINUTES || 10) * 60 * 1000;
const AGGREGATE_PUBLISH_RATE = process.env.AGGREGATE_PUBLISH_RATE || 1000;
let numberOfReadyProducers = 0;
let publishInterval = null;

const commonRequestProperties = {
  hostname: "dashboard-app",
  port: 3000,
  method: "POST",
};

const kafka = new Kafka({
  clientId: "consumer-service-1",
  brokers: [
    "kafka-broker-1:9092"
  ]
});

const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: "test-consumer-group"
});

(async () => {
  const [producerConnectionError] = await handler(producer.connect());
  const [consumerConnectionError] = await handler(consumer.connect());
  if(producerConnectionError || consumerConnectionError) {
    return console.error("Could not connect to Kafka...");
  }

  const [airTopicSubscribeError] = await handler(consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true }));
  const [startTopicSubscribeError] = await handler(consumer.subscribe({ topic: START_TOPIC_NAME, fromBeginning: true }));
  if(airTopicSubscribeError || startTopicSubscribeError) {
    return console.error("Could not subscribe to topics...");
  }
  console.log(`Successfully subscribed to topic ${TOPIC_NAME}!`)
  console.log(`Successfully subscribed to topic ${START_TOPIC_NAME}!`);

  await handler(consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if(topic === START_TOPIC_NAME) {
        numberOfReadyProducers++;
        if(numberOfReadyProducers === NUMBER_OF_PRODUCERS) {
          const [sendError] = await handler(producer.send({
            topic: START_TOPIC_NAME,
            messages: [{
              key: "consumer-service-1",
              value: "consumer-service-1 is ready",
              acks: -1
            }]
          }));
          if(sendError) {
            console.log(`Could not send start notification to topic ${START_TOPIC_NAME}`);
          }
          publishInterval = setInterval(publish, AGGREGATE_PUBLISH_RATE);
          setTimeout(completed, EXPERIMENT_TIME_MS);
          informStart();
          handler(producer.disconnect());
        }
        return;
      }

      saveMessage(JSON.parse(message.value.toString()));
    }
  }));

  /**
   * 
   */
  const publish = () => {
    console.log("PUBLISH");
    const data = JSON.stringify(aggregations);
    const request = http.request({
      path: "/aggregations",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      },
      ...commonRequestProperties
    });
    request.write(data);
    request.end();

    // Empty aggregations after every time we send to dashboard backend
    Object.keys(aggregations).forEach(stationId => delete aggregations[stationId]);
  }

  /**
   * A request to the dashboard backend for when the consumer will initialize its timeout function.
   * Used to make it possible to have a decently correct countdown on the frontend.
   */
  const informStart = () => {
    const request = http.request({
      path: "/start",
      ...commonRequestProperties
    });
    request.end();
  }

  /**
   * 
   */
  const completed = () => {
    clearInterval(publishInterval);
    const request = http.request({
      path: "/completed",
      ...commonRequestProperties
    });
    request.end();
  }
})();
