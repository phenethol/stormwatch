
import { ChevronRight, Crosshair, MapPin, Phone, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sendReport } from '../services/reportsApi'
import { apiPhenomena, damageNames, intensityNames, phenomenonLabels, strengths, type Damage, type Intensity } from '../types/report'
import { formatDate } from '../utils/format'
import { apiIntensity, assignLocation, type Draft } from '../utils/reports'
import { Modal } from './Modal'

export function ReportForm({ draft, onDraft, onClose, onPick, onLogin, account, onSaved }: {
  draft: Draft
  onDraft: (draft: Draft) => void
  onClose: () => void
  onPick: () => void
  onLogin: () => void
  account: boolean
  onSaved: () => void
}) {
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const photos = draft.photos
  const [gps, setGps] = useState(false)

  const currentDraft = useRef(draft)

  useEffect(() => {
    currentDraft.current = draft
  }, [draft])

  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    onDraft({ ...draft, [key]: value })
  }

  const position = () => {
    if (!navigator.geolocation) {
      setError('GPS nije dostupan u ovom pregledniku.')
      return
    }

    currentDraft.current = draft
    setGps(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onDraft(assignLocation(currentDraft.current, { lat: coords.latitude, lon: coords.longitude }, 'gps'))
        setGps(false)
      },
      () => {
        setError('Lokaciju nije moguće odrediti. Odaberite točku na karti ili unesite koordinate.')
        setGps(false)
      },
      { timeout: 10_000 },
    )
  }

  async function next() {
    setError('')

    const time = Date.parse(draft.observed)
    const now = Date.now()
    const lat = Number(draft.lat)
    const lon = Number(draft.lon)

    if (!draft.phenomenon || !draft.intensity) {
      setError('Odaberite vrstu pojave i intenzitet.')
      return
    }

    if (!draft.lat || !draft.lon || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      setError('Unesite valjanu geografsku širinu i dužinu.')
      return
    }

    if (!Number.isFinite(time) || time < now - 86_400_000 || time > now + 300_000) {
      setError('Vrijeme opažanja mora biti unutar posljednja 24 sata ili najviše 5 minuta u budućnosti.')
      return
    }

    if (photos.length < 1 || photos.length > 5) {
      setError('Morate dodati od 1 do 5 fotografija.')
      return
    }

    if (photos.some(photo => photo.size > 10 * 1024 * 1024)) {
      setError('Svaka fotografija smije imati najviše 10 MB.')
      return
    }

    if (photos.some(photo => !/\.(jpe?g|png|webp|heic|heif)$/i.test(photo.name))) {
      setError('Dopušteni formati fotografija su JPEG, PNG, WebP i HEIC.')
      return
    }

    if (!review) {
      setReview(true)
      return
    }

    if (!account || busy) return

    setBusy(true)

    const payload = new FormData()

    for (const [key, value] of Object.entries({
      phenomenon: draft.phenomenon,
      intensity: apiIntensity(draft.phenomenon, draft.intensity),
      damage: draft.damage,
      observed_at: new Date(time).toISOString(),
      lat: String(lat),
      lon: String(lon),
      location_source: draft.source,
      description: draft.description.trim(),
    })) {
      payload.set(key, value)
    }

    for (const photo of photos) {
      payload.append('photos', photo)
    }

    try {
      await sendReport(payload)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Slanje nije uspjelo. Vaš je unos sačuvan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Nova prijava" onClose={onClose} busy={busy}>
      <form
        className="report-form"
        onSubmit={event => {
          event.preventDefault()
          void next()
        }}
      >
        <p className="inline-note emergency">
          <Phone size={15} />{' '}
          <span>
            StormWatch nije služba za hitne slučajeve — u hitnim slučajevima nazovite <a href="tel:112">112</a>. Korisničke prijave nisu službena upozorenja.
          </span>
        </p>

        {!account && (
          <button type="button" className="secondary" onClick={onLogin}>
            Prijavi se Google računom za slanje
          </button>
        )}

        {error && (
          <p className="inline-note error" role="alert">
            {error}
          </p>
        )}

        {review ? (
          <>
            <h3>Pregled opažanja</h3>
            <p>Fotografije: {photos.map(photo => photo.name).join(', ')}</p>

            <dl className="review-grid">
              <div>
                <dt>Pojava</dt>
                <dd>{draft.phenomenon && phenomenonLabels[draft.phenomenon]}</dd>
              </div>

              <div>
                <dt>Intenzitet</dt>
                <dd>{draft.intensity && intensityNames[draft.intensity]}</dd>
              </div>

              <div>
                <dt>Opaženo</dt>
                <dd>{formatDate(new Date(draft.observed).toISOString())}</dd>
              </div>

              <div>
                <dt>Šteta</dt>
                <dd>{damageNames[draft.damage]}</dd>
              </div>

              <div>
                <dt>Koordinate</dt>
                <dd>{draft.lat}, {draft.lon}</dd>
              </div>

              {draft.description && (
                <div className="full-row">
                  <dt>Opis</dt>
                  <dd>{draft.description}</dd>
                </div>
              )}
            </dl>

            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setReview(false)
                  setError('')
                }}
              >
                Uredi unos
              </button>

              <button type="submit" className="primary" disabled={!account || busy}>
                <Send size={16} />{' '}
                {busy ? 'Slanje…' : 'Pošalji prijavu'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Vrsta pojave
                <select
                  required
                  value={draft.phenomenon}
                  onChange={event => onDraft({ ...draft, phenomenon: event.target.value as Draft['phenomenon'], intensity: '' })}
                >
                  <option value="">Odaberite pojavu</option>
                  {apiPhenomena.map(value => (
                    <option key={value} value={value}>
                      {phenomenonLabels[value]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Intenzitet
                <select
                  required
                  value={draft.intensity}
                  onChange={event => change('intensity', event.target.value as Draft['intensity'])}
                >
                  <option value="">Odaberite intenzitet</option>
                  {(draft.phenomenon === 'hail' ? (['pea', 'hazelnut', 'walnut', 'egg'] as Intensity[]) : strengths).map(value => (
                    <option key={value} value={value}>
                      {intensityNames[value]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Vrijeme opažanja
                <input
                  required
                  type="datetime-local"
                  value={draft.observed}
                  onChange={event => change('observed', event.target.value)}
                />
              </label>

              <label>
                Procjena štete
                <select
                  value={draft.damage}
                  onChange={event => change('damage', event.target.value as Damage)}
                >
                  {Object.entries(damageNames).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="location-fields">
              <legend>Lokacija opažanja</legend>

              <div className="location-actions">
                <button type="button" className="secondary" onClick={onPick} disabled={gps}>
                  <MapPin size={16} />{' '}
                  Odaberi na karti
                </button>

                <button type="button" className="secondary" onClick={position} disabled={gps}>
                  <Crosshair size={16} />{' '}
                  {gps ? 'Tražim lokaciju…' : 'Upotrijebi GPS'}
                </button>
              </div>

              <div className="form-grid">
                <label>
                  Širina
                  <input
                    required
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    value={draft.lat}
                    onChange={event => onDraft({ ...draft, lat: event.target.value, source: 'map' })}
                  />
                </label>

                <label>
                  Dužina
                  <input
                    required
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={draft.lon}
                    onChange={event => onDraft({ ...draft, lon: event.target.value, source: 'map' })}
                  />
                </label>
              </div>
            </fieldset>

            <div className="photo-field">
              <span>Fotografije (1–5, maksimalno 10 MB po fotografiji)</span>

              <label className="photo-upload">
                <span>Odaberi fotografije</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,.heic,.heif"
                  multiple
                  className="photo-input"
                  onChange={event => {
                    change('photos', Array.from(event.target.files ?? []))
                  }}
                />
              </label>

              <small>
                {photos.length === 0
                  ? 'Nije odabrana nijedna fotografija'
                  : `Odabrano fotografija: ${photos.length}`}
              </small>
            </div>

            <label>
              <span>
                Opis opažanja <small>(neobavezno)</small>
              </span>
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="Opišite što ste primijetili..."
                value={draft.description}
                onChange={event => change('description', event.target.value)}
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="primary">
                Pregled prijave <ChevronRight size={17} />
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
