import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ReportsPage from '../../src/pages/ReportsPage'
import { ana, createBackend, sampleReports, storedReport } from '../helpers/backend'

const cards = () => screen.queryAllByRole('button').filter(button => button.classList.contains('report-card'))
const cardTitles = () => cards().map(card => card.querySelector('strong')?.textContent)

describe('„Moje prijave”', () => {
  it('prikazuje sve vlastite prijave sa stanjem, najnovije predane prve, i ničije tuđe', async () => {
    createBackend({ user: ana, reports: sampleReports() })
    render(<ReportsPage />)
    await screen.findByText('Pijavica')
    expect(cardTitles()).toEqual(['Pijavica', 'Snijeg', 'Poledica'])
    expect(cards().map(card => card.querySelector('.report-status')?.textContent)).toEqual(['Predana', 'Potvrđena', 'Odbijena'])
    const reason = screen.getByText('Obrazloženje odbijanja:')
    expect(reason.parentElement).toHaveTextContent('Fotografija ne prikazuje poledicu.')
    expect(within(reason.closest('li')!).getByRole('button')).toHaveTextContent('Poledica')
  })

  it('filtrira po stanju i javlja kad u odabranom stanju nema prijava', async () => {
    createBackend({ user: ana, reports: sampleReports() })
    render(<ReportsPage />)
    await screen.findByText('Pijavica')
    const filter = screen.getByLabelText('Stanje')
    await userEvent.selectOptions(filter, 'Odbijena')
    expect(cardTitles()).toEqual(['Poledica'])
    await userEvent.selectOptions(filter, 'Na čekanju')
    expect(cards()).toHaveLength(0)
    expect(screen.getByText('Nemate prijava u odabranom stanju.')).toBeInTheDocument()
    await userEvent.selectOptions(filter, 'Sva stanja')
    expect(cards()).toHaveLength(3)
  })

  it('istekla sesija (401) prikazuje se kao pogreška, ne kao „nemate prijava”', async () => {
    createBackend({ user: null, reports: sampleReports() })
    render(<ReportsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unauthorized')
    expect(screen.queryByText('Još nemate prijava.')).toBeNull()
  })

  it('dijeli dulji popis na stranice po 20', async () => {
    const reports = Array.from({ length: 25 }, (_, index) => storedReport({ id: index + 1, author: 'ana', submitted_at: new Date(Date.now() - index * 60_000).toISOString() }))
    createBackend({ user: ana, reports })
    render(<ReportsPage />)
    await screen.findByText('1–20 / 25')
    expect(cards()).toHaveLength(20)
    expect(screen.getByRole('button', { name: 'Prethodne' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Sljedeće' }))
    expect(screen.getByText('21–25 / 25')).toBeInTheDocument()
    expect(cards()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Sljedeće' })).toBeDisabled()
  })

  it('otvara detalj prijave: stanje, intenzitet, šteta, autor i obrazloženje; zatim povratak na popis', async () => {
    const backend = createBackend({ user: ana, reports: sampleReports() })
    render(<ReportsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Poledica/ }))

    expect(screen.getByRole('heading', { name: 'Poledica' })).toBeInTheDocument()
    const facts = Object.fromEntries(Array.from(document.querySelectorAll('.detail-facts > div')).map(row => [row.querySelector('dt')!.textContent, row.querySelector('dd')!.textContent]))
    expect(facts).toMatchObject({ Status: 'Odbijena', Intenzitet: 'Slab', 'Opažena šteta': 'Bez štete', 'Prijavio/la': 'ana' })
    expect(screen.getByRole('heading', { name: 'Obrazloženje odbijanja' }).parentElement).toHaveTextContent('Fotografija ne prikazuje poledicu.')
    expect(backend.callsTo('GET', '/api/v1/reports/4')).not.toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: /Natrag na moje prijave/ }))
    expect(cards()).toHaveLength(3)
  })

  it('fotografije se prikazuju i u detalju vlastite prijave', async () => {
    const reports = sampleReports()
    reports.find(report => report.id === 3)!.photos = [{
      id: 103, url: '/media/observations/snijeg.jpg', thumbnail_url: '/media/observations/snijeg-thumb.jpg',
      width: 800, height: 600,
    }]
    createBackend({ user: ana, reports })
    render(<ReportsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Snijeg/ }))
    const image = await screen.findByRole('img', { name: 'Fotografija opažanja 1' })
    expect(image).toHaveAttribute('src', '/media/observations/snijeg-thumb.jpg')
    expect(screen.getByRole('link', { name: 'Otvori fotografiju 1 u novoj kartici' }))
      .toHaveAttribute('href', '/media/observations/snijeg.jpg')
  })

  it('odluka administratora (Django Admin) pojavljuje se nakon periodičnog osvježavanja', async () => {
    vi.useFakeTimers()
    const backend = createBackend({ user: ana, reports: sampleReports() })
    render(<ReportsPage />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(cards()[0].querySelector('.report-status')).toHaveTextContent('Predana')

    const submitted = backend.db.reports.find(report => report.id === 5)!
    submitted.state = 'rejected'
    submitted.rejection_reason = 'Opažanje nije potvrđeno.'
    await act(() => vi.advanceTimersByTimeAsync(15_000))
    expect(cards()[0].querySelector('.report-status')).toHaveTextContent('Odbijena')
    expect(screen.getByText('Opažanje nije potvrđeno.', { exact: false })).toBeInTheDocument()
  })
})
