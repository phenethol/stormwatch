import type { Point } from './map'

// Jedno mjerenje DHMZ postaje. Vrijednost je null kad je postaja ne mjeri.
export type Measurement = {
  measured_at: string
  temperature_c: number | null
  humidity_pct: number | null
  pressure_hpa: number | null
  wind_speed_ms: number | null
  wind_direction: string | null
  wind_gust_ms?: number | null // backend ga ne šalje uvijek
  precipitation_mm?: number | null // backend ga ne šalje uvijek
  source?: 'DHMZ'
}

// DHMZ postaja kako je vraća GET /api/v1/stations
export type Station = {
  id: number
  name: string
  location: Point
  altitude_m?: number | null
  region_id?: number | null // u M1 backend vraća null
  latest_measurement: Measurement | null
}
