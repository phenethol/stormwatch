import { vi } from "vitest";
import type { ReportPhoto } from "../../src/types/report";

// Lažni backend za izolirane frontend testove. Oponaša rute, oblike odgovora i pravila
// stvarnog Django projekta (config/api.py, core/api.py, core/serializers.py, core/visibility.py
// i django-allauth headless), ali NE dokazuje da stvarni backend ili Google OAuth rade.

export type StoredReport = {
  id: number;
  author: string;
  phenomenon: string;
  intensity: string;
  damage: string;
  description: string;
  state: "submitted" | "pending" | "confirmed" | "rejected";
  lat: number;
  lon: number;
  observed_at: string;
  submitted_at: string;
  rejection_reason: string;
  photos?: ReportPhoto[];
};

export type FakeUser = { username: string; email: string };

export type Call = {
  method: string;
  path: string;
  headers: Headers;
  body: unknown;
};

type Options = {
  reports?: StoredReport[];
  user?: FakeUser | null;
  /** Google je vratio korisnika koji još mora odabrati korisničko ime (flow provider_signup). */
  pendingSignup?: FakeUser | null;
  takenUsernames?: string[];
  /** Simulira backend koji ne provodi PR-07 (vraća sve prijave svima). */
  leakAllReports?: boolean;
};

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

let sequence = 0;
export function storedReport(
  overrides: Partial<StoredReport> = {},
): StoredReport {
  sequence += 1;
  return {
    id: sequence,
    author: "marko",
    phenomenon: "hail",
    intensity: "pea",
    damage: "none",
    description: "",
    state: "confirmed",
    lat: 45.815,
    lon: 15.982,
    observed_at: minutesAgo(30),
    submitted_at: minutesAgo(25),
    rejection_reason: "",
    ...overrides,
  };
}

export const ana: FakeUser = { username: "ana", email: "ana@example.com" };

/** Šest prijava u različitim gradovima: sva četiri stanja, dva autora. */
export function sampleReports(): StoredReport[] {
  return [
    storedReport({
      id: 1,
      author: "marko",
      phenomenon: "hail",
      intensity: "walnut",
      state: "confirmed",
      lat: 45.815,
      lon: 15.982,
      damage: "minor",
      description: "Tuča veličine oraha.",
      observed_at: minutesAgo(20),
      submitted_at: minutesAgo(15),
    }),
    storedReport({
      id: 2,
      author: "marko",
      phenomenon: "storm_wind",
      intensity: "strong",
      state: "pending",
      lat: 43.508,
      lon: 16.44,
      observed_at: minutesAgo(40),
      submitted_at: minutesAgo(35),
    }),
    storedReport({
      id: 3,
      author: "ana",
      phenomenon: "snow",
      intensity: "moderate",
      state: "confirmed",
      lat: 45.555,
      lon: 18.695,
      damage: "none",
      observed_at: minutesAgo(180),
      submitted_at: minutesAgo(170),
    }),
    storedReport({
      id: 4,
      author: "ana",
      phenomenon: "glaze_ice",
      intensity: "weak",
      state: "rejected",
      lat: 45.327,
      lon: 14.442,
      rejection_reason: "Fotografija ne prikazuje poledicu.",
      observed_at: minutesAgo(300),
      submitted_at: minutesAgo(290),
    }),
    storedReport({
      id: 5,
      author: "ana",
      phenomenon: "waterspout",
      intensity: "weak",
      state: "submitted",
      lat: 44.867,
      lon: 13.85,
      observed_at: minutesAgo(10),
      submitted_at: minutesAgo(5),
    }),
    storedReport({
      id: 6,
      author: "marko",
      phenomenon: "heavy_rain",
      intensity: "moderate",
      state: "confirmed",
      lat: 42.65,
      lon: 18.094,
      damage: "significant",
      description: "Kiša pada bez prestanka.",
      observed_at: minutesAgo(600),
      submitted_at: minutesAgo(590),
    }),
  ];
}

const json = (body: unknown, status = 200) => Response.json(body, { status });
const guestFlows = [
  { id: "provider_redirect", providers: ["google"] },
  { id: "provider_token", providers: ["google"] },
];

export function createBackend(options: Options = {}) {
  const db = {
    reports: options.reports ?? [],
    user: options.user ?? null,
    pendingSignup: options.pendingSignup ?? null,
    takenUsernames: options.takenUsernames ?? [],
    leakAllReports: options.leakAllReports ?? false,
  };
  const calls: Call[] = [];
  const failures: {
    method: string;
    path: RegExp;
    response: () => Response | Promise<Response>;
  }[] = [];

  // core/serializers.py: report_summary i report_detail
  const summary = (report: StoredReport) => ({
    id: report.id,
    phenomenon: report.phenomenon,
    intensity: report.intensity,
    location: { lat: report.lat, lon: report.lon },
    observed_at: report.observed_at,
    state: report.state,
    author: {
      username: report.author,
      photo_url: null,
      is_trusted_observer: false,
      is_meteorologist: false,
      is_deleted: false,
    },
    confirmations: 0,
    disputes: 0,
    credibility: 50,
    is_trusted_observer_report: false,
    is_valuable: false,
    event_id: null,
    thumbnail_url: null,
    comment_count: 0,
    updated_at: report.submitted_at,
  });
  const detail = (report: StoredReport) => ({
    ...summary(report),
    damage: report.damage,
    description: report.description || null,
    photos: report.photos ?? [],
    submitted_at: report.submitted_at,
    region: null,
    nearest_measurement: null,
    rejection_reason:
      db.user?.username === report.author
        ? report.rejection_reason || null
        : null,
    my_vote: null,
    can_vote: false,
    event_title: null,
  });
  // core/visibility.py: visible_reports (PR-07)
  const visible = () =>
    db.reports
      .filter(
        (report) =>
          db.leakAllReports ||
          report.state === "confirmed" ||
          (db.user &&
            (report.state === "pending" || report.author === db.user.username)),
      )
      .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));

  const session = () =>
    db.user
      ? json({
          status: 200,
          data: {
            user: {
              id: 1,
              display: db.user.username,
              has_usable_password: false,
              email: db.user.email,
              username: db.user.username,
            },
            methods: [
              { method: "socialaccount", at: 1, provider: "google", uid: "1" },
            ],
          },
          meta: { is_authenticated: true },
        })
      : json(
          {
            status: 401,
            data: {
              flows: db.pendingSignup
                ? [
                    ...guestFlows,
                    {
                      id: "provider_signup",
                      provider: { id: "google", name: "Google" },
                      is_pending: true,
                    },
                  ]
                : guestFlows,
            },
            meta: { is_authenticated: false },
          },
          401,
        );

  function createReport(body: unknown) {
    if (!db.user) return json({ detail: "Unauthorized" }, 401);
    const form = body instanceof FormData ? body : new FormData();
    const field = (name: string) => String(form.get(name) ?? "");
    const errors: { type: string; loc: string[]; msg: string }[] = [];
    const phenomenon = field("phenomenon"),
      intensity = field("intensity");
    if (
      ![
        "hail",
        "storm_wind",
        "heavy_rain",
        "flood",
        "snow",
        "glaze_ice",
        "waterspout",
      ].includes(phenomenon)
    )
      errors.push({
        type: "enum",
        loc: ["form", "phenomenon"],
        msg: "Nepoznata vrsta pojave.",
      });
    const allowed =
      phenomenon === "hail"
        ? ["pea", "hazelnut", "walnut", "egg"]
        : ["weak", "moderate", "strong"];
    if (!allowed.includes(intensity))
      errors.push({
        type: "value_error",
        loc: ["form"],
        msg: "Intenzitet ne odgovara vrsti pojave.",
      });
    if (!["none", "minor", "significant", "major"].includes(field("damage")))
      errors.push({
        type: "enum",
        loc: ["form", "damage"],
        msg: "Nepoznata procjena štete.",
      });
    const lat = Number(field("lat")),
      lon = Number(field("lon"));
    if (
      !form.has("lat") ||
      !form.has("lon") ||
      !(Math.abs(lat) <= 90) ||
      !(Math.abs(lon) <= 180)
    )
      errors.push({
        type: "value_error",
        loc: ["form", "lat"],
        msg: "Neispravne koordinate.",
      });
    const observed = Date.parse(field("observed_at"));
    if (!(observed >= Date.now() - 86_400_000))
      errors.push({
        type: "value_error",
        loc: ["form"],
        msg: "Vrijeme opažanja ne smije biti ranije od 24 h prije predaje.",
      });
    if (observed > Date.now() + 300_000)
      errors.push({
        type: "value_error",
        loc: ["form"],
        msg: "Vrijeme opažanja ne smije biti više od 5 min nakon predaje.",
      });
    if (field("description").length > 2000)
      errors.push({
        type: "string_too_long",
        loc: ["form", "description"],
        msg: "Opis je predug.",
      });
    const photos = form
      .getAll("photos")
      .filter((value): value is File => value instanceof File);
    if (photos.length < 1 || photos.length > 5)
      errors.push({
        type: "value_error",
        loc: ["file", "photos"],
        msg: "Prijava mora imati od 1 do 5 fotografija.",
      });
    if (photos.some((photo) => photo.size > 10 * 1024 * 1024))
      errors.push({
        type: "value_error",
        loc: ["file", "photos"],
        msg: "Fotografija je veća od 10 MB.",
      });
    if (errors.length) return json({ detail: errors }, 422);
    const report = storedReport({
      id: Math.max(0, ...db.reports.map((item) => item.id)) + 1,
      author: db.user.username,
      phenomenon,
      intensity,
      damage: field("damage"),
      description: field("description"),
      state: "pending",
      lat,
      lon,
      observed_at: new Date(observed).toISOString(),
      submitted_at: new Date().toISOString(),
    });
    db.reports.push(report);
    return json(detail(report), 201);
  }

  function route(
    method: string,
    url: URL,
    headers: Headers,
    body: unknown,
  ): Response {
    const path = url.pathname;
    if (method === "GET" && path === "/api/v1/auth/csrf") {
      document.cookie = "csrftoken=test-csrf-token; path=/";
      return new Response(null, { status: 204 });
    }
    // Django CsrfViewMiddleware: svaka promjena mora nositi token iz kolačića.
    if (
      method !== "GET" &&
      (!document.cookie.includes("csrftoken=test-csrf-token") ||
        headers.get("X-CSRFToken") !== "test-csrf-token")
    ) {
      return json({ detail: "CSRF verification failed." }, 403);
    }
    if (path === "/_allauth/browser/v1/auth/session") {
      if (method === "DELETE") {
        db.user = null;
        db.pendingSignup = null;
      }
      return session();
    }
    if (
      method === "POST" &&
      path === "/_allauth/browser/v1/auth/provider/signup"
    ) {
      const { username, privacy_notice_accepted: accepted } = body as {
        username?: string;
        privacy_notice_accepted?: boolean;
      };
      if (!db.pendingSignup)
        return json(
          {
            status: 409,
            errors: [
              { message: "Registracija nije u tijeku.", code: "conflict" },
            ],
          },
          409,
        );
      const errors: { message: string; code: string; param: string }[] = [];
      if (!username || !/^[A-Za-z0-9_.-]{3,30}$/.test(username))
        errors.push({
          message:
            "Korisničko ime ima 3–30 znakova: slova bez dijakritika, brojke, _, točka i crtica.",
          code: "invalid",
          param: "username",
        });
      else if (db.takenUsernames.includes(username))
        errors.push({
          message: "Korisničko ime je već zauzeto.",
          code: "username_taken",
          param: "username",
        });
      if (accepted !== true)
        errors.push({
          message: "Ovo polje je obavezno.",
          code: "required",
          param: "privacy_notice_accepted",
        });
      if (errors.length) return json({ status: 400, errors }, 400);
      db.user = { username: username!, email: db.pendingSignup.email };
      db.pendingSignup = null;
      return session();
    }
    if (path === "/api/v1/reports" && method === "POST")
      return createReport(body);
    if (path === "/api/v1/reports" && method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? 200),
        offset = Number(url.searchParams.get("offset") ?? 0);
      const all = visible();
      return json({
        items: all.slice(offset, offset + limit).map(summary),
        count: all.length,
        server_time: new Date().toISOString(),
        removed_ids: [],
      });
    }
    const single = /^\/api\/v1\/reports\/(\d+)$/.exec(path);
    if (single && method === "GET") {
      const report = visible().find((item) => item.id === Number(single[1]));
      return report ? json(detail(report)) : json({ detail: "Not Found" }, 404);
    }
    if (path === "/api/v1/me/reports" && method === "GET") {
      if (!db.user) return json({ detail: "Unauthorized" }, 401);
      const limit = Number(url.searchParams.get("limit") ?? 20),
        offset = Number(url.searchParams.get("offset") ?? 0);
      const state = url.searchParams.get("state");
      const own = db.reports
        .filter(
          (report) =>
            report.author === db.user!.username &&
            (!state || report.state === state),
        )
        .sort(
          (a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at),
        );
      return json({
        items: own.slice(offset, offset + limit).map(detail),
        count: own.length,
        server_time: new Date().toISOString(),
      });
    }
    return json({ detail: "Not Found" }, 404);
  }

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const url = new URL(String(input), window.location.origin);
      // Vanjski servisi (podloga karte, pretraga mjesta) u testovima nisu dostupni.
      if (url.origin !== window.location.origin)
        return new Response(null, { status: 503 });
      const method = (init.method ?? "GET").toUpperCase();
      const headers = new Headers(init.headers);
      const body =
        typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      calls.push({ method, path: url.pathname + url.search, headers, body });
      const failure = failures.find(
        (item) => item.method === method && item.path.test(url.pathname),
      );
      if (failure) return failure.response();
      return route(method, url, headers, body);
    },
  );
  vi.stubGlobal("fetch", fetchMock);

  return {
    db,
    calls,
    /** Zabilježeni pozivi za metodu i (početak) putanje. */
    callsTo: (method: string, path: string) =>
      calls.filter(
        (call) => call.method === method && call.path.startsWith(path),
      ),
    /** Od sada ruta vraća zadani odgovor (npr. HTTP 500) dok se ne pozove funkcija koju fail() vrati. */
    fail(
      method: string,
      path: RegExp,
      response: () => Response | Promise<Response>,
    ) {
      const entry = { method, path, response };
      failures.push(entry);
      return () => {
        failures.splice(failures.indexOf(entry), 1);
      };
    },
  };
}

export type Backend = ReturnType<typeof createBackend>;
