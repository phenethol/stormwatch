import type { Point } from '../types/map'
import { intensityNames, type Damage, type Filter, type Intensity, type Phenomenon, type Report, type Strength } from '../types/report'

/** Hail sizes keep their own values; the interface groups them with the three strengths. */
export const strength = (intensity: Intensity): Strength =>
  intensity === 'pea' ? 'weak' : intensity === 'hazelnut' ? 'moderate' : intensity === 'walnut' || intensity === 'egg' ? 'strong' : intensity
/** Intensity as shown everywhere in the interface: always Slab, Umjeren or Jak. */
export const intensityLabel = (intensity: Intensity) => intensityNames[strength(intensity)]
const hailSizes: Record<Strength, Intensity> = { weak: 'pea', moderate: 'hazelnut', strong: 'walnut' }
/** Backend code for the strength chosen in the form: hail is stored by grain size. */
export const apiIntensity = (type: Phenomenon, value: Strength): Intensity => type === 'hail' ? hailSizes[value] : value
export const publicReport = (report: Report, signedIn: boolean) => report.state === 'confirmed' || (signedIn && report.state === 'pending')
/** Name of the person who submitted a report, when the backend returns it. */
export const reporterName = (report: Pick<Report, 'author'>) =>
  (typeof report.author === 'string' ? report.author : report.author?.username) || undefined

export function filteredReports(reports: Report[], filters: Filter, now: number) {
  const { phenomenon, status, intensity, hours } = filters
  return reports.filter(({ phenomenon: type, state, intensity: reported, observed_at }) =>
    (!phenomenon || type === phenomenon) && (!status || state === status) && (!intensity || strength(reported) === intensity)
    && (!hours || Date.parse(observed_at) >= now - hours * 3_600_000),
  ).sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))
}

/** What the new-report form holds while it is being filled in. */
export type Draft = {
  phenomenon: Phenomenon | ''; intensity: Strength | ''; damage: Damage; observed: string
  lat: string; lon: string; source: 'map' | 'gps'; description: string
}

export function emptyDraft(): Draft {
  const now = new Date()
  const observed = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  return { phenomenon: '', intensity: '', damage: 'none', observed, lat: '', lon: '', source: 'map', description: '' }
}

export function assignLocation(draft: Draft, point: Point, source: Draft['source']): Draft {
  return { ...draft, lat: point.lat.toFixed(6), lon: point.lon.toFixed(6), source }
}
