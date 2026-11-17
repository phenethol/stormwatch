import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import type { ReportDetail, ReportState } from "../types/report";
import { damageNames, phenomenonLabels, stateLabels } from "../types/report";
import { loadAccountInfo } from "../services/authApi";
import { getMyReports, loadReport } from "../services/reportsApi";
import { useResource } from "../services/useResource";
import { coordinates } from "../utils/format";
import { intensityLabel, reporterName } from "../utils/reports";
import { DetailTitle } from "../components/DetailPanel";
import { WeatherIcon } from "../components/icons";
import ReportCard from "../components/ReportCard";
import { ReportPhotos } from "../components/ReportPhotos";
import { Page, Pager, Status } from "../components/ui";

const pageSize = 20;
const states: ReportState[] = ["submitted", "pending", "confirmed", "rejected"];

const submittedTime = (report: ReportDetail) =>
  new Date(report.submitted_at ?? report.observed_at).getTime();

/** „Moje prijave”: sve prijave prijavljenog korisnika sa stanjem, filtrom po stanju i detaljem. */
function ReportsPage() {
  const [page, setPage] = useState(0);
  const [state, setState] = useState<ReportState | "">("");
  const [selected, setSelected] = useState<number | null>(null);
  // Popis se osvježava svakih ~15 s pa se odluka administratora vidi bez ponovnog učitavanja.
  const result = useResource(getMyReports, 15_000);

  const current =
    selected === null ? undefined : result.data?.find((report) => report.id === selected);

  if (current) {
    return (
      <Page title="Moje prijave" subtitle="Detalji vlastite prijave">
        <MyReportDetail key={current.id} report={current} onBack={() => setSelected(null)} />
      </Page>
    );
  }

  const sortedReports = [...(result.data ?? [])]
    .filter((report) => !state || report.state === state)
    .sort((a, b) => submittedTime(b) - submittedTime(a));

  const lastPage = Math.max(0, Math.ceil(sortedReports.length / pageSize) - 1);
  const shownPage = Math.min(page, lastPage);

  return (
    <Page
      title="Moje prijave"
      subtitle="Vaša opažanja i ishod provjere. Odbijene prijave vidite samo vi, uz obrazloženje."
    >
      <div className="toolbar report-form">
        <label>
          Stanje
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value as ReportState | "");
              setPage(0);
            }}
          >
            <option value="">Sva stanja</option>
            {states.map((value) => (
              <option key={value} value={value}>
                {stateLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Status
        resource={result}
        empty={!sortedReports.length}
        emptyText={state ? "Nemate prijava u odabranom stanju." : "Još nemate prijava."}
        loadingText="Učitavanje prijava…"
      />

      {result.data && (
        <>
          <ul className="card-list">
            {sortedReports
              .slice(shownPage * pageSize, (shownPage + 1) * pageSize)
              .map((report) => (
                <li key={report.id}>
                  <ReportCard report={report} onClick={() => setSelected(report.id)} />
                </li>
              ))}
          </ul>
          <Pager page={shownPage} count={sortedReports.length} onPage={setPage} size={pageSize} />
        </>
      )}
    </Page>
  );
}

/** Detalj vlastite prijave (M1): stanje, intenzitet, šteta, tko je prijavio i obrazloženje odbijanja. */
function MyReportDetail({ report, onBack }: { report: ReportDetail; onBack: () => void }) {
  const load = useCallback(
    (signal: AbortSignal) => loadReport(report.id, signal),
    [report.id]
  );
  const detail = useResource(load);
  const user = useResource(loadAccountInfo);

  const damage = detail.data?.damage ?? report.damage;
  const reason = detail.data?.rejection_reason ?? report.rejection_reason;
  // Ovo su korisnikove vlastite prijave, pa se prikazuje ime računa ako backend ne vrati autora.
  const reporter =
    reporterName(detail.data ?? {}) ?? reporterName(report) ?? user.data?.username;
  const loading = !detail.updated && !detail.error;

  return (
    <div className="panel detail-panel">
      <div className="panel-actions">
        <button type="button" className="secondary" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden /> Natrag na moje prijave
        </button>
      </div>

      <DetailTitle
        icon={<WeatherIcon type={report.phenomenon} size={25} />}
        source="Prijava opažanja"
        title={phenomenonLabels[report.phenomenon]}
        subtitle={report.place_name ?? coordinates(report.location)}
      />

      <dl className="detail-facts">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`report-status ${report.state}`}>{stateLabels[report.state]}</span>
          </dd>
        </div>
        <div>
          <dt>Intenzitet</dt>
          <dd>{intensityLabel(report.intensity)}</dd>
        </div>
        <div>
          <dt>Opažena šteta</dt>
          <dd>{damage ? damageNames[damage] : loading ? "Učitavanje…" : "Nije navedeno"}</dd>
        </div>
        <div>
          <dt>Prijavio/la</dt>
          <dd>{reporter || (user.updated || user.error ? "Nije dostupno" : "Učitavanje…")}</dd>
        </div>
      </dl>

      {!damage && detail.error && (
        <p className="inline-note error" role="alert">
          {detail.error}{" "}
          <button type="button" className="text-button" onClick={detail.refresh}>
            Pokušaj ponovno
          </button>
        </p>
      )}

      {report.state === "rejected" && reason && (
        <section className="detail-section">
          <h3>Obrazloženje odbijanja</h3>
          <p>{reason}</p>
        </section>
      )}
      <ReportPhotos photos={detail.data?.photos} />
    </div>
  );
}

export default ReportsPage;
