import type { Point } from '../types/map'

// Place search uses Photon (https://photon.komoot.io), an OpenStreetMap geocoder built for
// search-as-you-type. The public Nominatim service forbids autocomplete, so it is not used.
// The public Photon instance is a fair-use service: requests are debounced, cancelled when
// superseded, cached and limited to a few results. For production traffic point
// VITE_GEOCODER_URL at a self-hosted or commercial Photon-compatible endpoint.
const endpoint = (import.meta.env?.VITE_GEOCODER_URL as string | undefined)?.replace(/\/+$/, '') || 'https://photon.komoot.io/api'
const croatiaBox = '13.2,42.3,19.5,46.6'
export const minimumQuery = 3

export type Place = {
  id: string; name: string; context: string; point: Point; zoom: number
  /** south, west, north, east */
  extent?: [number, number, number, number]
}

type Feature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_type?: string; osm_id?: number; osm_value?: string; type?: string; name?: string; street?: string; housenumber?: string
    postcode?: string; city?: string; district?: string; locality?: string; county?: string; countrycode?: string
    extent?: [number, number, number, number]
  }
}

const settlement: Record<string, [string, number]> = {
  city: ['Grad', 12], town: ['Grad', 13], village: ['Naselje', 14], hamlet: ['Zaselak', 15],
  suburb: ['Gradska četvrt', 14], quarter: ['Gradska četvrt', 14], neighbourhood: ['Kvart', 15],
  island: ['Otok', 11], islet: ['Otočić', 13], peak: ['Vrh', 14],
}
const kinds: Record<string, [string, number]> = {
  house: ['Adresa', 17], street: ['Ulica', 16], locality: ['Lokalitet', 14], district: ['Naselje', 14],
  city: ['Mjesto', 13], county: ['Županija', 9], state: ['Regija', 8],
}

export function parsePlaces(body: unknown): Place[] {
  const features = (body as { features?: Feature[] } | null)?.features
  if (!Array.isArray(features)) return []
  const places: Place[] = []
  const seen = new Set<string>()
  for (const { geometry, properties } of features) {
    const [lon, lat] = geometry?.coordinates ?? []
    if (!properties || properties.countrycode !== 'HR' || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const address = [properties.street, properties.housenumber].filter(Boolean).join(' ')
    const name = properties.name && address && properties.type === 'house' ? `${properties.name}, ${address}` : properties.name || address
    if (!name) continue
    const [label, zoom] = settlement[properties.osm_value ?? ''] ?? kinds[properties.type ?? ''] ?? ['Lokacija', 14]
    const parts = [label, properties.name && properties.type === 'street' ? properties.district : null,
      properties.city, properties.county, properties.postcode]
      .filter((part, index, all): part is string => !!part && part !== name && all.indexOf(part) === index)
    const context = parts.join(' · ')
    const key = `${name}|${context}`
    if (seen.has(key)) continue
    seen.add(key)
    const box = properties.extent
    places.push({
      id: `${properties.osm_type ?? ''}${properties.osm_id ?? places.length}`, name, context, point: { lat: lat!, lon: lon! }, zoom,
      extent: box?.length === 4 && box.every(Number.isFinite) ? [box[3], box[0], box[1], box[2]] : undefined,
    })
  }
  return places
}

const cache = new Map<string, Place[]>()

export async function searchPlaces(text: string, signal: AbortSignal): Promise<Place[]> {
  const query = text.trim().replace(/\s+/g, ' ')
  const key = query.toLocaleLowerCase('hr-HR')
  const cached = cache.get(key)
  if (cached) return cached
  let response: Response
  try {
    response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&limit=8&lang=default&bbox=${croatiaBox}`, { signal, headers: { Accept: 'application/json' } })
  } catch (cause) {
    if (signal.aborted) throw cause
    throw new Error('Pretraga lokacija trenutačno nije dostupna.', { cause })
  }
  if (response.status === 429) throw new Error('Previše upita u kratkom vremenu. Pokušajte ponovno za nekoliko trenutaka.')
  if (!response.ok) throw new Error('Pretraga lokacija trenutačno nije dostupna.')
  const places = parsePlaces(await response.json().catch(() => null)).slice(0, 6)
  if (cache.size > 80) cache.delete(cache.keys().next().value!)
  cache.set(key, places)
  return places
}
