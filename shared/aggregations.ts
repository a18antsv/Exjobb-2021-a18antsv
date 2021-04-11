const aggregationRateMS = 1_000;

interface Aggregations {
  [key: string]: Station
}

interface Station {
  buckets: {
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
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  o3: number;
  so2: number;
  latency: number;
  count: number;
  readonly sizeMS: number;

  constructor(sizeMS: number) {
    this.co = 0;
    this.no2 = 0;
    this.o3 = 0;
    this.pm10 = 0;
    this.pm25 = 0;
    this.so2 = 0;
    this.latency = 0;
    this.count = 0;
    this.sizeMS = sizeMS;
  }

  add({ co, no2, o3, pm10, pm25, so2, latency }): void {
    this.co += co;
    this.no2 += no2;
    this.o3 += o3;
    this.pm10 += pm10;
    this.pm25 += pm25;
    this.so2 += so2;
    this.latency += latency;
    this.count++;
  }
}

// Example structure of aggregations
const aggregations: Aggregations = {
  "station_a": {
    coordinates: {
      lat: 0,
      long: 0,
    },
    buckets: {
      "2021-04-03T23:09:30.000Z": new Bucket(aggregationRateMS),
      "2021-04-03T23:09:40.000Z": new Bucket(aggregationRateMS),
    }
  },
  "station_b": {
    coordinates: {
      lat: 0,
      long: 0,
    },
    buckets: {
      "2021-04-03T23:09:30.000Z": new Bucket(aggregationRateMS),
      "2021-04-03T23:09:40.000Z": new Bucket(aggregationRateMS),
    }
  }
}

const timeKey = (date: Date): string => {
  return new Date(
    Math.round(date.getTime() / aggregationRateMS) * aggregationRateMS
  ).toISOString();
}

const saveMessage = (message: Message): void => {
  const { stationId, coordinates, timestamp, concentrations } = message;
  const latency = new Date().getTime() - new Date(timestamp).getTime();
  
  if (!aggregations[stationId]) {
    aggregations[stationId] = {
      coordinates,
      buckets: {}
    }
  }

  const key = timeKey(new Date(timestamp));
  const station = aggregations[stationId];

  if (!station.buckets[key]) {
    station.buckets[key] = new Bucket(aggregationRateMS);
  }

  const bucket = station.buckets[key];

  bucket.add({
    latency, 
    ...concentrations
  });
}
