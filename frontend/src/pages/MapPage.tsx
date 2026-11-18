import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { DetailPanel } from '../components/DetailPanel'
import { StationDetail } from '../components/DhmzDetails'
import { WeatherMap, type MapControls } from '../components/map/WeatherMap'
import { MapTools } from '../components/MapTools'
import { Overview, type OverviewTab } from '../components/Overview'
import { ReportDetails } from '../components/ReportDetails'
import { ReportForm } from '../components/ReportForm'
import { dhmzEnabled, useDhmz } from '../services/dhmzApi'
import { useReports } from '../services/reportsApi'
import type { Layers, Point, Selection } from '../types/map'
import { noFilter } from '../types/report'
import { assignLocation, emptyDraft, filteredReports, type Draft } from '../utils/reports'
import { hasCurrentTemperature, mobileMap } from '../utils/stationLayout'

// Prati ima li internetske veze
function subscribeConnection(change: () => void) {
  window.addEventListener('online', change)
  window.addEventListener('offline', change)
  return () => {
    window.removeEventListener('online', change)
    window.removeEventListener('offline', change)
  }
}

// Što App (zaglavlje i sesija) može tražiti od stranice karte
export type MapPageHandle = {
  home: () => void // natrag na cijelu kartu i popis prijava
  report: () => void // otvori obrazac nove prijave (posjetitelju najprije prijavu)
  reset: () => void // poništi odabir i filtre, npr. nakon odjave
}

type Props = {
  active: boolean // je li stranica karte trenutno prikazana
  dark: boolean
  account: boolean // je li korisnik prijavljen
  sessionRevision: number
  onLogin: () => void
}

// Karta s pregledom prijava, alatima, detaljima odabranog i obrascem nove prijave
export const MapPage = forwardRef<MapPageHandle, Props>(function MapPage({ active, dark, account, sessionRevision, onLogin }, ref) {
  const online = useSyncExternalStore(subscribeConnection, () => navigator.onLine)
  const [filters, setFilters] = useState(noFilter)
  const [tab, setTab] = useState<OverviewTab>('reports')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false) // pregled na mobitelu
  const [panelOpen, setPanelOpen] = useState(false) // pregled na računalu
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [tileError, setTileError] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>() // obrazac se pamti dok se ne pošalje
  const [picking, setPicking] = useState(false) // korisnik bira lokaciju na karti
  const [note, setNote] = useState('')

  const map = useRef<MapControls>(null)
  const trigger = useRef<HTMLElement | null>(null) // element s kojeg je otvoren detalj
  const overviewTrigger = useRef<HTMLButtonElement>(null)

  const reportFeed = useReports(account, sessionRevision)
  const dhmz = useDhmz()
  const stations = dhmz.stations

  // Prijave se uvijek prikazuju, a postaje samo na kartici "Postaje"
  const layers: Layers = { reports: true, stations: dhmzEnabled && tab === 'stations' }
  const reports = useMemo(
    () => filteredReports(reportFeed.items, filters, reportFeed.updated),
    [reportFeed.items, filters, reportFeed.updated],
  )

  // Upravljanje kartom za gumbe u MapTools
  const controls = useMemo<MapControls>(() => ({
    zoom: delta => map.current?.zoom(delta),
    reset: () => map.current?.reset(),
    focus: (next, fromList) => map.current?.focus(next, fromList),
    locate: point => map.current?.locate(point),
    showPlace: place => map.current?.showPlace(place),
  }), [])

  // Zatvori detalj i vrati fokus tamo odakle je otvoren
  const closeDetail = useCallback(() => {
    setSelection(null)
    setDetailExpanded(false)
    if (trigger.current?.isConnected && trigger.current.getClientRects().length) trigger.current.focus({ preventScroll: true })
    else if (mobileMap()) overviewTrigger.current?.focus({ preventScroll: true })
    trigger.current = null
  }, [])

  // Odaberi prijavu ili postaju; iz popisa se karta i približi
  const choose = useCallback((next: Selection, center = false) => {
    const focused = document.activeElement
    if (focused instanceof HTMLElement && !focused.closest('.detail')) trigger.current = focused
    setSelection(next)
    if (dhmzEnabled) setTab(next.kind)
    setDetailExpanded(false)
    setMobileOpen(false)
    map.current?.focus(next, center)
  }, [])
  const chooseFromList = (next: Selection) => choose(next, true)

  const closeOverview = useCallback(() => {
    setMobileOpen(false)
    overviewTrigger.current?.focus({ preventScroll: true })
  }, [])

  const collapsePanel = () => {
    setPanelOpen(false)
    requestAnimationFrame(() => overviewTrigger.current?.focus({ preventScroll: true }))
  }

  // Gumb Pregled
  const toggleOverview = () => {
    if (!mobileMap()) {
      setPanelOpen(true)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.overview-collapse')?.focus({ preventScroll: true }))
    } else if (mobileOpen) {
      closeOverview()
    } else {
      if (selection) closeDetail()
      setMobileOpen(true)
    }
  }

  // Na mobitelu legenda i pretraga zatvaraju pregled i detalj
  const openMapPopup = () => {
    if (!mobileMap()) return
    setMobileOpen(false)
    setDetailExpanded(false)
  }

  // Biranje lokacije na karti
  const cancelPick = useCallback(() => {
    setPicking(false)
    setFormOpen(true)
  }, [])
  const pick = useCallback((point: Point) => {
    setDraft(value => assignLocation(value ?? emptyDraft(), point, 'map'))
    cancelPick()
  }, [cancelPick])

  // Obrazac može otvoriti samo prijavljeni korisnik
  const openForm = () => {
    if (!account) {
      onLogin()
      return
    }
    setDraft(value => value ?? emptyDraft())
    setFormOpen(true)
  }

  useImperativeHandle(ref, () => ({
    home: () => {
      closeDetail()
      setTab('reports')
      map.current?.reset()
    },
    report: openForm,
    reset: () => {
      closeDetail()
      setFilters(noFilter)
      setTab('reports')
    },
  }))

  // Gumb "Moja lokacija"
  const locate = () => {
    if (!navigator.geolocation) {
      setNote('Preglednik ne podržava određivanje lokacije.')
      return
    }
    setNote('Tražim vašu lokaciju…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.current?.locate({ lat: coords.latitude, lon: coords.longitude })
        setNote('')
      },
      () => setNote('Lokaciju nije moguće odrediti. Provjerite dopuštenja preglednika.'),
      { timeout: 10_000 },
    )
  }

  // Esc zatvara redom: biranje lokacije, detalj, pregled
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape' || !active || document.querySelector('dialog[open]')) return
      if (picking) cancelPick()
      else if (selection) closeDetail()
      else if (mobileOpen) closeOverview()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, picking, cancelPick, selection, closeDetail, mobileOpen, closeOverview])

  const report = selection?.kind === 'reports' ? reportFeed.items.find(item => item.id === selection.id) : undefined
  const station = selection?.kind === 'stations' ? stations.find(item => item.id === selection.id) : undefined
  const visibleDetail = !picking && Boolean(report || station)

  // Pribadača na karti dok se bira lokacija ako su koordinate ispravne
  const lat = Number(draft?.lat)
  const lon = Number(draft?.lon)
  const draftPoint = picking && draft?.lat && draft?.lon && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined

  const workspaceClass = [
    'workspace',
    visibleDetail && 'workspace-detail',
    visibleDetail && detailExpanded && 'workspace-detail-expanded',
    mobileOpen && !picking && 'workspace-overview',
    !panelOpen && 'workspace-collapsed',
  ].filter(Boolean).join(' ')

  // Promjena kartice zatvara detalj koji ne pripada toj kartici
  const changeTab = (next: OverviewTab) => {
    setTab(next)
    if (selection?.kind !== next) closeDetail()
  }

  // Nakon slanja natrag na kartu nova prijava stiže s osvježenim popisom
  const reportSaved = () => {
    setDraft(undefined)
    setFormOpen(false)
    reportFeed.refresh()
  }

  const startPicking = () => {
    setFormOpen(false)
    setPicking(true)
    setMobileOpen(false)
  }

  return (
    <>
      <div className={workspaceClass} inert={!active}>
        <Overview
          tab={tab} onTab={changeTab}
          mobileOpen={mobileOpen && !picking} onMobileClose={closeOverview}
          collapsed={!panelOpen} onCollapse={collapsePanel}
          reports={reports} totalReports={reportFeed.items.length}
          filters={filters} onFilters={setFilters}
          onSelect={chooseFromList} selected={selection} signedIn={account}
          onRefresh={reportFeed.refresh} error={reportFeed.error} loading={!reportFeed.received && !reportFeed.error}
          stations={stations} onRefreshDhmz={dhmz.refreshStations} dhmzError={dhmz.stationsError} dhmzLoading={dhmz.stationsLoading}
        />
        <main className="map-region" aria-label="Karta prijava nevremena">
          <WeatherMap
            ref={map} reports={reports} stations={stations} selected={selection} layers={layers}
            dark={dark} picking={picking} draft={draftPoint} now={Date.now()}
            onSelect={choose} onPick={pick} onTileError={setTileError}
          />
          <MapTools
            map={controls} onLocate={locate} onPlace={controls.showPlace} onReport={openForm}
            picking={picking} onCancelPick={cancelPick}
            overviewOpen={mobileOpen} panelOpen={panelOpen} overviewTrigger={overviewTrigger}
            onOverview={toggleOverview} onPopupOpen={openMapPopup}
            unavailable={tileError} offline={!online} note={note}
          />
        </main>
        {visibleDetail && (
          <DetailPanel key={`${selection?.kind}-${selection?.id}`} onClose={closeDetail}
            expanded={detailExpanded} onExpand={() => setDetailExpanded(value => !value)}>
            {report && <ReportDetails key={report.id} report={report} />}
            {station && <StationDetail station={station} current={hasCurrentTemperature(station)} />}
          </DetailPanel>
        )}
      </div>
      {formOpen && draft && (
        <ReportForm draft={draft} onDraft={setDraft} account={account} onLogin={onLogin}
          onClose={() => setFormOpen(false)} onPick={startPicking} onSaved={reportSaved} />
      )}
    </>
  )
})
