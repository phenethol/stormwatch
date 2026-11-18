import type { Station } from '../types/station'
import { number } from './format'

// Ispod ovog zuma prijave se crtaju kao male točke
export const farZoom = 5.5
// Od ovog zuma vide se temperature postaja, a od sljedećeg i nazivi postaja
const temperatureZoom = 5.75
const nameZoom = 10
// Mjerenje starije od 3 sata više se ne smatra aktualnim
export const freshMeasurementHours = 3

// Je li karta prikazana kao na mobitelu (iste granice kao u styles.css)
export const mobileMap = () => window.matchMedia('(max-width: 850px), (max-width: 1024px) and (max-height: 520px)').matches

export type StationMode = 'hidden' | 'temperature' | 'named'
export type MarkerBox = { left: number; top: number; right: number; bottom: number }

// Što se od postaja prikazuje pri zadanom zumu
export function stationMode(zoom: number): StationMode {
  if (zoom < temperatureZoom) return 'hidden'
  if (zoom < nameZoom) return 'temperature'
  return 'named'
}

// Temperatura koja se smije nacrtati na karti, ili null ako je nema ili je prestara
export function mapTemperature(station: Station, now: number): number | null {
  const reading = station.latest_measurement
  if (!reading) return null

  const value = reading.temperature_c
  if (value == null || !Number.isFinite(value)) return null

  const measuredAt = Date.parse(reading.measured_at)
  if (!Number.isFinite(measuredAt)) return null

  const maxAge = freshMeasurementHours * 60 * 60 * 1000
  if (now - measuredAt > maxAge) return null

  return value
}

// Ima li postaja trenutno aktualnu temperaturu
export function hasCurrentTemperature(station: Station) {
  return mapTemperature(station, Date.now()) != null
}

// Tekst temperature, npr. "16,2°" ili "−3°" (s pravim znakom minus)
export function temperatureText(value: number) {
  return `${number(value)}°`.replace('-', '−')
}

// Približna širina jednog znaka u pikselima
function charWidth(char: string) {
  if (char === ',' || char === '.') return 3.6
  if (char === '°') return 5.4
  if (char === '−') return 6.4
  return 7.2
}

// Veličina oznake postaje na karti [širina, visina] u pikselima
export function stationChipSize(text: string, name?: string): [number, number] {
  let width = 28 // rubovi, razmaci i ikona termometra
  for (const char of text) width += charWidth(char)
  if (name) width += 12 + Math.min(132, name.length * 6.9)
  return [Math.ceil(width), 24]
}

// Pravokutnik oko oznake čije je središte u točki (x, y)
export function markerBox(x: number, y: number, width: number, height: number): MarkerBox {
  return { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 }
}

function overlaps(a: MarkerBox, b: MarkerBox) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

// Vraća id-eve postaja koje se mogu nacrtati bez preklapanja s drugim oznakama.
// Postaja koja bi se preklopila jednostavno se ne crta (ne pomiče se na drugo mjesto).
export function availableStations(candidates: { id: number; box: MarkerBox }[], obstacles: MarkerBox[], gap: number) {
  const taken = [...obstacles]
  const result: number[] = []

  for (const { id, box } of candidates) {
    // Oko oznake ostavljamo razmak "gap"
    const padded = { left: box.left - gap, right: box.right + gap, top: box.top - gap, bottom: box.bottom + gap }
    if (taken.some(other => overlaps(padded, other))) continue
    taken.push(box)
    result.push(id)
  }

  return result
}
