import seedrandom from "seedrandom";

// The seed to use to reproduce dataset for different producers
const SEED = process.argv[2] || "producer-1";

// Available pseudo random number generator algorithms in the seedrandom library.
// Can also invoke the seedrandom object directly without specifying algorithm.
const {
  alea,
  xor128,
  tychei,
  xorwow,
  xor4096,
  xorshift7,
} = seedrandom;

// Using the alea PRNG algorithm since it seemed to be the fastest according to https://www.npmjs.com/package/seedrandom
const rng = alea(SEED);

export const testAlea = () => rng();
