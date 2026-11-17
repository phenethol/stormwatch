import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Side panel (desktop) or bottom sheet (phone) with the details of what is selected on the map. */
export function DetailPanel({ onClose, expanded, onExpand, children }: { onClose: () => void; expanded: boolean; onExpand: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus({ preventScroll: true }) }, [])
  return <aside className={`detail${expanded ? ' detail-expanded' : ''}`} aria-label="Detalji na karti">
    <header className="detail-bar"><span>Detalji na karti</span><div className="detail-actions">
      <button type="button" className="icon-button detail-expand" aria-expanded={expanded} aria-controls="map-detail-content"
        aria-label={expanded ? 'Smanji detalje' : 'Proširi detalje'} onClick={onExpand}>{expanded ? <ChevronDown size={19} /> : <ChevronUp size={19} />}</button>
      <button ref={close} type="button" className="icon-button" aria-label="Zatvori detalje" onClick={onClose}><X size={18} /></button>
    </div></header>
    <div id="map-detail-content" className="detail-scroll" tabIndex={0} aria-label="Sadržaj detalja">{children}</div>
  </aside>
}

export function DetailTitle({ icon, source, title, subtitle }: { icon: ReactNode; source: string; title: string; subtitle?: string }) {
  return <div className="detail-heading"><span className="detail-icon">{icon}</span><div><p>{source}</p><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div></div>
}
