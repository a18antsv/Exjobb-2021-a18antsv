/**
 * Class representing a Bucket of aggregated concentrations that took place for a specific pollutant, 
 * within a specific interval. Each pollutant is an instance of the Gauge class.
 */
class Bucket {
  constructor() {
    this.co = new Gauge();
    this.no2 = new Gauge();
    this.o3 = new Gauge();
    this.pm10 = new Gauge();
    this.pm25 = new Gauge();
    this.so2 = new Gauge();
  }
}

/**
 * Class that keeps track of the number of recorded concentrations for a specific pollutant
 * within a specific interval. All concentrations in the interval are aggregated into one final total value, 
 * which an average concentration for the interval can be extracted from.
 */
class Gauge {
  constructor() {
    this.count = 0;
    this.total = 0;
  }
  
  add(value) {
    this.total += value;
    this.count++;
  }

  avg() {
    return this.total / this.count;
  }
}

/**
 * Round passed date to a specific time according to aggregationRateMS.
 * If aggregationRateMS is 10_000, the returned date will always have seconds incrementing by 10.
 * This is used to create buckets containing data for date intervals aggregationRateMS long (e.g. 10.000Z - 19.999Z)
 * @param {Date} date The date to round
 * @returns {String} A stringified Date in standardized Date format (ISO 8601) (e.g. 2021-04-03T23:09:30.000Z)
 */
const getTimeKey = date => {
  const aggregationRateMS = process.env.AGGREGATION_RATE || 10_000;
  return new Date(
    Math.floor(date.getTime() / aggregationRateMS) * aggregationRateMS
  ).toISOString();
}

/**
 * Object with StationIds as first level keys.
 * Each stationId has properties coordinates and concentrations.
 * Concentrations has properties with keys using the getTimeKey() function where 
 * recorded concentrations for the key are collected into a Bucket of aggregated pollutant concentrations.
 */
export const aggregations = {};

/**
 * Aggregates the concentrations in a message to the aggregations object.
 * @param {Object} message The message to aggregate
 */
export const saveMessage = message => {
  const { stationId, coordinates, timestamp, concentrations } = message;

  // Add stationId property to aggregations object if it does not already exist
  if (!aggregations[stationId]) {
    aggregations[stationId] = {
      coordinates,
      concentrations: {}
    };
  }

  // Get a common key based on the timestamp by rounding 
  const key = getTimeKey(new Date(timestamp));

  const station = aggregations[stationId];

  // Create a Bucket for the rounded date key if the key does not already exist
  if (!station.concentrations[key]) {
    station.concentrations[key] = new Bucket();
  }


  const aggregate = station.concentrations[key];

  // Add the message's concentrations to the Bucket's different Gauges
  aggregate.co.add(concentrations.co);
  aggregate.no2.add(concentrations.no2);
  aggregate.o3.add(concentrations.o3);
  aggregate.pm10.add(concentrations.pm10);
  aggregate.pm25.add(concentrations.pm25);
  aggregate.so2.add(concentrations.so2);
}
