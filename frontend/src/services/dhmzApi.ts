import type { Station } from '../types/station'
import { request } from './http'
import { useResource } from './useResource'

// Postaje se prikazuju samo uz VITE_ENABLE_DHMZ=true; inače se ne šalje nijedan zahtjev
export const dhmzEnabled = import.meta.env.VITE_ENABLE_DHMZ === 'true'
const noStations: Station[] = []

// Dohvaća postaje s backenda i preskače one bez ispravnih koordinata
export async function loadStations(signal: AbortSignal): Promise<Station[]> {
  if (!dhmzEnabled) return noStations

  const stations = await request<Station[]>('/api/v1/stations', { signal })
  if (!Array.isArray(stations)) throw new Error('Backend je vratio neispravan popis DHMZ postaja.')

  const result: Station[] = []
  for (const station of stations) {
    const lat = Number(station.location?.lat)
    const lon = Number(station.location?.lon)
    if (Number.isFinite(lat) && Number.isFinite(lon)) result.push({ ...station, location: { lat, lon } })
  }
  return result
}

// Postaje za stranicu karte, osvježavaju se svake minute
export function useDhmz() {
  const resource = useResource(loadStations, dhmzEnabled ? 60_000 : 0)
  return {
    stations: resource.data ?? noStations,
    stationsError: resource.error,
    stationsLoading: dhmzEnabled && !resource.updated && !resource.error,
    refreshStations: resource.refresh,
  }
}
