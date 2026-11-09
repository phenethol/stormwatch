
export type ReportState =
  | "submitted"
  | "pending"
  | "confirmed"
  | "rejected";

export type Phenomenon =
  | "hail"
  | "storm_wind"
  | "heavy_rain_flood"
  | "snow"
  | "glaze_ice"
  | "waterspout";

export type Report = {
  id: number;
  phenomenon: Phenomenon;
  state: ReportState;
  submitted_at: string;
  rejection_reason: string | null;
};
