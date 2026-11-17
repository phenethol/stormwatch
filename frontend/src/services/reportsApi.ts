import { useCallback, useEffect, useState } from "react";
import type { Report, ReportDetail } from "../types/report";
import { publicReport } from "../utils/reports";
import { request, write } from "./http";

// Backend vraća {location: {lat, lon}}; prihvaćaju se i ravne koordinate lat/lon (broj ili decimalni string).
type WireReport = Partial<Omit<ReportDetail, "location">> & {
  id: number;
  phenomenon: Report["phenomenon"];
  intensity: Report["intensity"];
  state: Report["state"];
  observed_at: string;
  location?: { lat: number | string; lon: number | string };
  lat?: number | string;
  lon?: number | string;
};

export function normalizeReport(raw: WireReport): ReportDetail {
  const location = raw.location
    ? { lat: Number(raw.location.lat), lon: Number(raw.location.lon) }
    : { lat: Number(raw.lat), lon: Number(raw.lon) };

  if (
    !Number.isInteger(raw.id) ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lon) ||
    Math.abs(location.lat) > 90 ||
    Math.abs(location.lon) > 180 ||
    !raw.phenomenon ||
    !raw.intensity ||
    !raw.state ||
    !raw.observed_at
  ) {
    throw new Error(
      "Backend je vratio nepotpune podatke prijave (ID, pojava, intenzitet, stanje, vrijeme ili lokacija)."
    );
  }

  return { ...raw, location };
}

type ReportsResponse = {
  items: WireReport[];
  count: number;
  server_time?: string;
};

// Dohvaća sve stranice paginiranog popisa prijava ({items, count}).
async function getAllReports(
  path: string,
  limit: number,
  invalidMessage: string,
  signal?: AbortSignal,
  maxReports = Infinity
): Promise<ReportDetail[]> {
  let offset = 0;
  let count: number;

  const allReports: ReportDetail[] = [];

  do {
    const data = await request<ReportsResponse>(
      `${path}?limit=${limit}&offset=${offset}`,
      { signal }
    );

    if (!Array.isArray(data.items) || !Number.isFinite(data.count) || data.count < 0) {
      throw new Error(invalidMessage);
    }

    allReports.push(...data.items.map(normalizeReport));

    count = data.count;
    offset += limit;

    if (data.items.length === 0) {
      break;
    }
  } while (offset < count && allReports.length < maxReports);

  return allReports;
}

// Sve vlastite prijave (uključujući predane i odbijene), za stranicu „Moje prijave”.
export async function getMyReports(signal?: AbortSignal): Promise<ReportDetail[]> {
  return getAllReports(
    "/api/v1/me/reports",
    100,
    "Backend je vratio neispravan popis vlastitih prijava.",
    signal
  );
}

export async function loadReport(id: number, signal: AbortSignal): Promise<ReportDetail> {
  return normalizeReport(await request<WireReport>(`/api/v1/reports/${id}`, { signal }));
}

export async function sendReport(payload: FormData) {
  const created = await write<WireReport>("/api/v1/reports", "POST", payload);
  if (!Number.isInteger(created?.id) || !created?.state) {
    throw new Error("Poslužitelj nije vratio potvrdu o predaji.");
  }
  return created;
}

// M1 ne treba inkrementalni dohvat (updated_since); dovoljan je običan paginirani GET.
function getMapReports(signal: AbortSignal): Promise<Report[]> {
  return getAllReports(
    "/api/v1/reports",
    200,
    "Backend je vratio neispravan popis prijava.",
    signal,
    5000
  );
}

// Prijave za kartu: dohvat pri učitavanju, svakih ~15 s, nakon povratka na karticu i nakon promjene sesije.
export function useReports(account: boolean, sessionRevision: number) {
  const [data, setData] = useState({
    account,
    items: [] as Report[],
    updated: Date.now(),
    error: "",
    received: false
  });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let timer: number | undefined;
    let controller: AbortController | undefined;

    async function run() {
      controller?.abort();
      window.clearTimeout(timer);
      const next = new AbortController();
      controller = next;

      try {
        const reports = await getMapReports(next.signal);
        if (next.signal.aborted) return;
        // Samo obrana na strani sučelja: backend MORA sam provoditi PR-07 na svakoj ruti.
        const visible = reports.filter((item) => publicReport(item, account));
        setData({ account, updated: Date.now(), error: "", received: true, items: visible });
      } catch (cause) {
        if (!next.signal.aborted) {
          setData((previous) => ({
            ...previous,
            account,
            items: previous.account === account ? previous.items : [],
            error: cause instanceof Error ? cause.message : "Dohvat nije uspio."
          }));
        }
      } finally {
        if (!next.signal.aborted && !document.hidden) {
          timer = window.setTimeout(run, 15_000);
        }
      }
    }

    const wake = () => {
      if (!document.hidden) void run();
    };

    void run();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);

    return () => {
      controller?.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [account, version, sessionRevision]);

  return { ...data, items: data.account === account ? data.items : [], refresh };
}
