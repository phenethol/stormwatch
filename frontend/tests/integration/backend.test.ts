// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalizeReport } from '../../src/services/reportsApi'

// Provjera ugovora sa STVARNIM Django backendom. Ne izvodi se u običnom `npm test`
// (nema mockova, treba pokrenut poslužitelj), nego samo kad je zadana adresa:
//
//   STORMWATCH_BACKEND_URL=http://127.0.0.1:8000 npm test -- tests/integration
//
// Neobavezno:
//   STORMWATCH_SESSION_ID=<vrijednost kolačića sessionid prijavljenog korisnika>  → provjere za prijavljenog korisnika
//   STORMWATCH_ALLOW_WRITE=1                                                     → i stvarna predaja prijave (upisuje u bazu!)
//
// Google OAuth se ovdje ne može provjeriti; njega treba proći ručno u pregledniku.
declare const process: { env: Record<string, string | undefined> }
const base = process.env.STORMWATCH_BACKEND_URL?.replace(/\/+$/, '')
const sessionId = process.env.STORMWATCH_SESSION_ID
const allowWrite = process.env.STORMWATCH_ALLOW_WRITE === '1'

type Page = { items: Parameters<typeof normalizeReport>[0][]; count: number }
const get = (path: string, cookie = '') => fetch(base + path, { headers: { Accept: 'application/json', Cookie: cookie } })

async function csrfCookie(cookie = '') {
  const response = await get('/api/v1/auth/csrf', cookie)
  const token = /csrftoken=([^;]+)/.exec(response.headers.get('set-cookie') ?? '')?.[1]
  return { response, token }
}

function reportForm() {
  const form = new FormData()
  for (const [key, value] of Object.entries({
    phenomenon: 'snow', intensity: 'weak', damage: 'none', observed_at: new Date(Date.now() - 600_000).toISOString(),
    lat: '45.401', lon: '14.8', location_source: 'map', description: 'Integracijska provjera M1 frontenda.',
  })) form.set(key, value)
  form.append('photos', new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR4sAAAAASUVORK5CYII='), c => c.charCodeAt(0))], { type: 'image/png' }), 'test.png')
  return form
}

describe.skipIf(!base)('stvarni backend: posjetitelj', () => {
  it('GET /api/v1/auth/csrf vraća 204 i postavlja kolačić csrftoken', async () => {
    const { response, token } = await csrfCookie()
    expect(response.status).toBe(204)
    expect(token).toBeTruthy()
  })

  it('sesija posjetitelja je 401 s JSON popisom tokova (Google preusmjeravanje)', async () => {
    const response = await get('/_allauth/browser/v1/auth/session')
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.data.flows.map((flow: { id: string }) => flow.id)).toContain('provider_redirect')
  })

  it('GET /api/v1/reports je javan, paginiran i (PR-07) vraća samo potvrđene prijave koje frontend može pročitati', async () => {
    const response = await get('/api/v1/reports?limit=200&offset=0')
    expect(response.status).toBe(200)
    const page: Page = await response.json()
    expect(Array.isArray(page.items)).toBe(true)
    expect(Number.isFinite(page.count)).toBe(true)
    const reports = page.items.map(normalizeReport)
    expect(reports.every(report => report.state === 'confirmed')).toBe(true)
  })

  it('GET /api/v1/me/reports bez sesije vraća 401 u JSON obliku', async () => {
    const response = await get('/api/v1/me/reports?limit=100&offset=0')
    expect(response.status).toBe(401)
    expect(typeof (await response.json()).detail).toBe('string')
  })

  it('POST /api/v1/reports bez CSRF tokena je 403, a s tokenom i bez sesije 401', async () => {
    const bare = await fetch(`${base}/api/v1/reports`, { method: 'POST', body: reportForm() })
    expect(bare.status).toBe(403)
    const { token } = await csrfCookie()
    const anonymous = await fetch(`${base}/api/v1/reports`, { method: 'POST', body: reportForm(), headers: { Accept: 'application/json', Cookie: `csrftoken=${token}`, 'X-CSRFToken': token! } })
    expect(anonymous.status).toBe(401)
  })
})

describe.skipIf(!base || !sessionId)('stvarni backend: prijavljeni korisnik', () => {
  const cookie = `sessionid=${sessionId}`

  it('sesija vraća 200 s korisničkim imenom i e-mailom', async () => {
    const response = await get('/_allauth/browser/v1/auth/session', cookie)
    expect(response.status).toBe(200)
    const { data } = await response.json()
    expect(data.user.username).toBeTruthy()
    expect(typeof data.user.email).toBe('string')
  })

  it('GET /api/v1/reports ne vraća tuđe predane ni odbijene prijave', async () => {
    const session = await (await get('/_allauth/browser/v1/auth/session', cookie)).json()
    const page: Page = await (await get('/api/v1/reports?limit=200&offset=0', cookie)).json()
    for (const report of page.items.map(normalizeReport)) {
      const own = typeof report.author === 'object' && report.author?.username === session.data.user.username
      expect(own || report.state === 'confirmed' || report.state === 'pending').toBe(true)
    }
  })

  it('GET /api/v1/me/reports vraća vlastite prijave s detaljima; odbijene nose obrazloženje', async () => {
    const response = await get('/api/v1/me/reports?limit=100&offset=0', cookie)
    expect(response.status).toBe(200)
    const page: Page = await response.json()
    for (const report of page.items.map(normalizeReport)) {
      expect(['none', 'minor', 'significant', 'major']).toContain(report.damage)
      expect(report.submitted_at).toBeTruthy()
      if (report.state === 'rejected') expect(report).toHaveProperty('rejection_reason')
    }
    if (page.items.length) {
      const detail = await get(`/api/v1/reports/${page.items[0].id}`, cookie)
      expect(detail.status).toBe(200)
      expect(normalizeReport(await detail.json()).id).toBe(page.items[0].id)
    }
  })

  it.skipIf(!allowWrite)('POST /api/v1/reports prihvaća M1 prijavu s fotografijom (201, stanje pending ili confirmed)', async () => {
    const { token } = await csrfCookie(cookie)
    const response = await fetch(`${base}/api/v1/reports`, {
      method: 'POST', body: reportForm(),
      headers: { Accept: 'application/json', Cookie: `${cookie}; csrftoken=${token}`, 'X-CSRFToken': token! },
    })
    const body = await response.json()
    expect({ status: response.status, body }).toMatchObject({ status: 201, body: { phenomenon: 'snow' } })
    expect(['pending', 'confirmed']).toContain(body.state)
  })
})
