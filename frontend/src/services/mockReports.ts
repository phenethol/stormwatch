
import type { Report } from "../types/report";

export const mockReports: Report[] = [
  {
    id: 1,
    phenomenon: "hail",
    state: "confirmed",
    submitted_at: "2026-11-07T14:30:00Z",
    rejection_reason: null
  },
  {
    id: 2,
    phenomenon: "storm_wind",
    state: "pending",
    submitted_at: "2026-11-09T10:15:00Z",
    rejection_reason: null
  },
  {
    id: 3,
    phenomenon: "heavy_rain_flood",
    state: "rejected",
    submitted_at: "2026-11-06T16:45:00Z",
    rejection_reason: "Fotografija ne odgovara prijavljenoj pojavi."
  },
  {
    id: 4,
    phenomenon: "snow",
    state: "submitted",
    submitted_at: "2026-11-08T19:00:00Z",
    rejection_reason: null
  }
];
