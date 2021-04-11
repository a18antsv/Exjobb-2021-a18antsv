interface ClientDataset {
  [key: string]: ClientBucket;
}

interface ClientBucket {
  [key: string]: ClientStation;
}

interface ClientStation {
  metrics: {
    pm25: number;
    pm10: number;
    no2: number;
    co: number;
    o3: number;
    so2: number;
    latency: number;
  }
  count: number;
  sizeMS: number;
}

// Example usage
const d: ClientDataset = {
  "2021-04-03T23:09:30.000Z": {
    "producer-service-1": {
      metrics: {
        pm25: 94577,
        pm10: 64569,
        no2: 35477,
        co: 26752,
        o3: 52341,
        so2: 12356,
        latency: 4
      },
      sizeMS: 1000,
      count: 890
    }
  }
}
