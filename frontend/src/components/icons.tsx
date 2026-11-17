import type { Phenomenon } from '../types/report'
import { reportsPath, thermometerPath, weatherPath } from '../utils/symbols'

function Symbol({ path, size }: { path: string; size: number }) {
  return <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
    strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: path }} />
}

export function WeatherIcon({ type, size = 20 }: { type: Phenomenon; size?: number }) {
  return <Symbol path={weatherPath[type]} size={size} />
}

export function ReportsIcon({ size = 15 }: { size?: number }) {
  return <Symbol path={reportsPath} size={size} />
}

export function ThermometerIcon({ size = 16 }: { size?: number }) {
  return <Symbol path={thermometerPath} size={size} />
}
