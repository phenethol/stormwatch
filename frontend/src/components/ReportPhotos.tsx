import type { ReportPhoto } from '../types/report'

/** Fotografije koje backend vraća za pojedinačnu prijavu. */
export function ReportPhotos({ photos }: { photos?: ReportPhoto[] }) {
  if (!photos?.length) return null

  return <section className="detail-section" aria-label="Fotografije prijave">
    <h3>Fotografije ({photos.length})</h3>
    <div className="report-photos">
      {photos.map((photo, index) => <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer"
        aria-label={`Otvori fotografiju ${index + 1} u novoj kartici`}>
        <img src={photo.thumbnail_url || photo.url} alt={`Fotografija opažanja ${index + 1}`} loading="lazy" />
      </a>)}
    </div>
  </section>
}
