import { Clock3 } from 'lucide-react'
import type { Station } from '../types/station'
import { formatDate } from '../utils/format'
import { hasCurrentTemperature, temperatureText } from '../utils/stationLayout'
import { ThermometerIcon } from './icons'

// Kartica postaje u popisu Postaje
export function StationCard({ station, active, onClick }: { station: Station; active: boolean; onClick: () => void }) {
  const reading = station.latest_measurement
  const temperature = reading?.temperature_c
  // Starija temperatura prikazuje se sivo
  const valueClass = hasCurrentTemperature(station) ? 'station-card-value' : 'station-card-value stale'

  return (
    <button type="button" className="report-card station-card" aria-pressed={active} onClick={onClick}>
      <span className="report-copy">
        <strong>{station.name}</strong>
        <span className="station-time">
          <Clock3 size={12} aria-hidden />
          {reading ? formatDate(reading.measured_at) : 'Nema mjerenja'}
        </span>
      </span>
      {temperature == null ? (
        <span className="station-card-value missing">bez temperature</span>
      ) : (
        <span className={valueClass}>
          <ThermometerIcon size={15} />
          {temperatureText(temperature)}
        </span>
      )}
    </button>
  )
}
