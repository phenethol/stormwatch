
import { useEffect, useState } from "react";
import type { Report } from "../types/report";
import { getMyReports } from "../services/reportsApi";
import ReportCard from "../components/ReportCard";

function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const data = await getMyReports();

        if (active) {
          setReports(data);
        }
      } catch {
        if (active) {
          setError("Nije moguće dohvatiti prijave.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const sortedReports = [...reports].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() -
      new Date(a.submitted_at).getTime()
  );

  return (
    <div>
      <h1>Moje prijave</h1>

      {loading ? (
        <p>Učitavanje prijava...</p>
      ) : error ? (
        <p>{error}</p>
      ) : sortedReports.length === 0 ? (
        <p>Još nemaš nijednu prijavu.</p>
      ) : (
        sortedReports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))
      )}
    </div>
  );
}

export default ReportsPage;
