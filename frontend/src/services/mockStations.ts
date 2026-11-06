import type { Station } from "../types/station";

const vrijeme = "2026-11-06T12:00:00+01:00";

export const mockStations: Station[] = [
  {
    id: 1,
    name: "Zagreb-Grič",
    location: { lat: 45.814, lon: 15.972 },
    altitude_m: 157,
    region_id: 1,
    latest_measurement: {
      measured_at: vrijeme,
      temperature_c: 9.4,
      humidity_pct: 78,
      pressure_hpa: 1016.2,
      wind_speed_ms: 2.1,
      wind_direction: "SI",
      source: "DHMZ",
    },
  },
  {
    id: 2,
    name: "Split-Marjan",
    location: { lat: 43.508, lon: 16.426 },
    altitude_m: 122,
    region_id: 2,
    latest_measurement: {
      measured_at: vrijeme,
      temperature_c: 16.8,
      humidity_pct: 62,
      pressure_hpa: 1014.9,
      wind_speed_ms: 6.3,
      wind_direction: "JI",
      source: "DHMZ",
    },
  },
  {
    id: 3,
    name: "Rijeka",
    location: { lat: 45.337, lon: 14.443 },
    altitude_m: 120,
    region_id: 3,
    latest_measurement: {
      measured_at: vrijeme,
      temperature_c: 13.1,
      humidity_pct: 70,
      pressure_hpa: 1015.5,
      wind_speed_ms: 4.0,
      wind_direction: "S",
      source: "DHMZ",
    },
  },
  {
    id: 4,
    name: "Osijek-Čepin",
    location: { lat: 45.502, lon: 18.562 },
    altitude_m: 89,
    region_id: 4,
    latest_measurement: {
      measured_at: vrijeme,
      temperature_c: 7.9,
      humidity_pct: 85,
      pressure_hpa: 1017.0,
      wind_speed_ms: 1.5,
      wind_direction: "Z",
      source: "DHMZ",
    },
  },
  {
    id: 5,
    name: "Dubrovnik",
    location: { lat: 42.645, lon: 18.085 },
    altitude_m: 52,
    region_id: 5,
    latest_measurement: null,
  },
];
