import seedrandom from "seedrandom";
import { getRandomFloat } from "./utils.js";
import concentrationStats from "./concentration-statistics.js"

// The seed used to replicate generated datasets. 
const SEED = process.env.STATION_ID || "producer-service-1";
// Using the alea pseudo random number generator since it was one of the fastest according to https://www.npmjs.com/package/seedrandom
const { alea } = seedrandom;
// rng is the function to invoke, now based on the chosen seed with the alea PRNG
const rng = alea(SEED);

/**
 * Generates an object of pollutants where each pollutant has properties to use when generating its concentrations
 * @param {Object} statistics Pollutant concentration statistics used to base some period properties on
 * @returns {Object} Pollutants with their period properties
 */
const getPollutantPeriods = (statistics = concentrationStats) => {
  const periods = {};

  for(const pollutant of Object.keys(statistics)) {
    periods[pollutant] = {};
    const period = periods[pollutant];
    const statistic = statistics[pollutant];
    period.sineWavelength = statistic.quartile3 - statistic.quartile1; // Maximum allowed length between sine wave peaks
    period.variance = statistic.quartile1 / period.sineWavelength; // Maximum allowed change from one concentration to the other 
    period.trend = 0 / period.sineWavelength; // Positive (+), negative (-) or no trend (0) in the movement
    period.sindeIndex = Math.PI * rng(), // Sine index regulating positive or negative movement
    period.increment = Math.PI / period.sineWavelength; // How much to increment the sine index
    period.noise = statistic.min; // Extra noise factor in the data
    period.getRandomVariance = () => period.variance * getRandomFloat(rng, -1, -1);
    period.getRandomIncrement = () => period.increment * getRandomFloat(rng, -1, 1);
    period.getRandomNoise = () =>  period.noise * getRandomFloat(rng, -1, 1);
  }
  
  return periods
}

const pollutantPeriods = getPollutantPeriods();

/**
 * Generates a new concentration for a specific pollutant based on the pollutant's previous concentration, 
 * some randomness and some logic to make values a little bit realistic.
 * @param {Number} previousConcentration The previous pollutant concentration to base the new concentration generation on
 * @param {Object} concentrationStat Statistic about the pollutant's concentration from a dataset used in research 
 * @param {Object} period The pollutant's period with properties used to calculate the new sine index and concentration
 * @returns {Number} The newly generated pollutant concentration
 */
const getConcentration = (previousConcentration, concentrationStat, period) => {
  /** 
   * Every pollutant has according to the statistics different probability of failing to generate a concentration.
   * Using the same probability to simulate failed concentration generation.
   * This breaks with the current design since the previous concentration is sent back here, which can be null causing the new concentration to be minimum
   */ 
  /*if(rng() > concentrationStat.probability) {
    return null;
  }*/

  let concentration = previousConcentration;

  period.sindeIndex += period.getRandomIncrement();
  concentration += Math.sin(period.sindeIndex) * period.getRandomVariance() * period.getRandomNoise() + period.trend;
  
  // Prevent concentration going below minimum limit
  concentration = Math.max(concentration, concentrationStat.min);
  
  // Prevent concentration going above maximum limit
  concentration = Math.min(concentration, concentrationStat.max);

  return concentration;
}

/**
 * Generates a single air quality observation (only a new concentration for every pollutant)
 * Use mean from pollutant concentration statistics as starting concentration if no previous concentration exists
 * @param {Object} previousConcentrations The previous concentration for each pollutant
 * @param {Object} statistics Pollutant concentration statistics used to base some cycle properties on
 * @returns {Object} New concentration for each pollutant based on previous concentration
 */
export const getConcentrations = (previousConcentrations, statistics = concentrationStats, periods = pollutantPeriods) => {
  const concentrations = {};

  for(const pollutant of Object.keys(statistics)) {
    const statistic = statistics[pollutant];
    const period = periods[pollutant];
    const previousConcentration = previousConcentrations 
      ? previousConcentrations[pollutant] 
      : statistic.mean;
    concentrations[pollutant] = getConcentration(previousConcentration, statistic, period);
  }

  return concentrations;
}
