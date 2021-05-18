/**
 * Class that uses a passed mean of a measurements series and creates an interval around it
 * based on passed error around the mean (std, sem or ci).
 * The class contains a function that is used to compare if two intervals overlap.
 */
class Interval {
  /**
   * @param {Number} mean The mean fo the measurement series to create an interval around
   * @param {Number} error The error from the mean (used to calculate interval min and max)
   * @param {String} name The name of the group
   */
  constructor(mean, error, name = "Kafka 1") {
    this.min = mean - error;
    this.max = mean + error;
    this.name = name;
  }

  /**
   * Checks if this interval is overlapping with the passed interval.
   * Insipration from: https://stackoverflow.com/questions/22784883/check-if-more-than-two-date-ranges-overlap
   * @param {Interval} interval The other interval to compare against
   */
  overlapsWith(interval) {
    if(this.min <= interval.min && interval.min <= this.max) return true; // b starts in a
    if(this.min <= interval.max && interval.max <= this.max) return true; // b ends in a
    if(interval.min <= this.min && this.max <= interval.max) return true; // a in b
    return false;
  }
}

/**
 * Compares every interval in an array with every other interval in the array to see if they overlap or not.
 * Logs which intervals overlap.
 * @param {Array} intervals The intervals to compare
 * @param {String} type The type of interval that will be logged
 */
function compareIntervals(intervals, type = "") {
  for(let i = 0; i < intervals.length; i++) {
    const a = intervals[i];
    for(let j = 0; j < intervals.length; j++) {
      if(i === j) continue; // Do not compare an interval with itself
      const b = intervals[j];
      if(a.overlapsWith(b)) {
        console.log(`${type}: ${a.name} and ${b.name} overlaps.`);
      }
    }
  }
}

const throhgputIntervals = [
  new Interval(48634.88, 152.52, "RabbitMQ 1"),
  new Interval(58782.49, 207.55, "RabbitMQ 2"),
  new Interval(70346.57, 249.77, "RabbitMQ 4"),
  new Interval(74705.03, 229.66, "RabbitMQ 8"),
  new Interval(71005.02, 229.08, "RabbitMQ 12"),
  new Interval(67937.10, 238.03, "RabbitMQ 16"),
  new Interval(57799.50, 105.79, "Kafka 1"),
  new Interval(104249.38, 535.25, "Kafka 2"),
  new Interval(158880.99, 1125.08, "Kafka 4"),
  new Interval(174631.32, 1156.29, "Kafka 8"),
  new Interval(176163.42, 960.63, "Kafka 12"),
  new Interval(164822.18, 634.67, "Kafka 16"),
];

const latencyIntervals = [
  new Interval(257.96, 1.60, "RabbitMQ 1"),
  new Interval(523.08, 1.81, "RabbitMQ 2"),
  new Interval(1120.02, 3.40, "RabbitMQ 4"),
  new Interval(1608.34, 3.64, "RabbitMQ 8"),
  new Interval(3027.18, 5.41, "RabbitMQ 12"),
  new Interval(3994.65, 5.12, "RabbitMQ 16"),
  new Interval(14.34, 0.03, "Kafka 1"),
  new Interval(16.62, 0.17, "Kafka 2"),
  new Interval(25.38, 0.26, "Kafka 4"),
  new Interval(60.05, 0.38, "Kafka 8"),
  new Interval(118.92, 0.76, "Kafka 12"),
  new Interval(8969.42, 211.39, "Kafka 16"),
];

compareIntervals(throhgputIntervals, "Throughput");
compareIntervals(latencyIntervals, "Latency");
