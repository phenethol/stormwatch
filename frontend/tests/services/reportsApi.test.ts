import { describe, expect, it } from 'vitest'
import { getMyReports, normalizeReport, sendReport } from '../../src/services/reportsApi'
import { ana, createBackend, storedReport } from '../helpers/backend'

const signal = () => new AbortController().signal
const wire = { id: 8, phenomenon: 'hail', intensity: 'pea', state: 'pending', observed_at: '2026-11-14T16:30:00Z' } as const

function validPayload() {
  const payload = new FormData()
  for (const [key, value] of Object.entries({
    phenomenon: 'hail', intensity: 'pea', damage: 'none', observed_at: new Date().toISOString(),
    lat: '45.815', lon: '15.982', location_source: 'map', description: '',
  })) payload.set(key, value)
  return payload
}

describe('normalizeReport: podatkovna struktura prijave', () => {
  it('čita ugniježđene i ravne koordinate iz odgovora API-ja', () => {
    expect(normalizeReport({ ...wire, location: { lat: 44, lon: 16 } }).location).toEqual({ lat: 44, lon: 16 })
    expect(normalizeReport({ ...wire, lat: '45.815000', lon: '15.982000' }).location).toEqual({ lat: 45.815, lon: 15.982 })
    expect(normalizeReport({ ...wire, lat: 45.5, lon: 16.5 }).location).toEqual({ lat: 45.5, lon: 16.5 })
  })

  it('odbija nepotpune ili nemoguće podatke umjesto da ih nacrta na karti', () => {
    expect(() => normalizeReport({ ...wire })).toThrow(/nepotpune podatke/)
    expect(() => normalizeReport({ ...wire, lat: 95, lon: 16 })).toThrow(/nepotpune podatke/)
    expect(() => normalizeReport({ ...wire, lat: 45, lon: 181 })).toThrow(/nepotpune podatke/)
    expect(() => normalizeReport({ ...wire, lat: 45, lon: 16, state: undefined as never })).toThrow(/nepotpune podatke/)
    expect(() => normalizeReport({ ...wire, lat: 45, lon: 16, id: '8' as never })).toThrow(/nepotpune podatke/)
  })
})

describe('getMyReports: GET /api/v1/me/reports s paginacijom', () => {
  it('dohvaća stranicu po stranicu dok ne skupi count prijava', async () => {
    const reports = Array.from({ length: 101 }, (_, index) => storedReport({ id: index + 1, author: 'ana' }))
    const backend = createBackend({ user: ana, reports })
    const result = await getMyReports(signal())
    expect(result).toHaveLength(101)
    expect(new Set(result.map(report => report.id)).size).toBe(101)
    expect(backend.callsTo('GET', '/api/v1/me/reports').map(call => call.path)).toEqual([
      '/api/v1/me/reports?limit=100&offset=0', '/api/v1/me/reports?limit=100&offset=100',
    ])
  })
})

describe('sendReport: POST /api/v1/reports', () => {
  it('odgovor bez id-a i stanja ne smatra se potvrdom predaje', async () => {
    const backend = createBackend({ user: ana })
    backend.fail('POST', /\/reports$/, () => Response.json({}, { status: 201 }))
    await expect(sendReport(validPayload())).rejects.toThrow('Poslužitelj nije vratio potvrdu o predaji.')
  })
})

