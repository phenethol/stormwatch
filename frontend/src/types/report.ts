
export type ReportState =
  | "submitted"
  | "pending"
  | "confirmed"
  | "rejected";

export type Phenomenon =
  | "hail"
  | "storm_wind"
  | "heavy_rain"
  | "flood"
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

export type ReportPhoto = {
  id: number;
  url: string;
  thumbnail_url: string;
  width: number | null;
  height: number | null;
};
