import type { Phenomenon } from '../types/report'

// Single source of truth for phenomenon symbols. The map markers, legend,
// side panel and detail panel all render from this record, so a type can never show
// a different symbol in two places.
export const weatherPath: Record<Phenomenon, string> = {
  hail: '<path d="M5 12.5a4 4 0 1 1 1-7.9A5 5 0 0 1 15.6 6 3.3 3.3 0 1 1 18 12.5"/><g fill="currentColor" stroke="none"><circle cx="6.5" cy="16" r="1.65"/><circle cx="12" cy="16" r="1.65"/><circle cx="17.5" cy="16" r="1.65"/><circle cx="9.25" cy="20.5" r="1.65"/><circle cx="14.75" cy="20.5" r="1.65"/></g>',
  heavy_rain: '<path d="M5 12.5a4 4 0 1 1 1-7.9A5 5 0 0 1 15.6 6 3.3 3.3 0 1 1 18 12.5M8.5 15.5 7 20.5m5.5-5-1.5 5m5.5-5-1.5 5"/>',
  flood: '<path d="M3 7c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0M3 12.5c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0M3 18c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0"/>',
  storm_wind: '<path d="M3 8h11a2 2 0 1 0-2-2m-9 6h15a2 2 0 1 0-2-2M3 16h9a2 2 0 1 1-2 2"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5M4.3 11.2l3.4-.9-.9-3.4M19.7 12.8l-3.4.9.9 3.4M4.3 12.8l3.4.9-.9 3.4M19.7 11.2l-3.4-.9.9-3.4"/>',
  glaze_ice: '<path d="M3 5h18M5.5 5 7 12l1.5-7M10.5 5 12 16l1.5-11M15.5 5 17 10.5 18.5 5M4 20.5h16"/>',
  waterspout: '<path d="M3 5h18M5 8.5h13M7.5 12h8M10 15.5h5M11.5 19h2.5"/>',
}

// Citizen reports as a group: two people, one partly behind the other. Used by the reports tab.
export const reportsPath = '<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20M15.5 4.3a3.5 3.5 0 0 1 0 6.4M18 14.3a4.5 4.5 0 0 1 3.5 4.2V20"/>'
export const thermometerPath = '<path d="M10 13.8V5a2 2 0 0 1 4 0v8.8a4.2 4.2 0 1 1-4 0z"/><path d="M12 9v8"/><circle cx="12" cy="17.3" r="1.6" fill="currentColor" stroke="none"/>'

export function svgSymbol(path: string, size = 19) {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}
