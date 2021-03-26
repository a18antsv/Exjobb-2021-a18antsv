/**
 * Statistics from a table (https://github.com/a18antsv/Exjobb-2021-a18antsv/issues/20) in a reserach paper
 * Statistics are a little off since sensors collect some faulty data causing some maximum values to be impossibly high
 */

// Total observations in the dataset that the statistics come from
// The probability property calculates the probabilty of seeing data for a specific pollutant in a specific observation
const totalObservations = 311010;

export default {
  pm25: {
    probability: 290621 / totalObservations,
    mean: 58.78,
    std: 66.11,
    min: 2.0,
    quartile1: 16.0,
    quartile2: 39.0,
    quartile3: 77.0,
    max: 1004
  },
  pm10: {
    probability: 227747 / totalObservations,
    mean: 88.05,
    std: 89.29,
    min: 5.0,
    quartile1: 37.0,
    quartile2: 70.0,
    quartile3: 113.0,
    max: 3000
  },
  no2: {
    probability: 292359 / totalObservations,
    mean: 45.79,
    std: 32.06,
    min: 1.0,
    quartile1: 20.0,
    quartile2: 39.0,
    quartile3: 66.0,
    max: 300
  },
  co: {
    probability: 268197 / totalObservations,
    mean: 0.96,
    std: 1.00,
    min: 0.1,
    quartile1: 0.4,
    quartile2: 0.7,
    quartile3: 1.2,
    max: 15
  },
  o3: {
    probability: 290589 / totalObservations,
    mean: 55.69,
    std: 53.82,
    min: 1.0,
    quartile1: 29.0,
    quartile2: 45.0,
    quartile3: 79.0,
    max: 504
  },
  so2: {
    probability: 292462 / totalObservations,
    mean: 8.98,
    std: 11.70,
    min: 1.0,
    quartile1: 2.0,
    quartile2: 5.0,
    quartile3: 11.0,
    max: 307
  }
}
