import { Clock3, RadioTower } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Measurement, Station } from '../types/station'
import { coordinates, formatClock, formatDate, number } from '../utils/format'
import { freshMeasurementHours } from '../utils/stationLayout'
import { DetailTitle } from './DetailPanel'

// Brzina vjetra u m/s i km/h
function speed(value: number) {
  return <>{number(value)} <span>m/s · {number(value * 3.6)} km/h</span></>
}

// Mjerenja postaje, prikazuje se samo ono što je backend stvarno vratio
function Readings({ reading, current = true }: { reading: Measurement; current?: boolean }) {
  const rows: [string, ReactNode][] = []
  if (reading.wind_speed_ms != null) rows.push(['Brzina vjetra', speed(reading.wind_speed_ms)])
  if (reading.wind_direction) rows.push(['Smjer vjetra', reading.wind_direction])
  if (reading.wind_gust_ms != null) rows.push(['Udari vjetra', speed(reading.wind_gust_ms)])
  if (reading.humidity_pct != null) rows.push(['Vlažnost', <>{number(reading.humidity_pct)} <span>%</span></>])
  if (reading.pressure_hpa != null) rows.push(['Tlak', <>{number(reading.pressure_hpa)} <span>hPa</span></>])
  // Backend ne šalje razdoblje oborina, pa pišemo samo do kada su izmjerene
  if (reading.precipitation_mm != null) {
    rows.push(['Oborine', <>{number(reading.precipitation_mm)} <span>mm · do {formatClock(reading.measured_at)}</span></>])
  }

  return (
    <>
      {reading.temperature_c == null ? (
        <p className="inline-note">Temperatura nije dostupna za ovo mjerenje.</p>
      ) : (
        <>
          <p className="measurement-label">{current ? 'Posljednja izmjerena temperatura' : 'Starije mjerenje temperature'}</p>
          <div className="temperature"><strong>{number(reading.temperature_c)}</strong><span>°C</span></div>
        </>
      )}
      <dl className="reading-grid">
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="timed"><Clock3 size={15} aria-hidden /> Izmjereno {formatDate(reading.measured_at)}</p>
      {!current && reading.temperature_c != null && (
        <p className="inline-note">Mjerenje je starije od {freshMeasurementHours} sata, pa se temperatura ne prikazuje na karti.</p>
      )}
    </>
  )
}

// Detalji postaje odabrane na karti ili u popisu
export function StationDetail({ station, current }: { station: Station; current: boolean }) {
  return (
    <>
      <DetailTitle icon={<RadioTower size={24} />} source="Meteorološka postaja DHMZ-a" title={station.name} subtitle={coordinates(station.location)} />
      {station.latest_measurement ? (
        <Readings reading={station.latest_measurement} current={current} />
      ) : (
        <p className="inline-note">Temperatura nije dostupna. Za ovu postaju nema zabilježenog mjerenja.</p>
      )}
      {station.altitude_m != null && <p className="timed">Nadmorska visina {number(station.altitude_m)} m</p>}
      <a className="source-note" href="https://meteo.hr/">Izvor mjerenja: DHMZ</a>
    </>
  )
}
