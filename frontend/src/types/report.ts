import type { Point } from "./map";

export type ReportState =
  | "submitted"
  | "pending"
  | "confirmed"
  | "rejected";

// PR-01 (M1): kodovi za nove prijave, filtre i legendu.
export const apiPhenomena = [
  "hail",
  "storm_wind",
  "heavy_rain",
  "flood",
  "snow",
  "glaze_ice",
  "waterspout"
] as const;

export type Phenomenon = (typeof apiPhenomena)[number];

export const stateLabels: Record<ReportState, string> = {
  submitted: "Predana",
  pending: "Na čekanju",
  confirmed: "Potvrđena",
  rejected: "Odbijena"
};

export const phenomenonLabels: Record<Phenomenon, string> = {
  hail: "Tuča",
  storm_wind: "Olujni vjetar",
  heavy_rain: "Kiša",
  flood: "Poplava",
  snow: "Snijeg",
  glaze_ice: "Poledica",
  waterspout: "Pijavica"
};

export const intensityNames = {
  pea: "Grašak",
  hazelnut: "Lješnjak",
  walnut: "Orah",
  egg: "Jaje",
  weak: "Slab",
  moderate: "Umjeren",
  strong: "Jak"
} as const;

export const damageNames = {
  none: "Bez štete",
  minor: "Manja",
  significant: "Znatna",
  major: "Velika"
} as const;

export type Intensity = keyof typeof intensityNames;
export type Damage = keyof typeof damageNames;

export type Report = {
  id: number;
  phenomenon: Phenomenon;
  intensity: Intensity;
  state: ReportState;
  location: Point;
  place_name?: string;
  observed_at: string;
  updated_at?: string;
  // Samo ako ga backend vrati; nikad obavezno
  author?: string | { username?: string | null } | null;
};

export type ReportPhoto = {
  id: number;
  url: string;
  thumbnail_url: string;
  width: number | null;
  height: number | null;
};

export type ReportDetail = Report & {
  photos?: ReportPhoto[];
  description?: string | null;
  damage?: Damage;
  submitted_at?: string;
  rejection_reason?: string | null;
};

export type Strength = "weak" | "moderate" | "strong";
export const strengths: Strength[] = ["weak", "moderate", "strong"];

export type Filter = {
  phenomenon: Phenomenon | "";
  status: ReportState | "";
  intensity: Strength | "";
  hours: number;
};

export const noFilter: Filter = {
  phenomenon: "",
  status: "",
  intensity: "",
  hours: 0
};
