
import type { Report } from "../types/report";

type ReportsResponse = {
  items: Report[];
  count: number;
  server_time: string;
};

export async function getMyReports(): Promise<Report[]> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "";

  const limit = 100;
  let offset = 0;
  let count: number;

  const allReports: Report[] = [];

  do {
    const response = await fetch(
      `${apiUrl}/api/v1/me/reports?limit=${limit}&offset=${offset}`,
      { credentials: "include" }
    );

    if (!response.ok) {
      throw new Error("Nije moguće dohvatiti prijave.");
    }

    const data: ReportsResponse = await response.json();

    allReports.push(...data.items);

    count = data.count;
    offset += limit;

    if (data.items.length === 0) {
      break;
    }
  } while (offset < count);

  return allReports;
}
