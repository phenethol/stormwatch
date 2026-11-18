
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ReportForm } from '../../src/components/ReportForm'
import { emptyDraft, type Draft } from '../../src/utils/reports'
import { ana, createBackend } from '../helpers/backend'

const localInput = (time: number) => {
  const date = new Date(time)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function setup() {
  const onSaved = vi.fn()

  function Harness() {
    const [draft, setDraft] = useState<Draft>(emptyDraft)

    return (
      <ReportForm
        draft={draft}
        onDraft={setDraft}
        account
        onClose={() => {}}
        onPick={() => {}}
        onLogin={() => {}}
        onSaved={onSaved}
      />
    )
  }

  render(<Harness />)

  return { user: userEvent.setup(), onSaved }
}

async function chooseHail(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Vrsta pojave'), 'Tuča')
  await user.selectOptions(screen.getByLabelText('Intenzitet'), 'Orah')
}

async function fill(user: ReturnType<typeof userEvent.setup>, { lat = '45.815', lon = '15.982' } = {}) {
  await chooseHail(user)
  await user.type(screen.getByLabelText('Širina'), lat)
  await user.type(screen.getByLabelText('Dužina'), lon)
}

async function addPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(
    screen.getByLabelText('Odaberi fotografije'),
    new File(['test'], 'nevrijeme.jpg', { type: 'image/jpeg' }),
  )
}

const toReview = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /Pregled prijave/ }))

const reviewShown = () =>
  screen.queryByRole('heading', { name: 'Pregled opažanja' }) !== null

describe('obrazac nove prijave (UC-006, PR-01)', () => {
  it('bez obaveznih polja ne prelazi na pregled i ništa ne šalje', async () => {
    const backend = createBackend({ user: ana })
    const { user } = setup()

    await toReview(user)
    expect(reviewShown()).toBe(false)

    await chooseHail(user)
    await toReview(user)

    expect(reviewShown()).toBe(false)
    expect(backend.calls).toEqual([])
  })

  it.each([
    ['širina izvan raspona', { lat: '91', lon: '15.9' }],
    ['dužina izvan raspona', { lat: '45.8', lon: '181' }],
  ])('odbija nevaljanu lokaciju: %s', async (_name, location) => {
    const { user } = setup()

    await fill(user, location)
    await toReview(user)

    expect(reviewShown()).toBe(false)
  })

  it.each([
    ['starije od 24 sata', -25 * 60],
    ['više od 5 minuta u budućnosti', 10],
  ])('odbija vrijeme opažanja %s', async (_name, minutes) => {
    const { user } = setup()

    await fill(user)

    fireEvent.change(screen.getByLabelText('Vrijeme opažanja'), {
      target: { value: localInput(Date.now() + minutes * 60_000) },
    })

    await toReview(user)

    expect(screen.getByRole('alert')).toHaveTextContent(/unutar posljednja 24 sata/)
    expect(reviewShown()).toBe(false)
  })

  it('ne dopušta pregled bez fotografije i odbija više od pet fotografija', async () => {
    const { user } = setup()

    await fill(user)
    await toReview(user)

    expect(reviewShown()).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('Morate dodati od 1 do 5 fotografija.')

    const files = Array.from(
      { length: 6 },
      (_, i) => new File(['test'], `slika-${i}.jpg`, { type: 'image/jpeg' }),
    )

    await user.upload(screen.getByLabelText('Odaberi fotografije'), files)
    await toReview(user)

    expect(reviewShown()).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('Morate dodati od 1 do 5 fotografija.')
  })

  it('ne dopušta fotografiju veću od 10 MB', async () => {
    const { user } = setup()

    await fill(user)

    const photo = new File(['test'], 'velika.jpg', { type: 'image/jpeg' })
    Object.defineProperty(photo, 'size', { value: 10 * 1024 * 1024 + 1 })

    await user.upload(screen.getByLabelText('Odaberi fotografije'), photo)
    await toReview(user)

    expect(reviewShown()).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('najviše 10 MB')
  })

  it('pogrešku poslužitelja prikazuje, ne javlja uspjeh i čuva unos za ispravak', async () => {
    const backend = createBackend({ user: ana })

    backend.fail(
      'POST',
      /\/reports$/,
      () => Response.json(
        { detail: [{ msg: 'Neispravne koordinate.' }] },
        { status: 422 },
      ),
    )

    const { user, onSaved } = setup()

    await fill(user)
    await addPhoto(user)
    await user.type(screen.getByLabelText(/Opis opažanja/), 'Krupna tuča')
    await toReview(user)
    await user.click(screen.getByRole('button', { name: /Pošalji prijavu/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Neispravne koordinate.')
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Pošalji prijavu/ })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Uredi unos' }))

    expect(screen.getByLabelText('Vrsta pojave')).toHaveValue('hail')
    expect(screen.getByLabelText(/Opis opažanja/)).toHaveValue('Krupna tuča')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('lokacija opažanja', () => {
  it('prijava tuče šalje GPS koordinate i intenzitet kao veličinu zrna', async () => {
    const backend = createBackend({ user: ana })

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: 43.5081, longitude: 16.4402 },
          } as GeolocationPosition),
      },
    })

    const { user, onSaved } = setup()

    await user.click(screen.getByRole('button', { name: /Upotrijebi GPS/ }))

    expect(screen.getByLabelText('Širina')).toHaveValue(43.5081)
    expect(screen.getByLabelText('Dužina')).toHaveValue(16.4402)

    await chooseHail(user)
    await addPhoto(user)
    await toReview(user)
    await user.click(screen.getByRole('button', { name: /Pošalji prijavu/ }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())

    const body = backend.callsTo('POST', '/api/v1/reports')[0].body as FormData

    expect([
      body.get('lat'),
      body.get('lon'),
      body.get('location_source'),
    ]).toEqual(['43.5081', '16.4402', 'gps'])

    expect(body.get('intensity')).toBe('walnut')
  })

  it('za tuču prihvaća i veličinu zrna jaje', async () => {
    const backend = createBackend({ user: ana })
    const { user, onSaved } = setup()

    await fill(user)
    await user.selectOptions(screen.getByLabelText('Intenzitet'), 'Jaje')
    await addPhoto(user)
    await toReview(user)
    await user.click(screen.getByRole('button', { name: /Pošalji prijavu/ }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())

    expect(
      (backend.callsTo('POST', '/api/v1/reports')[0].body as FormData).get('intensity'),
    ).toBe('egg')
  })

  it('zadržava fotografije pri odlasku na odabir lokacije na karti', async () => {
    function Harness() {
      const [draft, setDraft] = useState<Draft>(emptyDraft)
      const [open, setOpen] = useState(true)

      return (
        <>
          <button onClick={() => setOpen(true)}>Vrati se u obrazac</button>

          {open && (
            <ReportForm
              draft={draft}
              onDraft={setDraft}
              account
              onClose={() => {}}
              onPick={() => setOpen(false)}
              onLogin={() => {}}
              onSaved={() => {}}
            />
          )}
        </>
      )
    }

    render(<Harness />)

    const user = userEvent.setup()

    await addPhoto(user)
    await user.click(screen.getByRole('button', { name: /Odaberi na karti/ }))
    await user.click(screen.getByRole('button', { name: 'Vrati se u obrazac' }))

    expect(screen.getByText('Odabrano fotografija: 1')).toBeInTheDocument()
  })

  it('ručno ispravljene koordinate više se ne šalju kao GPS', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: 43.5, longitude: 16.4 },
          } as GeolocationPosition),
      },
    })

    const backend = createBackend({ user: ana })
    const { user, onSaved } = setup()

    await user.click(screen.getByRole('button', { name: /Upotrijebi GPS/ }))
    await user.clear(screen.getByLabelText('Širina'))
    await user.type(screen.getByLabelText('Širina'), '44')

    await chooseHail(user)
    await addPhoto(user)
    await toReview(user)
    await user.click(screen.getByRole('button', { name: /Pošalji prijavu/ }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())

    expect(
      (backend.callsTo('POST', '/api/v1/reports')[0].body as FormData).get('location_source'),
    ).toBe('map')
  })
})
