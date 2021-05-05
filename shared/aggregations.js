/**
 * The time interval for how big of an interval one Bucket should represent
 */
const aggregationRateMS = process.env.AGGREGATION_RATE || 1_000;

/**
 * Bucket is a class that aggregates messages' concentrations and latencies into a sum.
 * A Bucket represents a specific time interval (e.g. 2021-04-03T23:09:30.000Z - 2021-04-03T23:09:39.999Z).
 * All messages that were produced during this time interval will have their data aggregated into a Bucket instance.
 * The number of aggregations is stored in count to make it possible to calculate the mean value for each metric.
 */
class Bucket {
  constructor(sizeMS) {
    this.co = 0;
    this.no2 = 0;
    this.o3 = 0;
    this.pm10 = 0;
    this.pm25 = 0;
    this.so2 = 0;
    this.latency = 0;
    this.count = 0;
    this.sizeMS = sizeMS;
  }

  add({ co, no2, o3, pm10, pm25, so2, latency }) {
    this.co += co;
    this.no2 += no2;
    this.o3 += o3;
    this.pm10 += pm10;
    this.pm25 += pm25;
    this.so2 += so2;
    this.latency += latency;
    this.count++;
  }
}

/**
 * Round passed date to a specific time according to aggregationRateMS.
 * If aggregationRateMS is 10_000, the returned date string will always have seconds incrementing by 10.
 * This is used to create buckets containing data for date intervals aggregationRateMS long (e.g. 10.000Z - 19.999Z)
 * @param {Date} date The date to round
 * @returns {String} A stringified Date in standardized Date format (ISO 8601) (e.g. 2021-04-03T23:09:30.000Z)
 */
const getTimeKey = date => {
  return new Date(
    Math.floor(date.getTime() / aggregationRateMS) * aggregationRateMS
  ).toISOString();
}

export const aggregations = {};

/**
 * Aggregates the concentrations of messages produced in a specific interval into a bucket.
 * The aggregation of concentrations into buckets are made on a per station level. 
 * The latency of the message is calculated and used as as a metric in the Bucket to make it
 * possible to calculate a mean latency for the Bucket, just as for the concentrations. 
 * @param {Object} message The message to save
 */
export const saveMessage = message => {
  const { stationId, coordinates, timestamp, concentrations } = message;
  const latency = new Date().getTime() - new Date(timestamp).getTime();

  // Add stationId property to aggregations object if it does not already exist
  if (!aggregations[stationId]) {
    aggregations[stationId] = {
      coordinates,
      buckets: {}
    };
  }

  // Get a common key based on the timestamp by rounding
  // const key = getTimeKey(new Date(timestamp)); // Producer throughput
  const key = getTimeKey(new Date()); // Consumer throughput

  const station = aggregations[stationId];

  // Create a Bucket for the rounded date key if the key does not already exist
  if (!station.buckets[key]) {
    station.buckets[key] = new Bucket(aggregationRateMS);
  }

  const bucket = station.buckets[key];

  // Spread the concentrations object into a new object with the latency as a Bucket expects latency on top of all concentrations.
  bucket.add({
    latency, 
    ...concentrations
  });
}
