
import type { Report, ReportState, Phenomenon } from "../types/report";

type ReportCardProps = {
  report: Report;
};

const stateLabels: Record<ReportState, string> = {
  submitted: "Predana",
  pending: "Na čekanju",
  confirmed: "Potvrđena",
  rejected: "Odbijena"
};

const stateColors: Record<ReportState, string> = {
  submitted: "gray",
  pending: "orange",
  confirmed: "green",
  rejected: "red"
};


const phenomenonLabels: Record<Phenomenon, string> = {
  hail: "Tuča",
  storm_wind: "Olujni vjetar",
  heavy_rain_flood: "Jaka kiša i poplava",
  snow: "Snijeg",
  glaze_ice: "Poledica",
  waterspout: "Pijavica"
};


function ReportCard({ report }: ReportCardProps) {
  return (
    <div>
      <h2>{phenomenonLabels[report.phenomenon]}</h2>

      <p>
        Datum predaje:{" "}
        {new Date(report.submitted_at).toLocaleString("hr-HR", {
          timeZone: "Europe/Zagreb"
        })}
      </p>

      <p>
        Stanje:{" "}
        <strong style={{ color: stateColors[report.state] }}>
          {stateLabels[report.state]}
        </strong>
      </p>

      {report.state === "rejected" && report.rejection_reason && (
        <p>Razlog odbijanja: {report.rejection_reason}</p>
      )}

      <hr />
    </div>
  );
}

export default ReportCard;
