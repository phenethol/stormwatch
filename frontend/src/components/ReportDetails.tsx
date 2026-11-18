import { MapPin } from 'lucide-react'
import { useCallback } from 'react'
import { loadReport } from '../services/reportsApi'
import { useResource } from '../services/useResource'
import { damageNames, phenomenonLabels, stateLabels, type Report } from '../types/report'
import { coordinates, formatDate } from '../utils/format'
import { intensityLabel } from '../utils/reports'
import { DetailTitle } from './DetailPanel'
import { WeatherIcon } from './icons'
import { ReportPhotos } from './ReportPhotos'

// Detalji prijave odabrane na karti. Osnovno se zna odmah, a opis, šteta i fotografije stižu s backenda.
export function ReportDetails({ report }: { report: Report }) {
  const loader = useCallback((signal: AbortSignal) => loadReport(report.id, signal), [report.id])
  const detail = useResource(loader)
  const full = detail.data
  const loading = !detail.updated && !detail.error

  return (
    <>
      <DetailTitle
        icon={<WeatherIcon type={report.phenomenon} size={25} />}
        source="Prijava opažanja"
        title={phenomenonLabels[report.phenomenon]}
        subtitle={report.place_name ?? coordinates(report.location)}
      />
      <dl className="detail-facts">
        <div><dt>Status</dt><dd><span className={`report-status ${report.state}`}>{stateLabels[report.state]}</span></dd></div>
        <div><dt>Intenzitet</dt><dd>{intensityLabel(report.intensity)}</dd></div>
        <div><dt>Opaženo</dt><dd>{formatDate(report.observed_at)}</dd></div>
        {full?.damage && <div><dt>Šteta</dt><dd>{damageNames[full.damage]}</dd></div>}
      </dl>

      {detail.error && (
        <p className="inline-note error" role="alert">
          {detail.error} <button type="button" className="text-button" onClick={detail.refresh}>Pokušaj ponovno</button>
        </p>
      )}
      {loading && <p className="inline-note" role="status">Učitavanje detalja…</p>}

      {full?.rejection_reason && (
        <section className="detail-section"><h3>Obrazloženje odbijanja</h3><p>{full.rejection_reason}</p></section>
      )}
      {full?.description && (
        <section className="detail-section"><h3>Opis opažanja</h3><p>{full.description}</p></section>
      )}
      <ReportPhotos photos={full?.photos} />
      <p className="timed"><MapPin size={15} aria-hidden /> {coordinates(report.location)}</p>
    </>
  )
}
