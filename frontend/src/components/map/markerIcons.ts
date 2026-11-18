import L from 'leaflet'
import { phenomenonLabels, stateLabels, type Report } from '../../types/report'
import type { Station } from '../../types/station'
import { formatDate, number } from '../../utils/format'
import { stationChipSize, temperatureText } from '../../utils/stationLayout'
import { svgSymbol, thermometerPath, weatherPath } from '../../utils/symbols'

// Ikone koje se crtaju na karti. Simboli pojava dolaze iz utils/symbols, kao u legendi i popisima.

export const pinPath = '<path d="M12 3a6 6 0 0 0-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 0 0-6-6z"/><circle cx="12" cy="9" r="2"/>'

// Dodaje ikoni opis za čitače zaslona (aria-label)
function withLabel(icon: L.DivIcon, label: string) {
  const createIcon = icon.createIcon.bind(icon)
  icon.createIcon = (oldIcon?: HTMLElement) => {
    const element = createIcon(oldIcon)
    element.setAttribute('aria-label', label)
    return element
  }
  return icon
}

// Ikona prijave: simbol pojave, plava ako je potvrđena
export function reportIcon(report: Report, selected: boolean) {
  const confirmed = report.state === 'confirmed'
  let label = `${phenomenonLabels[report.phenomenon]} · ${stateLabels[report.state]}`
  if (report.place_name) label += ` · ${report.place_name}`

  const icon = L.divIcon({
    className: `observation-pin ${confirmed ? 'verified' : 'unverified'}${selected ? ' pin-selected' : ''}`,
    html: `<span class="pin-body">${svgSymbol(weatherPath[report.phenomenon], 18)}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
  return withLabel(icon, label)
}

// Ikona postaje: termometar, temperatura i (pri većem zumu) naziv postaje
export function stationIcon(station: Station, value: number, named: boolean, selected: boolean) {
  const text = temperatureText(value)

  // Naziv se upisuje kao textContent, a ne kao HTML, da se ne može ubaciti tuđi kod
  const chip = document.createElement('span')
  chip.className = 'station-chip'
  chip.innerHTML = svgSymbol(thermometerPath, 12)

  const temperature = document.createElement('b')
  temperature.textContent = text
  chip.append(temperature)

  if (named) {
    const name = document.createElement('span')
    name.className = 'station-name'
    name.textContent = station.name
    chip.append(name)
  }

  const [width, height] = stationChipSize(text, named ? station.name : undefined)
  const icon = L.divIcon({
    className: `station-marker${selected ? ' pin-selected' : ''}`,
    html: chip,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  })
  const measuredAt = formatDate(station.latest_measurement!.measured_at)
  return withLabel(icon, `${station.name}, posljednja izmjerena temperatura ${number(value)} °C, ${measuredAt}`)
}

// Mala točka za odabranu postaju koja nema aktualnu temperaturu, da se vidi gdje je
export function stationPoint(station: Station) {
  const icon = L.divIcon({ className: 'station-point', html: '<span></span>', iconSize: [20, 20], iconAnchor: [10, 10] })
  return withLabel(icon, `${station.name}, aktualna temperatura nije dostupna`)
}
