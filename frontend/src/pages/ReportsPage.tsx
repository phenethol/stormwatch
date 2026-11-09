
import { mockReports } from "../services/mockReports";
import ReportCard from "../components/ReportCard";

function ReportsPage() {
  const sortedReports = [...mockReports].sort((a, b) =>
    new Date(b.submitted_at).getTime() -
    new Date(a.submitted_at).getTime()
  );

  return (
    <div>
      <h1>Moje prijave</h1>

      {sortedReports.length === 0 ? (
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
