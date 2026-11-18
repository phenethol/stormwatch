import { Crosshair, Info, LayoutDashboard, LocateFixed, Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Place } from '../services/geocode'
import type { MapControls } from './map/WeatherMap'
import { MapLegend } from './MapLegend'
import { PlaceSearch } from './PlaceSearch'

type Props = {
  map: MapControls | null
  onLocate: () => void
  onPlace: (place: Place) => void
  onReport: () => void
  picking: boolean // korisnik bira lokaciju nove prijave na karti
  onCancelPick: () => void
  unavailable: boolean // podloga karte se nije učitala
  offline: boolean
  note: string
  overviewOpen: boolean
  panelOpen: boolean
  overviewTrigger: RefObject<HTMLButtonElement | null>
  onOverview: () => void
  onPopupOpen: () => void
}

// Gumbi i poruke iznad karte: pregled, pretraga mjesta, zum, lokacija, legenda i Nova prijava
export function MapTools({ map, onLocate, onPlace, onReport, picking, onCancelPick, unavailable, offline, note,
  overviewOpen, panelOpen, overviewTrigger, onOverview, onPopupOpen }: Props) {
  const [legendOpen, setLegendOpen] = useState(false)
  const tools = useRef<HTMLDivElement>(null)
  const legendButton = useRef<HTMLButtonElement>(null)

  const closeLegend = () => {
    setLegendOpen(false)
    legendButton.current?.focus()
  }

  // Otvorena legenda zatvara se tipkom Esc ili klikom izvan nje
  useEffect(() => {
    if (!legendOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return
      event.preventDefault()
      setLegendOpen(false)
      legendButton.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (!tools.current?.contains(event.target as Node)) setLegendOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [legendOpen])

  return (
    <>
      <div className="map-context">
        {picking ? (
          <div className="map-location">
            <Crosshair size={19} />
            <div><strong>Odaberite lokaciju</strong><span>Kliknite na mjesto opažanja.</span></div>
            <button type="button" className="icon-button" onClick={onCancelPick} aria-label="Natrag na obrazac"><X size={18} /></button>
          </div>
        ) : (
          <div className="map-actions">
            <button type="button" ref={overviewTrigger} className="map-button overview-trigger" aria-expanded={overviewOpen || panelOpen} aria-controls="weather-overview"
              onClick={() => { setLegendOpen(false); onOverview() }}>
              <LayoutDashboard size={19} aria-hidden /> Pregled
            </button>
            <PlaceSearch onPlace={onPlace} onOpen={() => { setLegendOpen(false); onPopupOpen() }} />
          </div>
        )}
        {unavailable && <p role="status" className="map-notice">Podloga nije dostupna. Prijave možete otvoriti iz pregleda.</p>}
        {offline && <p role="status" className="map-notice">Nema internetske veze.</p>}
        {note && <p role="status" className="map-notice">{note}</p>}
      </div>

      <div className="map-tools" ref={tools}>
        <div className="zoom-stack">
          <button type="button" className="map-button" aria-label="Približi" title="Približi" onClick={() => map?.zoom(0.75)}><Plus size={20} aria-hidden /></button>
          <button type="button" className="map-button" aria-label="Udalji" title="Udalji" onClick={() => map?.zoom(-0.75)}><Minus size={20} aria-hidden /></button>
        </div>
        <button type="button" className="map-button map-square" aria-label="Prikaži cijelu Hrvatsku" title="Prikaži cijelu Hrvatsku" onClick={() => map?.reset()}>
          <Crosshair size={19} aria-hidden />
        </button>
        {/* Dok se bira lokacija, ostali gumbi se skrivaju */}
        {!picking && (
          <>
            <button type="button" className="map-button map-square" aria-label="Moja lokacija" title="Moja lokacija" onClick={onLocate}>
              <LocateFixed size={19} aria-hidden />
            </button>
            <button type="button" ref={legendButton} className="map-button map-square" aria-label="Legenda" title="Legenda" aria-expanded={legendOpen}
              onClick={() => { if (!legendOpen) onPopupOpen(); setLegendOpen(value => !value) }}>
              <Info size={19} aria-hidden />
            </button>
            {legendOpen && <MapLegend onClose={closeLegend} />}
          </>
        )}
      </div>

      {!picking && <button type="button" className="primary report-fab" onClick={onReport}><Plus size={19} aria-hidden /> Nova prijava</button>}
    </>
  )
}
