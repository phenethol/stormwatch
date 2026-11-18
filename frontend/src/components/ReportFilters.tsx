import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { apiPhenomena, intensityNames, noFilter, phenomenonLabels, strengths, type Filter } from '../types/report'

// Ponuđena razdoblja (u satima; 0 znači sve)
const periods = [
  { hours: 0, label: 'Sva opažanja' },
  { hours: 1, label: 'Posljednji sat' },
  { hours: 6, label: 'Posljednjih 6 sati' },
  { hours: 24, label: 'Posljednja 24 sata' },
  { hours: 168, label: 'Posljednjih 7 dana' },
]

type Props = { filters: Filter; onFilters: (filter: Filter) => void; signedIn: boolean }

// Filtri popisa prijava : pojava, status, razdoblje i intenzitet
export function ReportFilters({ filters, onFilters, signedIn }: Props) {
  // Broj uključenih filtara, prikazuje se uz naslov
  const active = [filters.phenomenon, filters.status, filters.intensity, filters.hours].filter(Boolean).length

  return (
    <details className="filters">
      <summary>
        <SlidersHorizontal size={16} aria-hidden /> Filtri {active > 0 && <span className="count">{active}</span>}<ChevronDown size={16} aria-hidden />
      </summary>
      <div className="filter-fields">
        <label>
          Pojava
          <select value={filters.phenomenon} onChange={event => onFilters({ ...filters, phenomenon: event.target.value as Filter['phenomenon'] })}>
            <option value="">Sve pojave</option>
            {apiPhenomena.map(value => <option key={value} value={value}>{phenomenonLabels[value]}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={event => onFilters({ ...filters, status: event.target.value as Filter['status'] })}>
            <option value="">Svi statusi</option>
            <option value="confirmed">Potvrđena</option>
            {/* Prijave na čekanju vidi samo prijavljeni korisnik */}
            {signedIn && <option value="pending">Na čekanju</option>}
          </select>
        </label>
        <label>
          Razdoblje
          <select value={filters.hours} onChange={event => onFilters({ ...filters, hours: Number(event.target.value) })}>
            {periods.map(period => <option key={period.hours} value={period.hours}>{period.label}</option>)}
          </select>
        </label>
        <label>
          Intenzitet
          <select value={filters.intensity} onChange={event => onFilters({ ...filters, intensity: event.target.value as Filter['intensity'] })}>
            <option value="">Svi intenziteti</option>
            {strengths.map(value => <option key={value} value={value}>{intensityNames[value]}</option>)}
          </select>
        </label>
        {active > 0 && (
          <button className="secondary clear-filters" type="button" onClick={() => onFilters(noFilter)}><X size={14} /> Poništi filtre</button>
        )}
      </div>
    </details>
  )
}
