import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { openFreeMapLayer } from '../../services/basemap'
import type { Place } from '../../services/geocode'
import type { Layers, Point, Selection } from '../../types/map'
import type { Report } from '../../types/report'
import type { Station } from '../../types/station'
import { availableStations, farZoom, mapTemperature, markerBox, mobileMap, stationChipSize, stationMode, temperatureText, type MarkerBox } from '../../utils/stationLayout'
import { svgSymbol } from '../../utils/symbols'
import { coveredMapHeight, fitCroatia, focusCenter, liftPoint, ll, reducedMotion } from './mapView'
import { pinPath, reportIcon, stationIcon, stationPoint } from './markerIcons'

// Funkcije kojima MapPage i MapTools upravljaju kartom
export type MapControls = {
  zoom: (delta: number) => void
  reset: () => void
  locate: (point: Point) => void
  focus: (selection: Selection, fromList?: boolean) => void
  showPlace: (place: Place) => void
}

type MapProps = {
  reports: Report[]
  stations: Station[]
  layers: Layers // koji su slojevi uključeni (prijave, postaje)
  selected: Selection | null
  dark: boolean
  picking: boolean // korisnik bira lokaciju nove prijave klikom na kartu
  draft?: Point // odabrana lokacija nove prijave
  now: number
  onSelect: (selection: Selection) => void
  onPick: (point: Point) => void
  onTileError: (failure: boolean) => void
}

// Postaje

type StationMarker = { marker: L.Marker; signature: string }

// Crta oznake postaja koje su u vidljivom dijelu karte i ne prekrivaju druge oznake
function drawStations(
  map: L.Map, group: L.LayerGroup, markers: Map<number, StationMarker>, stations: Station[],
  selectedId: number | undefined, now: number, onClick: (id: number) => void,
) {
  const mode = stationMode(map.getZoom())
  const named = mode === 'named'
  const gap = named || mobileMap() ? 6 : 9 // razmak između oznaka u pikselima
  const view = L.bounds([-95, -95], map.getSize().add([95, 95])) // vidljivi dio uz malu rezervu

  const obstacles: MarkerBox[] = [] // mjesta koja su već zauzeta
  const candidates: { id: number; box: MarkerBox }[] = []
  const drawn = new Map<number, { station: Station; value: number | null; active: boolean }>()

  // Uvijek isti redoslijed, da se pri osvježavanju ne prikazuju druge postaje
  const ordered = [...stations].sort((a, b) => a.id - b.id)
  for (const station of ordered) {
    const active = station.id === selectedId
    const value = mapTemperature(station, now)
    // Crtamo samo postaje s aktualnom temperaturom
    if (!active && (value == null || mode === 'hidden')) continue

    const point = map.latLngToContainerPoint(ll(station.location))
    if (!view.contains(point)) continue

    const [width, height] = value == null ? [20, 20] : stationChipSize(temperatureText(value), named ? station.name : undefined)
    const box = markerBox(point.x, point.y, width, height)
    drawn.set(station.id, { station, value, active })
    if (active) obstacles.push(box)
    else candidates.push({ id: station.id, box })
  }

  // Oznake prijava također zauzimaju mjesto. Od njih postaja treba biti udaljena samo 5 px.
  if (candidates.length) {
    map.eachLayer(layer => {
      if (!(layer instanceof L.Marker) || layer.options.pane !== 'reports') return
      const element = layer.getElement()
      if (!element) return
      const point = map.latLngToContainerPoint(layer.getLatLng())
      const shrink = 2 * (gap - 5)
      obstacles.push(markerBox(point.x, point.y, element.offsetWidth - shrink, element.offsetHeight - shrink))
    })
  }

  const visible = new Set(availableStations(candidates, obstacles, gap))
  if (selectedId !== undefined && drawn.has(selectedId)) visible.add(selectedId)

  // Ukloni oznake koje više ne trebaju
  for (const [id, entry] of markers) {
    if (visible.has(id)) continue
    group.removeLayer(entry.marker)
    markers.delete(id)
  }

  // Dodaj nove oznake ili osvježi postojeće
  for (const id of visible) {
    const { station, value, active } = drawn.get(id)!
    // Ikona se mijenja samo kad se promijeni nešto što se na njoj vidi
    const signature = JSON.stringify([named, active, station.name, value, station.latest_measurement?.measured_at])
    const icon = () => value == null ? stationPoint(station) : stationIcon(station, value, named, active)
    const existing = markers.get(id)

    if (!existing) {
      const marker = L.marker(ll(station.location), {
        pane: 'stations', icon: icon(), bubblingMouseEvents: false, autoPanOnFocus: false, zIndexOffset: active ? 1000 : 0,
      })
      marker.on('click', () => onClick(id)).addTo(group)
      markers.set(id, { marker, signature })
      continue
    }

    if (!existing.marker.getLatLng().equals(ll(station.location))) existing.marker.setLatLng(ll(station.location))
    if (existing.signature !== signature) {
      existing.marker.setIcon(icon()).setZIndexOffset(active ? 1000 : 0)
      existing.signature = signature
    }
  }
}

// Komponenta karte

export const WeatherMap = forwardRef<MapControls, MapProps>(function WeatherMap(props, ref) {
  const { reports, stations, layers, selected, dark, picking, draft, now, onTileError } = props
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<L.Map>()
  const activeMap = useRef<L.Map | null>(null) // trenutna karta (stara je možda već uklonjena)

  // Najnoviji podaci za klikove na kartu, bez ponovnog stvaranja karte
  const callbacks = useRef({ onSelect: props.onSelect, onPick: props.onPick, picking })
  const currentSelected = useRef<Selection | null>(null)

  const reportLayer = useRef<L.LayerGroup | null>(null)
  const reportMarkers = useRef(new Map<number, { report: Report; marker: L.Marker; active: boolean }>())
  const stationLayer = useRef<L.LayerGroup | null>(null)
  const stationMarkers = useRef(new Map<number, StationMarker>())
  const redrawStations = useRef<() => void>(() => {})
  const placeMark = useRef<{ marker: L.Marker; timer: number } | null>(null)

  useEffect(() => {
    callbacks.current = { onSelect: props.onSelect, onPick: props.onPick, picking }
    currentSelected.current = selected
  }, [props.onSelect, props.onPick, picking, selected])

  // 1. Stvaranje karte (jednom)
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, {
      zoomControl: false, minZoom: 3, maxZoom: 18, zoomSnap: 0.25, zoomDelta: 0.75,
      dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true,
      wheelPxPerZoomLevel: 90, zoomAnimation: !reducedMotion(), fadeAnimation: !reducedMotion(),
    })
    activeMap.current = instance
    instance.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>')
    // Prijave se crtaju iznad postaja
    instance.createPane('stations').style.zIndex = '560'
    instance.createPane('reports').style.zIndex = '610'

    // Kad je karta jako udaljena, prijave postaju male točke (CSS klasa map-far)
    const updateScale = () => instance.getContainer().classList.toggle('map-far', instance.getZoom() < farZoom)
    const afterMove = () => {
      updateScale()
      redrawStations.current()
    }
    instance.on('zoomend', updateScale)
    instance.on('moveend', afterMove)
    instance.on('click', ({ latlng }) => {
      if (callbacks.current.picking) callbacks.current.onPick({ lat: latlng.lat, lon: latlng.lng })
    })

    fitCroatia(instance)
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 90 }).addTo(instance)

    // Kad se promijeni veličina okvira (npr. otvori se panel), karta se prilagodi
    let resizeFrame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => instance.invalidateSize({ debounceMoveend: true }))
    })
    observer.observe(container.current)
    setMap(instance)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(resizeFrame)
      instance.off('moveend', afterMove)
      instance.off('zoomend', updateScale)
      if (placeMark.current) window.clearTimeout(placeMark.current.timer)
      placeMark.current = null
      activeMap.current = null
      // Leaflet 1.9 zna nakon remove() još pokrenuti animaciju zuma
      const transition = instance as L.Map & { _animatingZoom?: boolean }
      if (transition._animatingZoom) transition._animatingZoom = false
      instance.remove()
    }
  }, [])

  // 2. Funkcije koje MapPage poziva preko ref-a
  useImperativeHandle(ref, () => ({
    zoom: delta => {
      if (map) map.setZoom(map.getZoom() + delta, { animate: !reducedMotion() })
    },
    reset: () => {
      if (map) fitCroatia(map)
    },
    locate: point => {
      if (map) map.setView(ll(point), 12, { animate: !reducedMotion() })
    },
    // Pokaži odabranu prijavu ili postaju; iz popisa se karta i približi
    focus: (selection, fromList = false) => {
      if (!map || map !== activeMap.current) return
      requestAnimationFrame(() => {
        const current = currentSelected.current
        if (map !== activeMap.current || current?.kind !== selection.kind || current.id !== selection.id) return
        map.invalidateSize()

        let point: L.LatLng
        if (selection.kind === 'reports') {
          const marker = reportMarkers.current.get(selection.id)?.marker
          if (!marker || !reportLayer.current?.hasLayer(marker)) return
          point = marker.getLatLng()
        } else {
          const station = stations.find(item => item.id === selection.id)
          if (!station) return
          point = L.latLng(ll(station.location))
        }

        if (fromList && map.getZoom() < 12) map.setView(focusCenter(map, point, 12), 12, { animate: !reducedMotion() })
        else liftPoint(map, point)
      })
    },
    // Prikaži mjesto iz pretrage i kratko ga označi krugom
    showPlace: place => {
      if (!map || map !== activeMap.current) return
      if (placeMark.current) {
        window.clearTimeout(placeMark.current.timer)
        placeMark.current.marker.remove()
      }
      const point = L.latLng(ll(place.point))
      const animate = !reducedMotion()
      if (place.extent) {
        const [south, west, north, east] = place.extent
        map.fitBounds([[south, west], [north, east]], { maxZoom: 15, paddingTopLeft: [36, 66], paddingBottomRight: [62, coveredMapHeight(map) + 36], animate })
      } else {
        map.setView(focusCenter(map, point, place.zoom), place.zoom, { animate })
      }

      const marker = L.marker(point, {
        interactive: false, keyboard: false, zIndexOffset: 2000,
        icon: L.divIcon({ className: 'place-mark', html: '<span></span>', iconSize: [48, 48], iconAnchor: [24, 24] }),
      }).addTo(map)
      // Krug nestaje nakon ~5 sekundi
      const entry = {
        marker,
        timer: window.setTimeout(() => {
          marker.remove()
          if (placeMark.current === entry) placeMark.current = null
        }, 5200),
      }
      placeMark.current = entry
    },
  }), [map, stations])

  // 3. Podloga karte (OpenFreeMap)
  // Ako se ne može učitati, MapPage prikazuje poruku "Podloga nije dostupna".
  useEffect(() => {
    if (!map || map !== activeMap.current) return
    let cancelled = false
    let basemap: L.Layer | undefined
    openFreeMapLayer(L, dark)
      .then(layer => {
        if (cancelled) return
        basemap = layer.addTo(map)
        onTileError(false)
      })
      .catch(() => {
        if (!cancelled) onTileError(true)
      })

    return () => {
      cancelled = true
      basemap?.remove()
    }
  }, [map, dark, onTileError])

  // Sloj prijava (skriven dok korisnik bira lokaciju nove prijave)
  useEffect(() => {
    if (!map || map !== activeMap.current || !layers.reports || picking) return
    const group = L.layerGroup().addTo(map)
    reportLayer.current = group
    const markers = reportMarkers.current
    return () => {
      group.clearLayers()
      group.remove()
      markers.clear()
      reportLayer.current = null
      redrawStations.current()
    }
  }, [map, layers.reports, picking])

  // Oznake prijava: dodaj nove, ukloni stare, osvježi promijenjene
  useEffect(() => {
    const group = reportLayer.current
    if (!group) return
    const entries = reportMarkers.current
    const activeId = selected?.kind === 'reports' ? selected.id : null

    // Ukloni prijave kojih više nema
    const wanted = new Set(reports.map(report => report.id))
    for (const [id, entry] of entries) {
      if (wanted.has(id)) continue
      group.removeLayer(entry.marker)
      entries.delete(id)
    }

    const toAdd: L.Marker[] = []
    for (const report of reports) {
      const active = report.id === activeId
      const previous = entries.get(report.id)

      if (!previous) {
        const marker = L.marker(ll(report.location), {
          pane: 'reports', icon: reportIcon(report, active), bubblingMouseEvents: false,
          autoPanOnFocus: false, zIndexOffset: active ? 1500 : 0,
        })
        marker.on('click', () => callbacks.current.onSelect({ kind: 'reports', id: report.id }))
        entries.set(report.id, { report, marker, active })
        toAdd.push(marker)
        continue
      }

      // Prijava se promijenila ili je odabrana
      if (previous.report !== report || previous.active !== active) {
        if (!previous.marker.getLatLng().equals(ll(report.location))) previous.marker.setLatLng(ll(report.location))
        previous.marker.setIcon(reportIcon(report, active)).setZIndexOffset(active ? 1500 : 0)
        entries.set(report.id, { report, marker: previous.marker, active })
      }
      if (!group.hasLayer(previous.marker)) toAdd.push(previous.marker)
    }

    // Puno oznaka dodajemo u dijelovima po 150, da karta ne zastane
    let frame = 0
    function addBatch(start: number) {
      for (const marker of toAdd.slice(start, start + 150)) group!.addLayer(marker)
      if (start + 150 < toAdd.length) frame = requestAnimationFrame(() => addBatch(start + 150))
      else redrawStations.current() // postaje se slažu oko novih prijava
    }
    addBatch(0)
    return () => cancelAnimationFrame(frame)
  }, [map, reports, selected, layers.reports, picking])

  // Sloj postaja
  useEffect(() => {
    if (!map || map !== activeMap.current || !layers.stations || picking) return
    const group = L.layerGroup().addTo(map)
    stationLayer.current = group
    const markers = stationMarkers.current
    return () => {
      group.clearLayers()
      group.remove()
      markers.clear()
      stationLayer.current = null
    }
  }, [map, layers.stations, picking])

  // Oznake postaja; ponovno se crtaju nakon svakog pomicanja karte
  useEffect(() => {
    const group = stationLayer.current
    if (!map || map !== activeMap.current || !group || !layers.stations || picking) return
    const selectedId = selected?.kind === 'stations' ? selected.id : undefined
    const onClick = (id: number) => callbacks.current.onSelect({ kind: 'stations', id })
    const redraw = () => drawStations(map, group, stationMarkers.current, stations, selectedId, now, onClick)

    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(redraw)
    }
    redrawStations.current = schedule
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      redrawStations.current = () => {}
    }
  }, [map, stations, layers.stations, picking, selected, now])

  // Pribadača na mjestu nove prijave dok korisnik bira lokaciju
  useEffect(() => {
    if (!map || map !== activeMap.current || !draft || !picking) return
    const marker = L.marker(ll(draft), {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: 'draft-marker', html: svgSymbol(pinPath), iconSize: [28, 28] }),
    }).addTo(map)
    return () => { marker.remove() }
  }, [map, draft, picking])

  return <div ref={container} className={`map-canvas${picking ? ' map-picking' : ''}`} aria-label="Interaktivna meteorološka karta Hrvatske" />
})
