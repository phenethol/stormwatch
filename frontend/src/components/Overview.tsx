import { PanelLeftClose, RadioTower, RotateCw, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { dhmzEnabled } from '../services/dhmzApi'
import type { Selection } from '../types/map'
import type { Filter, Report } from '../types/report'
import type { Station } from '../types/station'
import { StationCard } from './DhmzCards'
import { ReportsIcon } from './icons'
import ReportCard from './ReportCard'
import { ReportFilters } from './ReportFilters'

export type OverviewTab = 'reports' | 'stations'

type Props = {
  tab: OverviewTab
  onTab: (tab: OverviewTab) => void
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  onCollapse: () => void
  reports: Report[] // prijave nakon filtriranja
  totalReports: number // sve dostupne prijave
  filters: Filter
  onFilters: (filter: Filter) => void
  onSelect: (selection: Selection) => void
  selected: Selection | null
  signedIn: boolean
  onRefresh: () => void
  error?: string
  loading: boolean
  stations: Station[]
  onRefreshDhmz: () => void
  dhmzError?: string
  dhmzLoading: boolean
}

// Kartica Postaje postoji samo uz VITE_ENABLE_DHMZ=true
const tabs: { value: OverviewTab; label: string; icon: ReactNode }[] = [
  { value: 'reports', label: 'Prijave', icon: <ReportsIcon size={15} /> },
]
if (dhmzEnabled) tabs.push({ value: 'stations', label: 'Postaje', icon: <RadioTower size={15} aria-hidden /> })

// Koliko se kartica prikazuje odjednom; "Prikaži još" dodaje toliko novih
const pageSize = 32

// Lijevi panel: popis prijava s filtrima i (neobavezno) popis DHMZ postaja
export function Overview({ tab, onTab, mobileOpen, onMobileClose, collapsed, onCollapse, reports, totalReports, filters, onFilters,
  onSelect, selected, signedIn, onRefresh, error, loading, stations, onRefreshDhmz, dhmzError, dhmzLoading }: Props) {
  const panel = useRef<HTMLElement>(null)

  // Broj prikazanih prijava; vraća se na početni kad se promijene filtri
  const [reportLimit, setReportLimit] = useState({ value: pageSize, filters })
  const shownReports = reportLimit.filters === filters ? reportLimit.value : pageSize

  // Pretraga postaja po nazivu
  const [stationQuery, setStationQuery] = useState('')
  const [stationLimit, setStationLimit] = useState(pageSize)
  const search = stationQuery.trim().toLocaleLowerCase('hr-HR')
  const stationResults = search ? stations.filter(item => item.name.toLocaleLowerCase('hr-HR').includes(search)) : stations

  // Gumb za osvježavanje, greška i učitavanje odnose se na otvorenu karticu
  const onReports = tab === 'reports'
  const refresh = onReports ? onRefresh : onRefreshDhmz
  const currentError = onReports ? error : dhmzError
  const currentLoading = onReports ? loading : dhmzLoading
  const counts: Record<OverviewTab, number> = { reports: totalReports, stations: stations.length }

  // Na mobitelu fokus ide na gumb za zatvaranje kad se panel otvori
  useEffect(() => {
    if (mobileOpen) panel.current?.querySelector<HTMLElement>('.mobile-sheet-heading button')?.focus({ preventScroll: true })
  }, [mobileOpen])

  // Strelice, Home i End pomiču odabir između kartica
  function moveTab(event: KeyboardEvent, value: OverviewTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = tabs.findIndex(item => item.value === value)
    let next = (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    onTab(tabs[next].value)
    document.getElementById(`tab-${tabs[next].value}`)?.focus()
  }

  const className = `overview${mobileOpen ? ' overview-open' : ''}${collapsed ? ' overview-collapsed' : ''}`

  return (
    <aside ref={panel} id="weather-overview" className={className} aria-label="Pregled prijava">
      <div className="overview-title">
        <h1>Pregled prijava</h1>
        <button type="button" className="icon-button overview-collapse" aria-label="Sakrij pregled" title="Sakrij pregled" onClick={onCollapse}>
          <PanelLeftClose size={18} aria-hidden />
        </button>
      </div>
      <header className="mobile-sheet-heading">
        <strong>Pregled prijava</strong>
        <button type="button" className="icon-button" aria-label="Zatvori pregled" onClick={onMobileClose}><X size={18} aria-hidden /></button>
      </header>

      <div className="overview-tabs" role="tablist" aria-label="Vrsta podataka">
        {tabs.map(({ value, label, icon }) => (
          <button key={value} type="button" id={`tab-${value}`} role="tab" aria-controls="overview-content"
            aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
            onClick={() => onTab(value)} onKeyDown={event => moveTab(event, value)}>
            {icon}{label}<span className="count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="overview-scroll" id="overview-content" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div className="section-head">
          <div>
            <h2>{onReports ? 'Opažanja građana' : 'Meteorološke postaje'}</h2>
            <p>
              {onReports
                ? `${reports.length.toLocaleString('hr-HR')} od ${totalReports.toLocaleString('hr-HR')} dostupnih prijava`
                : 'Posljednja dostupna službena mjerenja'}
            </p>
          </div>
          <button className="icon-button" type="button" onClick={refresh} aria-label="Osvježi prikaz" title="Osvježi prikaz"><RotateCw size={16} aria-hidden /></button>
        </div>

        {onReports && <ReportFilters filters={filters} onFilters={onFilters} signedIn={signedIn} />}
        {!onReports && (
          <label className="station-search">
            <Search size={16} aria-hidden />
            <input aria-label="Pretraži postaje" placeholder="Pronađi postaju…" value={stationQuery}
              onChange={event => { setStationQuery(event.target.value); setStationLimit(pageSize) }} />
          </label>
        )}

        {currentError && (
          <p className="inline-note error" role="alert">
            {currentError} <button type="button" className="text-button" onClick={refresh}>Pokušaj ponovno</button>
          </p>
        )}
        {currentLoading && <p className="inline-note" role="status">{onReports ? 'Učitavanje prijava…' : 'Učitavanje podataka DHMZ-a…'}</p>}
        {!currentLoading && !currentError && onReports && reports.length === 0 && (
          <p className="inline-note">{totalReports ? 'Nema prijava za odabrane filtre.' : 'Nema dostupnih prijava.'}</p>
        )}
        {!currentLoading && !currentError && !onReports && stationResults.length === 0 && <p className="inline-note">Nema dostupnih postaja.</p>}

        {onReports && (
          <>
            <ul className="card-list">
              {reports.slice(0, shownReports).map(report => (
                <li key={report.id}>
                  <ReportCard report={report} active={selected?.kind === 'reports' && selected.id === report.id}
                    onClick={() => onSelect({ kind: 'reports', id: report.id })} />
                </li>
              ))}
            </ul>
            {reports.length > shownReports && (
              <button className="secondary load-more" type="button" onClick={() => setReportLimit({ value: shownReports + pageSize, filters })}>
                Prikaži još <span>{shownReports} / {reports.length}</span>
              </button>
            )}
          </>
        )}

        {!onReports && (
          <>
            <ul className="card-list">
              {stationResults.slice(0, stationLimit).map(station => (
                <li key={station.id}>
                  <StationCard station={station} active={selected?.kind === 'stations' && selected.id === station.id}
                    onClick={() => onSelect({ kind: 'stations', id: station.id })} />
                </li>
              ))}
            </ul>
            {stationResults.length > stationLimit && (
              <button className="secondary load-more" type="button" onClick={() => setStationLimit(value => value + pageSize)}>
                Prikaži još <span>{stationLimit} / {stationResults.length}</span>
              </button>
            )}
            <p className="source-note">Izvor podataka: <a href="https://meteo.hr/" target="_blank" rel="noreferrer">DHMZ</a>. Podaci dolaze iz StormWatch backenda.</p>
          </>
        )}
      </div>

      <p className="emergency-note">StormWatch nije služba za hitne slučajeve — u hitnim slučajevima nazovite <a href="tel:112">112</a>.</p>
    </aside>
  )
}
