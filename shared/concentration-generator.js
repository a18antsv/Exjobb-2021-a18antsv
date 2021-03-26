import seedrandom from "seedrandom";
import { getRandomFloat } from "./utils.js";
import concentrationStats from "./concentration-statistics.js"

// Available pseudo random number generator algorithms in the seedrandom library.
// Can also invoke the seedrandom object directly without specifying algorithm.
const { alea } = seedrandom;

const SEED = "producer-1";
const rng = alea(SEED);

/**
 * Generates a new concentration for a specific pollutant based on the pollutant's previous concentration, 
 * some randomness and some logic to make values a little bit realistic.
 * @param {Number} previousConcentration The previous pollutant concentration to base the new concentration generation on
 * @param {Object} concentrationStats Statistics about the pollutant's concentration from a dataset used in research 
 * @returns {Number} The newly generated pollutant concentration
 */
const getPollutantConcentration = (previousConcentration, concentrationStats) => {
  return rng(); // Placeholder
}

/**
 * Generates a single air quality observation (only a new concentration for every pollutant)
 * Use mean from pollutant concentration statistics as starting concentration if no previous concentration exists
 * @param {Object} previousConcentrations The previous concentration for each pollutant
 * @returns {Object} New concentration for each pollutant based on previous concentration
 */
export const getPollutantConcentrations = previousConcentrations => {
  const concentrations = {};

  for(const pollutant of Object.keys(concentrationStats)) {
    const concentrationStat = concentrationStats[pollutant];
    const previousConcentration = previousConcentrations 
      ? previousConcentrations[pollutant] 
      : concentrationStat.mean;
    concentrations[pollutant] = getPollutantConcentration(previousConcentration, concentrationStat);
  }

  return concentrations;
}
