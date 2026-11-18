import { X } from 'lucide-react'
import { dhmzEnabled } from '../services/dhmzApi'
import { apiPhenomena, phenomenonLabels } from '../types/report'
import { ThermometerIcon, WeatherIcon } from './icons'

// Legenda karte: vrste oznaka i simbol svake pojave
export function MapLegend({ onClose }: { onClose: () => void }) {
  return (
    <section className="map-popover popover-legend" aria-label="Legenda karte">
      <div className="popover-title">
        <strong>Legenda karte</strong>
        <button type="button" className="icon-button" aria-label="Zatvori izbornik" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="legend-content">
        {dhmzEnabled && (
          <div className="legend-row">
            <span className="legend-symbol"><span className="station-chip"><ThermometerIcon size={12} /><b>12,4°</b></span></span>
            Postaja s aktualnom temperaturom
          </div>
        )}
        <div className="legend-row">
          <span className="legend-symbol observation-pin verified"><span className="pin-body"><WeatherIcon type="hail" size={18} /></span></span>
          Potvrđena prijava
        </div>
        <div className="legend-row">
          <span className="legend-symbol observation-pin unverified"><span className="pin-body"><WeatherIcon type="hail" size={18} /></span></span>
          Prijava na čekanju
        </div>
        <div className="legend-phenomena">
          {apiPhenomena.map(type => <span key={type}><WeatherIcon type={type} size={16} />{phenomenonLabels[type]}</span>)}
        </div>
      </div>
    </section>
  )
}
