import L from 'leaflet'
import type { Point } from '../../types/map'
import { mobileMap } from '../../utils/stationLayout'

// Pomoćne funkcije za pomicanje karte tako da gumbi i panel s detaljima ne prekrivaju ono što je bitno.

const croatia = L.latLngBounds([42.38, 13.43], [46.58, 19.47])

// Je li korisnik u sustavu isključio animacije
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Naša točka { lat, lon } u obliku koji Leaflet razumije
export const ll = (point: Point): L.LatLngTuple => [point.lat, point.lon]

// Prikaži cijelu Hrvatsku, s razmakom za gumbe uz rub karte
export function fitCroatia(map: L.Map) {
  const mobile = mobileMap()
  map.fitBounds(croatia, {
    paddingTopLeft: [mobile ? 12 : 28, mobile ? 58 : 62],
    paddingBottomRight: [mobile ? 14 : 62, mobile ? 44 : 34],
    animate: false,
  })
}

// Koliko piksela karte odozdo prekriva panel s detaljima (samo na mobitelu)
export function coveredMapHeight(map: L.Map) {
  if (!mobileMap()) return 0
  const detail = map.getContainer().closest('.workspace')?.querySelector('.detail')
  if (!detail) return 0
  const mapBottom = map.getContainer().getBoundingClientRect().bottom
  return Math.max(0, mapBottom - detail.getBoundingClientRect().top)
}

// Središte karte pomaknuto tako da se točka vidi iznad panela s detaljima
export function focusCenter(map: L.Map, point: L.LatLng, zoom = map.getZoom()) {
  const shifted = map.project(point, zoom).add([0, coveredMapHeight(map) / 2])
  return map.unproject(shifted, zoom)
}

// Pomakni kartu samo ako je točka preblizu rubu ili ispod panela
export function liftPoint(map: L.Map, point: L.LatLng) {
  const screen = map.latLngToContainerPoint(point)
  const size = map.getSize()
  const visible = screen.x > 24 && screen.x < size.x - 55
    && screen.y > 56 && screen.y < size.y - coveredMapHeight(map) - 28
  if (visible) return
  map.panTo(focusCenter(map, point), { animate: !reducedMotion() })
}
