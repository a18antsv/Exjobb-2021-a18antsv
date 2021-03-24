
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

export {
  promiseHandler,
  delay
}