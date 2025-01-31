
/**
 * When an error happens in a promise, the promise is rejected. The possibility of rejection must be handled
 * to avoid the deprecated UnhandledPromiseRejectionWarning, which will terminate the Node process in the future.
 * This utility function handles possible rejections of passed promise.
 * Returns a two element array [error, response], where the error is undefined if there is no error
 * and response is undefined if there is an error or if the promise returned void.
 * @param {Promise} promise The promise to handle
 * @returns {Array} Returns a two element array [error | undefined, response | undefined] where one position is always undefined
 */
const promiseHandler = promise => {
 return promise
   .then(response => [undefined, response])
   .catch(error => [error, undefined]);
}

/**
 * Wraps setTimeout in a promise that resolves after passed amount of time.
 * Makes it possible to use setTimeout with async/await.
 * @param {Number} ms Amount of time to delay in milliseconds
 * @returns {Promise} The promise to await
 */
const delay = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a random floating point number between min (included) and max (included)
 * @param {Function} rngFunction The random generator function to use
 * @param {Number} min The minimum number
 * @param {Number} max The maximum number
 * @returns {Number} Random float in range
 */
const getRandomFloat = (rngFunction, min, max) => {
  return rngFunction() * (max - min) + min;
}

/**
 * Adds leading zeros to passed string based on how long the final string should be.
 * If passed string is shorter than length, leading zeros will be added to fill up the length.
 * If passed string is longer than length, the string will be cut from the back of the string according to length.
 * @param {String} str The string to add leading zeros to 
 * @param {Number} length The length of the final string 
 * @returns {String} The passed string with leading zeros filling in available space according to passed length 
 */
const addLeadingZeros = (str = "", length = 2) => {
  const zeros = "0".repeat(length);
  return (zeros + str).slice(-length);
}

/**
 * Gets the current timestamp without using any external libraries.
 * Using addLeadingZeros to always keep the same format.
 * @returns The current timestamp in the format "yyyy-mm-dd hh:mm:ss.MMM"
 */
const getCurrentTimestamp = () => {
  const date = new Date();
  return `${date.getFullYear()}-${addLeadingZeros(date.getMonth()+1)}-${addLeadingZeros(date.getDate())} ${addLeadingZeros(date.getHours())}:${addLeadingZeros(date.getMinutes())}:${addLeadingZeros(date.getSeconds())}.${addLeadingZeros(date.getMilliseconds(), 3)}`;
}

export {
  promiseHandler,
  delay,
  getRandomFloat,
  getCurrentTimestamp
}