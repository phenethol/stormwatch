import { CircleCheck } from "lucide-react";
import { phenomenonLabels, stateLabels, type ReportDetail } from "../types/report";
import { coordinates, formatClock, formatDate } from "../utils/format";
import { intensityLabel } from "../utils/reports";
import { WeatherIcon } from "./icons";

type ReportCardProps = {
  report: ReportDetail;
  active?: boolean;
  onClick: () => void;
};

function ReportCard({ report, active, onClick }: ReportCardProps) {
  return (
    <>
      <button className="report-card" type="button" aria-pressed={active} onClick={onClick}>
        <span className="report-symbol">
          <WeatherIcon type={report.phenomenon} />
        </span>
        <span className="report-copy">
          <strong>{phenomenonLabels[report.phenomenon]}</strong>
          <span>{report.place_name ?? coordinates(report.location)}</span>
          <span className="report-foot">
            <span className={`report-status ${report.state}`}>
              {report.state === "confirmed" && <CircleCheck size={12} aria-hidden />}
              {stateLabels[report.state]}
            </span>
            <span>{intensityLabel(report.intensity)}</span>
          </span>
        </span>
        <time dateTime={report.observed_at} title={formatDate(report.observed_at)}>
          {formatClock(report.observed_at)}
        </time>
      </button>

      {report.state === "rejected" && report.rejection_reason && (
        <p className="rejection">
          <strong>Obrazloženje odbijanja:</strong> {report.rejection_reason}
        </p>
      )}
    </>
  );
}

export default ReportCard;
