import http from "http";
import { aggregations } from "./aggregations.js";

const {
  DASHBOARD_HOSTNAME = "dashboard-app",
  DASHBOARD_PORT = 3000,
  NUMBER_OF_MINUTES = 10,
  AGGREGATE_PUBLISH_RATE = 1000
} = process.env;
const EXPERIMENT_TIME_MS = NUMBER_OF_MINUTES * 60 * 1000;

const commonRequestProperties = {
  hostname: DASHBOARD_HOSTNAME,
  port: DASHBOARD_PORT,
  method: "POST"
};

let publishInterval = null
let completionTimeout = null;

/**
 * Publishes the currently available aggregations to the dashboard-backend and empties the aggregations afterwards.
 */
const publish = () => {
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
 * Informs the dashboard-backend that the experiment has been completed by running for set amount of time.
 */
const informComplete = () => {
  clearInterval(publishInterval);
  const request = http.request({
    path: "/completed",
    ...commonRequestProperties
  });
  request.end();
}

/**
 * Sets an interval that publishes messages to the dashboard-backend in intervals.
 * Sets a timeout for when the experiment should finish.
 * Informs the dashboard-backend that the consumer has initialized its experiment timer.
 * Used to make it possible to have a decently correct countdown on the frontend.
 */
export const startExperiment = () => {
  publishInterval = setInterval(publish, AGGREGATE_PUBLISH_RATE);
  completionTimeout = setTimeout(informComplete, EXPERIMENT_TIME_MS);

  const request = http.request({
    path: "/start",
    ...commonRequestProperties
  });
  request.end();
}