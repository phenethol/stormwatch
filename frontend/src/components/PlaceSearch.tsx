import { LoaderCircle, MapPin, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { minimumQuery, searchPlaces, type Place } from '../services/geocode'

type Result = { query: string; places?: Place[]; error?: string }

export function PlaceSearch({ onPlace, onOpen }: { onPlace: (place: Place) => void; onOpen: () => void }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<Result>({ query: '' })
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const list = useId()
  const query = text.trim()
  const ready = query.length >= minimumQuery
  const current = ready && result.query === query ? result : undefined
  const loading = ready && !current
  const places = current?.places ?? []

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    // Debounced, and the previous request is aborted as soon as the text changes.
    const timer = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then(found => { if (!controller.signal.aborted) { setResult({ query, places: found }); setActive(-1) } })
        .catch(cause => { if (!controller.signal.aborted) setResult({ query, error: cause instanceof Error ? cause.message : 'Pretraga nije uspjela.' }) })
    }, 380)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, ready])

  useEffect(() => {
    if (!open && !expanded) return
    const outside = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return
      setOpen(false)
      if (!text) setExpanded(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, expanded, text])

  const collapse = () => { setText(''); setOpen(false); setExpanded(false) }
  const choose = (place: Place) => {
    onPlace(place)
    setText(place.name)
    setOpen(false)
    setExpanded(false)
    input.current?.blur()
  }
  const showList = open && ready

  return <div ref={root} className={`place-search${expanded ? ' place-search-expanded' : ''}`} role="search">
    <button type="button" ref={toggle} className="map-button map-square place-search-toggle" aria-label="Pretraži lokacije" title="Pretraži lokacije"
      onClick={() => { onOpen(); setExpanded(true); requestAnimationFrame(() => input.current?.focus()) }}><Search size={19} aria-hidden /></button>
    <label className="place-search-field">
      <Search size={16} aria-hidden />
      <input ref={input} type="text" inputMode="search" enterKeyHint="search" autoComplete="off" spellCheck={false} placeholder="Pretraži grad, naselje ili adresu"
        aria-label="Pretraži grad, naselje ili adresu" role="combobox" aria-expanded={showList} aria-controls={list} aria-autocomplete="list"
        aria-activedescendant={active >= 0 && places[active] ? `${list}-${active}` : undefined}
        value={text} onChange={event => { setText(event.target.value); setOpen(true) }} onFocus={() => { onOpen(); setOpen(true) }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!places.length) return
            event.preventDefault()
            setOpen(true)
            setActive(value => (value + (event.key === 'ArrowDown' ? 1 : -1) + places.length + (value < 0 && event.key === 'ArrowUp' ? 1 : 0)) % places.length)
          } else if (event.key === 'Enter') {
            const place = places[active] ?? places[0]
            if (place) { event.preventDefault(); choose(place) }
          } else if (event.key === 'Escape' && (open || expanded || text)) {
            event.preventDefault()
            event.stopPropagation()
            if (showList) setOpen(false)
            else { collapse(); toggle.current?.focus() }
          }
        }} />
      {loading && <LoaderCircle size={15} className="place-search-busy" aria-hidden />}
      {(text || expanded) && <button type="button" className="icon-button" aria-label={text ? 'Obriši pretragu' : 'Zatvori pretragu'}
        onClick={() => { if (text) { setText(''); input.current?.focus() } else collapse() }}><X size={15} aria-hidden /></button>}
    </label>
    {showList && <div className="place-results">
      <ul id={list} role="listbox" aria-label="Pronađene lokacije">
        {places.map((place, index) => <li key={place.id} id={`${list}-${index}`} role="option" aria-selected={index === active}
          onPointerDown={event => event.preventDefault()} onClick={() => choose(place)} onPointerEnter={() => setActive(index)}>
          <MapPin size={15} aria-hidden /><span><strong>{place.name}</strong>{place.context && <small>{place.context}</small>}</span>
        </li>)}
      </ul>
      <p role="status" className="place-status">
        {loading ? 'Pretraživanje…' : current?.error ?? (places.length ? null : 'Nema pronađenih lokacija u Hrvatskoj.')}
      </p>
      <p className="place-credit">Pretraga: <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></p>
    </div>}
  </div>
}
