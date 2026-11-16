import type { ReactNode } from 'react'

/** Frame of a separate page: title, optional subtitle and the content below. */
export function Page({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return <div className="page-inner">
    <header className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></header>
    {children}
  </div>
}

export function Pager({ page, count, onPage, size = 20 }: { page: number; count: number; onPage: (page: number) => void; size?: number }) {
  if (!page && count <= size) return null
  return <div className="pagination">
    <button type="button" className="secondary" disabled={!page} onClick={() => onPage(page - 1)}>Prethodne</button>
    <span className="pagination-count">{page * size + 1}–{Math.min((page + 1) * size, count)} / {count}</span>
    <button type="button" className="secondary" disabled={(page + 1) * size >= count} onClick={() => onPage(page + 1)}>Sljedeće</button>
  </div>
}

/** Loading, error and empty states of a resource. Stale data stay visible under an error. */
export function Status({ resource, empty, emptyText, loadingText = 'Učitavanje…' }: {
  resource: { updated?: number; error?: string; refresh: () => void }; empty?: boolean; emptyText?: string; loadingText?: string
}) {
  return <>
    {resource.error && <p className="inline-note error" role="alert">{resource.error} <button type="button" className="text-button" onClick={resource.refresh}>Pokušaj ponovno</button></p>}
    {!resource.updated && !resource.error && <p className="inline-note" role="status">{loadingText}</p>}
    {!!resource.updated && empty && emptyText && <p className="inline-note">{emptyText}</p>}
  </>
}
