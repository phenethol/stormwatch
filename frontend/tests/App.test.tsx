import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { ana, createBackend, sampleReports, storedReport, type Backend } from './helpers/backend'

// Cijela aplikacija sa stvarnom Leaflet kartom u jsdomu, nad lažnim backendom
// (tests/helpers/backend.ts). Vektorska podloga traži WebGL, pa se u testu odmah odbija i karta
// prelazi na rastersku podlogu; sami markeri i paneli su pravi kod aplikacije.
vi.mock('../src/services/basemap', () => ({
  basemapProvider: () => 'openfreemap',
  openFreeMapLayer: () => Promise.reject(new Error('WebGL nije dostupan u testu')),
}))

const pins = () => Array.from(document.querySelectorAll<HTMLElement>('.leaflet-pane .observation-pin'))
const pinLabels = () => pins().map(pin => pin.getAttribute('aria-label')).sort()
const overview = () => within(document.getElementById('weather-overview')!)
const listCards = () => overview().queryAllByRole('button').filter(button => button.classList.contains('report-card'))
const listTitles = () => listCards().map(card => card.querySelector('strong')?.textContent)
const detailPanel = () => document.querySelector<HTMLElement>('aside.detail')
const mapRequests = (backend: Backend) => backend.callsTo('GET', '/api/v1/reports?')

async function start(options: Parameters<typeof createBackend>[0], expectedPins: number) {
  const backend = createBackend(options)
  const view = render(<App />)
  await waitFor(() => expect(pins()).toHaveLength(expectedPins))
  return { backend, user: userEvent.setup(), ...view }
}

describe('PR-07: vidljivost prijava na karti', () => {
  it('posjetitelj vidi samo potvrđene prijave čak i ako API vrati sva stanja', async () => {
    await start({ reports: sampleReports(), leakAllReports: true }, 3)
    expect(pinLabels()).toEqual(['Kiša · Potvrđena', 'Snijeg · Potvrđena', 'Tuča · Potvrđena'])
    expect(listTitles()).toEqual(['Tuča', 'Snijeg', 'Kiša'])
    expect(overview().queryByRole('option', { name: 'Na čekanju' })).toBeNull()
  })

  it('prijavljeni korisnik na karti i u popisu vidi potvrđene prijave i prijave na čekanju', async () => {
    await start({ user: ana, reports: sampleReports() }, 4)
    expect(pinLabels()).toEqual(['Kiša · Potvrđena', 'Olujni vjetar · Na čekanju', 'Snijeg · Potvrđena', 'Tuča · Potvrđena'])
    expect(listTitles()).toEqual(['Tuča', 'Olujni vjetar', 'Snijeg', 'Kiša'])
    expect(overview().getByRole('option', { name: 'Na čekanju' })).toBeInTheDocument()
  })

  it('status koji administrator promijeni u Django Adminu stiže periodičnim osvježavanjem (~15 s)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const backend = createBackend({ reports: sampleReports() })
    render(<App />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(listTitles()).toEqual(['Tuča', 'Snijeg', 'Kiša'])

    backend.db.reports.find(report => report.id === 2)!.state = 'confirmed'
    await act(() => vi.advanceTimersByTimeAsync(15_000))
    expect(listTitles()).toEqual(['Tuča', 'Olujni vjetar', 'Snijeg', 'Kiša'])
    expect(mapRequests(backend).length).toBeGreaterThanOrEqual(2)
  })
})

describe('sesija', () => {
  it('sesija se učitava s poslužitelja i preživljava ponovno učitavanje stranice', async () => {
    const first = await start({ user: ana, reports: sampleReports() }, 4)
    expect(first.backend.callsTo('GET', '/_allauth/browser/v1/auth/session')).not.toHaveLength(0)
    first.unmount()

    // novo učitavanje aplikacije nad istim poslužiteljem: bez ikakve radnje korisnik je i dalje prijavljen
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Moj račun' })).toBeInTheDocument())
    await waitFor(() => expect(pins()).toHaveLength(4))
  })

  it('istek sesije na poslužitelju vraća sučelje u stanje posjetitelja pri sljedećoj provjeri', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const backend = createBackend({ user: ana, reports: sampleReports() })
    render(<App />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByRole('button', { name: 'Moj račun' })).toBeInTheDocument()
    expect(listCards()).toHaveLength(4)

    backend.db.user = null
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(screen.getByRole('button', { name: 'Korisnički račun' })).toHaveTextContent('Prijava')
    expect(listTitles()).toEqual(['Tuča', 'Snijeg', 'Kiša'])
  })

  it('odjava iz „Mojih prijava” briše sesiju, vraća na kartu i skriva prijave na čekanju', async () => {
    const { backend, user } = await start({ user: ana, reports: sampleReports() }, 4)
    await user.click(screen.getByRole('button', { name: /Moje prijave/ }))
    await within(await screen.findByRole('main', { name: 'Moje prijave' })).findByText('Pijavica')
    await user.click(screen.getByRole('button', { name: 'Moj račun' }))
    await user.click(screen.getByRole('button', { name: /Odjava/ }))
    await waitFor(() => expect(window.location.hash).toBe(''))
    expect(screen.queryByRole('main', { name: 'Moje prijave' })).toBeNull()
    const [logout] = backend.callsTo('DELETE', '/_allauth/browser/v1/auth/session')
    expect(logout.headers.get('X-CSRFToken')).toBe('test-csrf-token')
    expect(backend.db.user).toBeNull()
    await waitFor(() => expect(listTitles()).toEqual(['Tuča', 'Snijeg', 'Kiša']))
  })
})

describe('Google prijava i prva registracija', () => {
  it('povratak s Googlea za novog korisnika otvara dovršetak registracije; nakon njega korisnik je prijavljen', async () => {
    window.history.replaceState(null, '', '/?racun=povratak')
    const { backend, user } = await start({ pendingSignup: { username: '', email: 'novi@example.com' }, reports: sampleReports() }, 3)
    const dialog = within(await screen.findByRole('dialog', { name: 'Dovrši registraciju' }))
    await user.type(dialog.getByLabelText('Korisničko ime'), 'nova.osoba')
    const submit = dialog.getByRole('button', { name: 'Dovrši registraciju' })
    expect(submit).toBeDisabled()
    await user.click(dialog.getByRole('checkbox'))
    await user.click(submit)

    expect(await screen.findByRole('dialog', { name: 'Moj račun' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'nova.osoba' })).toBeInTheDocument()
    const [signup] = backend.callsTo('POST', '/_allauth/browser/v1/auth/provider/signup')
    expect(signup.body).toEqual({ username: 'nova.osoba', privacy_notice_accepted: true })
    expect(signup.headers.get('X-CSRFToken')).toBe('test-csrf-token')
    await waitFor(() => expect(pins()).toHaveLength(4))
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(screen.getByRole('button', { name: 'Moj račun' })).toBeInTheDocument()
  })

  it('povratak postojećeg korisnika (?racun=povratak) prijavljuje ga i čisti adresu', async () => {
    window.history.replaceState(null, '', '/?racun=povratak')
    await start({ user: ana, reports: sampleReports() }, 4)
    const dialog = within(await screen.findByRole('dialog', { name: 'Moj račun' }))
    expect(await dialog.findByRole('heading', { name: 'ana' })).toBeInTheDocument()
    expect(dialog.getByText('ana@example.com')).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('neuspjela Google prijava (?racun=greska) otvara dijalog s pogreškom, a korisnik ostaje posjetitelj', async () => {
    window.history.replaceState(null, '', '/?racun=greska')
    await start({ reports: sampleReports() }, 3)
    const dialog = within(screen.getByRole('dialog', { name: 'Prijava' }))
    expect(dialog.getByRole('alert')).toHaveTextContent('Google prijava nije uspjela ili je otkazana. Pokušajte ponovno.')
    expect(dialog.getByRole('button', { name: /Prijavi se Google računom/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Korisnički račun' })).toBeInTheDocument()
    expect(pinLabels().every(label => label?.endsWith('Potvrđena'))).toBe(true)
  })
})

describe('navigacija', () => {
  it('posjetitelju „Moje prijave” i „Nova prijava” otvaraju prijavu, ne stranicu ni obrazac', async () => {
    const { backend, user } = await start({ reports: sampleReports() }, 3)
    await user.click(screen.getByRole('button', { name: /Moje prijave/ }))
    expect(screen.getByRole('dialog', { name: 'Prijava' })).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    await user.click(screen.getByRole('button', { name: 'Zatvori' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getAllByRole('button', { name: 'Nova prijava' })[0])
    expect(screen.getByRole('dialog', { name: 'Prijava' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Nova prijava' })).toBeNull()
    expect(backend.callsTo('GET', '/api/v1/me/reports')).toEqual([])
  })

  it('izravna adresa #/prijave bez sesije nudi prijavu i povratak na kartu, bez dohvata tuđih podataka', async () => {
    window.history.replaceState(null, '', '/#/prijave')
    const { backend, user } = await start({ reports: sampleReports() }, 3)
    const page = within(screen.getByRole('main', { name: 'Moje prijave' }))
    expect(page.getByText('Ovaj je pregled dostupan prijavljenim korisnicima.')).toBeInTheDocument()
    expect(await page.findByRole('button', { name: 'Prijava' })).toBeInTheDocument()
    expect(backend.callsTo('GET', '/api/v1/me/reports')).toEqual([])
    await user.click(page.getByRole('button', { name: 'Natrag na kartu' }))
    await waitFor(() => expect(screen.queryByRole('main', { name: 'Moje prijave' })).toBeNull())
  })
})

describe('karta, pojedinačni markeri i paneli', () => {
  it('klik na prijavu prikazuje fotografije iz detaljnog API odgovora', async () => {
    const reports = sampleReports()
    reports[0].photos = [{
      id: 101, url: '/media/observations/tuca.jpg', thumbnail_url: '/media/observations/tuca.jpg',
      width: 800, height: 600,
    }]
    const { user } = await start({ reports }, 3)
    await user.click(listCards()[0])
    const panel = within(detailPanel()!)
    const img = await panel.findByRole('img', { name: 'Fotografija opažanja 1' })
    expect(img).toHaveAttribute('src', '/media/observations/tuca.jpg')
    expect(panel.getByRole('link', { name: 'Otvori fotografiju 1 u novoj kartici' }))
      .toHaveAttribute('href', '/media/observations/tuca.jpg')
  })

  it('odabir prijave u popisu otvara panel s detaljima i označava marker; zatvaranje ga uklanja', async () => {
    const { backend, user } = await start({ reports: sampleReports() }, 3)
    expect(detailPanel()).toBeNull()
    await user.click(listCards()[0])

    const panel = within(detailPanel()!)
    expect(panel.getByRole('heading', { name: 'Tuča' })).toBeInTheDocument()
    expect(panel.getByText('Potvrđena')).toBeInTheDocument()
    expect(panel.getByText('Jak')).toBeInTheDocument()
    // šteta i opis stižu iz GET /api/v1/reports/{id}
    expect(await panel.findByText('Manja')).toBeInTheDocument()
    expect(panel.getByText('Tuča veličine oraha.')).toBeInTheDocument()
    expect(backend.callsTo('GET', '/api/v1/reports/1')).not.toHaveLength(0)
    expect(listCards()[0]).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(document.querySelectorAll('.leaflet-pane .observation-pin.pin-selected')).toHaveLength(1))
    expect(document.querySelector('.workspace')).toHaveClass('workspace-detail')

    await user.click(panel.getByRole('button', { name: 'Zatvori detalje' }))
    expect(detailPanel()).toBeNull()
    expect(document.querySelectorAll('.leaflet-pane .observation-pin.pin-selected')).toHaveLength(0)
    expect(document.querySelector('.workspace')).not.toHaveClass('workspace-detail')
  })

  it('klik na marker otvara detalje te prijave; Escape zatvara panel', async () => {
    const { user } = await start({ reports: sampleReports() }, 3)
    fireEvent.click(pins().find(pin => pin.getAttribute('aria-label')?.startsWith('Snijeg'))!)
    await waitFor(() => expect(detailPanel()).not.toBeNull())
    expect(within(detailPanel()!).getByRole('heading', { name: 'Snijeg' })).toBeInTheDocument()
    expect(within(detailPanel()!).getByText('Umjeren')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(detailPanel()).toBeNull()
  })

  it('detalj koji se ne može učitati prikazuje pogrešku, a osnovni podaci ostaju vidljivi', async () => {
    const { backend, user } = await start({ reports: sampleReports() }, 3)
    backend.fail('GET', /\/reports\/\d+$/, () => Response.json({ detail: 'Not Found' }, { status: 404 }))
    await user.click(listCards()[0])
    const panel = within(detailPanel()!)
    expect(await panel.findByRole('alert')).toHaveTextContent('Not Found')
    expect(panel.getByRole('heading', { name: 'Tuča' })).toBeInTheDocument()
    expect(panel.getByText('Potvrđena')).toBeInTheDocument()
  })

  it('više prijava na istoj lokaciji zadržava zasebne markere bez klastera', async () => {
    const zagreb = { lat: 45.815, lon: 15.982 }
    await start({ reports: [
      storedReport({ id: 1, phenomenon: 'hail', ...zagreb }), storedReport({ id: 2, phenomenon: 'hail', ...zagreb }),
      storedReport({ id: 3, phenomenon: 'hail', ...zagreb }), storedReport({ id: 4, phenomenon: 'snow', intensity: 'weak', lat: 43.508, lon: 16.44 }),
    ] }, 4)
    expect(pins()).toHaveLength(4)
    expect(document.querySelectorAll('.leaflet-pane .report-cluster')).toHaveLength(0)
    expect(listCards()).toHaveLength(4)
  })

  it('filtri sužavaju i popis i markere; poništavanje vraća sve', async () => {
    const { user } = await start({ user: ana, reports: sampleReports() }, 4)
    await user.selectOptions(overview().getByLabelText('Pojava'), 'Snijeg')
    expect(listTitles()).toEqual(['Snijeg'])
    expect(overview().getByText('1 od 4 dostupnih prijava')).toBeInTheDocument()
    await waitFor(() => expect(pinLabels()).toEqual(['Snijeg · Potvrđena']))

    await user.selectOptions(overview().getByLabelText('Pojava'), 'Sve pojave')
    await user.selectOptions(overview().getByLabelText('Status'), 'Na čekanju')
    expect(listTitles()).toEqual(['Olujni vjetar'])
    await waitFor(() => expect(pinLabels()).toEqual(['Olujni vjetar · Na čekanju']))

    await user.selectOptions(overview().getByLabelText('Intenzitet'), 'Slab')
    expect(listCards()).toHaveLength(0)
    expect(overview().getByText('Nema prijava za odabrane filtre.')).toBeInTheDocument()
    await waitFor(() => expect(pins()).toHaveLength(0))

    await user.click(overview().getByRole('button', { name: /Poništi filtre/ }))
    expect(listCards()).toHaveLength(4)
    await waitFor(() => expect(pins()).toHaveLength(4))
  })

  it('filtri razdvajaju Kišu i Poplavu, uz zasebne oznake na karti, u legendi i detaljima', async () => {
    const reports = sampleReports()
    const flood = storedReport({
      id: 7, phenomenon: 'flood', intensity: 'moderate', lat: 44.12, lon: 15.23,
      observed_at: reports[5].observed_at, description: 'Voda se izlila na prometnicu.',
    })
    const { user } = await start({ reports: [...reports, flood] }, 4)
    await user.selectOptions(overview().getByLabelText('Razdoblje'), 'Posljednji sat')
    expect(listTitles()).toEqual(['Tuča'])
    await user.selectOptions(overview().getByLabelText('Razdoblje'), 'Sva opažanja')

    await user.click(screen.getByRole('button', { name: 'Legenda' }))
    const legend = within(screen.getByRole('region', { name: 'Legenda karte' }))
    const iconPath = (element: Element) => element.querySelector('svg path')?.getAttribute('d')
    const rainIcon = iconPath(legend.getByText('Kiša'))
    const floodIcon = iconPath(legend.getByText('Poplava'))
    expect(rainIcon).toBeTruthy()
    expect(floodIcon).toBeTruthy()
    expect(rainIcon).not.toBe(floodIcon)
    await user.click(legend.getByRole('button', { name: 'Zatvori izbornik' }))

    for (const [label, icon, description] of [
      ['Kiša', rainIcon, 'Kiša pada bez prestanka.'],
      ['Poplava', floodIcon, 'Voda se izlila na prometnicu.'],
    ] as const) {
      await user.selectOptions(overview().getByLabelText('Pojava'), label)
      expect(listTitles()).toEqual([label])
      await waitFor(() => expect(pinLabels()).toEqual([`${label} · Potvrđena`]))
      expect(iconPath(pins()[0])).toBe(icon)

      await user.click(listCards()[0])
      const panel = within(detailPanel()!)
      expect(panel.getByRole('heading', { name: label })).toBeInTheDocument()
      expect(iconPath(detailPanel()!.querySelector('.detail-icon')!)).toBe(icon)
      expect(await panel.findByText(description)).toBeInTheDocument()
      await user.click(panel.getByRole('button', { name: 'Zatvori detalje' }))
    }
  })

  it('bočni pregled se otvara gumbom „Pregled” i skriva gumbom „Sakrij pregled”', async () => {
    const { user } = await start({ reports: sampleReports() }, 3)
    const panel = document.getElementById('weather-overview')!
    const trigger = screen.getByRole('button', { name: /Pregled$/ })
    expect(panel).toHaveClass('overview-collapsed')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(panel).not.toHaveClass('overview-collapsed')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.querySelector('.workspace')).not.toHaveClass('workspace-collapsed')

    await user.click(screen.getByRole('button', { name: 'Sakrij pregled' }))
    expect(panel).toHaveClass('overview-collapsed')
    expect(document.querySelector('.workspace')).toHaveClass('workspace-collapsed')
  })

  it('legenda se otvara, objašnjava oznake i može se zatvoriti', async () => {
    const { user } = await start({ reports: [] }, 0)
    expect(screen.queryByRole('region', { name: 'Legenda karte' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Legenda' }))
    const legend = within(screen.getByRole('region', { name: 'Legenda karte' }))
    expect(legend.getByText('Potvrđena prijava')).toBeInTheDocument()
    expect(legend.getByText('Prijava na čekanju')).toBeInTheDocument()
    await user.click(legend.getByRole('button', { name: 'Zatvori izbornik' }))
    expect(screen.queryByRole('region', { name: 'Legenda karte' })).toBeNull()
  })
})

describe('predaja prijave kroz aplikaciju', () => {
  async function openForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole('button', { name: 'Nova prijava' })[0])
    return within(screen.getByRole('dialog', { name: 'Nova prijava' }))
  }

  it.each([
    ['Kiša', 'heavy_rain'],
    ['Poplava', 'flood'],
  ])('%s se predaje s fotografijom i pojavljuje na karti kao „Na čekanju”', async (label, phenomenon) => {
    const { backend, user } = await start({ user: ana, reports: sampleReports() }, 4)
    const form = await openForm(user)
    const photo = new File(['slika'], 'nevrijeme.jpg', { type: 'image/jpeg' })
    await user.upload(form.getByLabelText('Odaberi fotografije'), photo)
    await user.selectOptions(form.getByLabelText('Vrsta pojave'), label)
    await user.selectOptions(form.getByLabelText('Intenzitet'), 'Jak')
    await user.type(form.getByLabelText('Širina'), '46.305')
    await user.type(form.getByLabelText('Dužina'), '16.336')
    await user.click(form.getByRole('button', { name: /Pregled prijave/ }))
    expect(form.getByRole('heading', { name: 'Pregled opažanja' })).toBeInTheDocument()
    expect(backend.callsTo('POST', '/api/v1/reports')).toHaveLength(0)
    await user.click(form.getByRole('button', { name: /Pošalji prijavu/ }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const [post] = backend.callsTo('POST', '/api/v1/reports')
    expect(post.headers.get('X-CSRFToken')).toBe('test-csrf-token')
    const payload = post.body as FormData
    expect(payload.getAll('photos')).toHaveLength(1)
    expect((payload.get('photos') as File).name).toBe('nevrijeme.jpg')
    expect(Object.fromEntries([...payload.entries()].filter(([key]) => key !== 'photos'))).toEqual({
      phenomenon, intensity: 'strong', damage: 'none',
      lat: '46.305', lon: '16.336', location_source: 'map', description: '',
      observed_at: expect.any(String),
    })
    await waitFor(() => expect(pins()).toHaveLength(5))
    expect(pinLabels()).toContain(`${label} · Na čekanju`)
    expect(listCards()).toHaveLength(5)
  })

  it('lokacija se može odabrati klikom na kartu, a odabir otkazati', async () => {
    const { user } = await start({ user: ana, reports: sampleReports() }, 4)
    let form = await openForm(user)
    await user.click(form.getByRole('button', { name: /Odaberi na karti/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Odaberite lokaciju')).toBeInTheDocument()
    // tijekom odabira markeri prijava se sklanjaju
    await waitFor(() => expect(pins()).toHaveLength(0))

    fireEvent.click(screen.getByLabelText('Interaktivna meteorološka karta Hrvatske'), { clientX: 640, clientY: 400 })
    form = within(await screen.findByRole('dialog', { name: 'Nova prijava' }))
    const lat = Number((form.getByLabelText('Širina') as HTMLInputElement).value)
    const lon = Number((form.getByLabelText('Dužina') as HTMLInputElement).value)
    // sredina prikaza cijele Hrvatske
    expect(lat).toBeGreaterThan(42)
    expect(lat).toBeLessThan(47)
    expect(lon).toBeGreaterThan(13)
    expect(lon).toBeLessThan(20)
    await waitFor(() => expect(pins()).toHaveLength(4))

    await user.click(form.getByRole('button', { name: /Odaberi na karti/ }))
    await user.click(screen.getByRole('button', { name: 'Natrag na obrazac' }))
    expect(within(screen.getByRole('dialog', { name: 'Nova prijava' })).getByLabelText('Širina')).toHaveValue(lat)
  })
})

describe('pogreške API-ja', () => {
  it('pogreška dohvata prijava prikazuje se u pregledu; ponovni pokušaj učitava podatke', async () => {
    const backend = createBackend({ reports: sampleReports() })
    const restore = backend.fail('GET', /\/api\/v1\/reports$/, () => Response.json({ detail: 'Baza nije dostupna.' }, { status: 503 }))
    render(<App />)
    expect(await overview().findByRole('alert')).toHaveTextContent('Baza nije dostupna.')
    expect(listCards()).toHaveLength(0)
    expect(overview().queryByText('Nema dostupnih prijava.')).toBeNull()

    restore()
    await userEvent.click(overview().getByRole('button', { name: 'Pokušaj ponovno' }))
    await waitFor(() => expect(listCards()).toHaveLength(3))
    expect(overview().queryByRole('alert')).toBeNull()
    await waitFor(() => expect(pins()).toHaveLength(3))
  })
})