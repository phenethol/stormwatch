
import type { Report } from "../types/report";

type ReportsResponse = {
  items: Report[];
  count: number;
  server_time: string;
};

export async function getMyReports(): Promise<ReportsResponse> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiUrl) {
    throw new Error("Nije postavljena adresa backenda.");
  }

  const response = await fetch(`${apiUrl}/api/v1/me/reports`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nije moguće dohvatiti prijave.");
  }

  return response.json();
}
