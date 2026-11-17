import { describe, expect, it, vi } from 'vitest'
import { request, write } from '../../src/services/http'

function mockFetch(handler: (path: string, options: RequestInit) => Response) {
  const fetchMock = vi.fn(async (path: string, options: RequestInit) => handler(path, options))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('API zahtjevi', () => {
  it('šalje sesijske kolačiće i traži JSON', async () => {
    const fetchMock = mockFetch(() => Response.json({ ok: true }))

    await expect(request('/api/v1/reports')).resolves.toEqual({ ok: true })

    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/v1/reports')
    expect(options.credentials).toBe('include')
    expect(new Headers(options.headers).get('Accept')).toBe('application/json')
  })

  it('spaja poruke validacijskih grešaka (HTTP 422)', async () => {
    mockFetch(() => Response.json({
      detail: [
        { msg: 'Intenzitet ne odgovara vrsti pojave.' },
        { msg: 'Neispravne koordinate.' },
      ],
    }, { status: 422 }))

    await expect(request('/api/v1/reports')).rejects.toMatchObject({
      status: 422,
      message: 'Intenzitet ne odgovara vrsti pojave. Neispravne koordinate.',
    })
  })

  it('prijavljuje grešku ako API umjesto JSON-a vrati HTML', async () => {
    mockFetch(() => new Response('<!doctype html><div id="root"></div>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))

    await expect(request('/_allauth/browser/v1/auth/session'))
      .rejects.toThrow(/API\) nije dostupan/)
  })

  it('prikazuje razumljivu poruku kada nema veze s backendom', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(request('/api/v1/reports')).rejects.toMatchObject({
      status: 0,
      message: 'Veza s poslužiteljem trenutačno nije dostupna.',
    })
  })

  it('ne prikazuje grešku veze kada je zahtjev namjerno prekinut', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    await expect(request('/api/v1/reports', { signal: controller.signal }))
      .rejects.toBe(error)
  })
})

describe('CSRF zaštita', () => {
  it('ne šalje promjenu ako nema CSRF kolačića', async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 204 }))

    await expect(write('/api/v1/reports', 'POST', new FormData()))
      .rejects.toThrow(/Sigurnosni kolačić nije dostupan/)

    expect(fetchMock.mock.calls).toHaveLength(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/csrf')
  })

  it('šalje CSRF token i pravilno obrađuje JSON i FormData', async () => {
    const fetchMock = mockFetch((_path, options) => {
      if (!options.method) {
        document.cookie = 'csrftoken=abc123; path=/'
        return new Response(null, { status: 204 })
      }
      return Response.json({ ok: true })
    })

    await write('/_allauth/browser/v1/auth/provider/signup', 'POST', { username: 'ana' })

    const jsonRequest = fetchMock.mock.calls[1][1]
    expect(jsonRequest.method).toBe('POST')
    expect(jsonRequest.credentials).toBe('include')
    expect(new Headers(jsonRequest.headers).get('X-CSRFToken')).toBe('abc123')
    expect(new Headers(jsonRequest.headers).get('Content-Type')).toBe('application/json')
    expect(jsonRequest.body).toBe('{"username":"ana"}')

    const form = new FormData()
    form.set('phenomenon', 'hail')
    await write('/api/v1/reports', 'POST', form)

    const formRequest = fetchMock.mock.calls[3][1]
    expect(formRequest.body).toBe(form)
    expect(new Headers(formRequest.headers).has('Content-Type')).toBe(false)
    expect(new Headers(formRequest.headers).get('X-CSRFToken')).toBe('abc123')
  })
})
