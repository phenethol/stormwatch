export interface Measurement {
  measured_at: string;
  temperature_c: number | null;
  humidity_pct: number | null;
  pressure_hpa: number | null;
  wind_speed_ms: number | null;
  wind_direction: string | null;
  source: "DHMZ";
}

export interface Station {
  id: number;
  name: string;
  location: { lat: number; lon: number };
  altitude_m: number | null;
  region_id: number;
  latest_measurement: Measurement | null;
}
