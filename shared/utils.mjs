
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

export {
  promiseHandler
}