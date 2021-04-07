interface Aggregations {
  [key: string]: Station
}

interface Station {
  concentrations: {
    [key: string]: Bucket
  }
  coordinates: {
    lat: number
    long: number
  }
}

interface Message {
  stationId: string
  timestamp: string
  coordinates: {
    lat: number
    long: number
  }
  concentrations: {
    pm25: number
    pm10: number
    no2: number
    co: number
    o3: number
    so2: number
  }
}

class Bucket {
  pm25: Gauge
  pm10: Gauge
  no2: Gauge
  co: Gauge
  o3: Gauge
  so2: Gauge

  constructor() {
    this.co = new Gauge()
    this.no2 = new Gauge()
    this.o3 = new Gauge()
    this.pm10 = new Gauge()
    this.pm25 = new Gauge()
    this.so2 = new Gauge()
  }
}

class Gauge {
  count: number
  total: number

  constructor() {
    this.count = 0
    this.total = 0
  }

  add(value: number): void {
    this.total += value
    this.count++
  }

  avg(): number {
    return this.total / this.count;
  }
}

// Example structure of aggregations
const aggregations: Aggregations = {
  "station_a": {
    coordinates: {
      lat: 0,
      long: 0,
    },
    concentrations: {
      "2021-04-03T23:09:30.000Z": new Bucket(),
      "2021-04-03T23:09:40.000Z": new Bucket(),
    }
  },
  "station_b": {
    coordinates: {
      lat: 0,
      long: 0,
    },
    concentrations: {
      "2021-04-03T23:09:30.000Z": new Bucket(),
      "2021-04-03T23:09:40.000Z": new Bucket(),
    }
  }
}

const timeKey = (date: Date): string => {
  const aggregationIntervalMS = 10_000;
  return new Date(
    Math.round(date.getTime() / aggregationIntervalMS) * aggregationIntervalMS
  ).toISOString();
}

const saveMessage = (message: Message): void => {
  const { stationId, coordinates, timestamp, concentrations } = message;
  if (!aggregations[stationId]) {
    aggregations[stationId] = {
      coordinates,
      concentrations: {}
    }
  }

  const key = timeKey(new Date(timestamp));
  const station = aggregations[stationId];

  if (!station.concentrations[key]) {
    station.concentrations[key] = new Bucket();
  }

  const aggregate = station.concentrations[key];

  aggregate.co.add(concentrations.co);
  aggregate.no2.add(concentrations.no2);
  aggregate.o3.add(concentrations.o3);
  aggregate.pm10.add(concentrations.pm10);
  aggregate.pm25.add(concentrations.pm25);
  aggregate.so2.add(concentrations.so2);
}
