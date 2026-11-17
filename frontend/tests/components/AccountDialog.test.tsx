import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountDialog } from '../../src/components/AccountDialog'
import type { Session } from '../../src/services/authApi'
import { ana, createBackend } from '../helpers/backend'

function setup(session: Session) {
  const onChange = vi.fn()
  render(<AccountDialog session={session} onClose={() => {}} onChange={onChange} />)
  return { user: userEvent.setup(), onChange }
}

describe('Google prijava i račun', () => {
  it('Google gumb šalje allauth obrazac s CSRF tokenom i povratnom adresom', async () => {
    createBackend()
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
      this.remove()
    })
    const { user } = setup('guest')
    await user.click(screen.getByRole('button', { name: /Prijavi se Google računom/ }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    const form = submit.mock.contexts[0] as HTMLFormElement
    expect(form.method).toBe('post')
    expect(new URL(form.action).pathname).toBe('/_allauth/browser/v1/auth/provider/redirect')
    expect(Object.fromEntries(new FormData(form))).toEqual({
      csrfmiddlewaretoken: 'test-csrf-token',
      provider: 'google',
      process: 'login',
      callback_url: `${window.location.origin}/?racun=povratak`,
    })
  })

  it('zauzeto korisničko ime prikazuje poruku backenda i ostavlja obrazac otvorenim', async () => {
    createBackend({ pendingSignup: { username: '', email: 'novi@example.com' }, takenUsernames: ['ana'] })
    const { user, onChange } = setup('signup')
    await user.type(screen.getByLabelText('Korisničko ime'), 'ana')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Dovrši registraciju' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Korisničko ime je već zauzeto.')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Korisničko ime')).toHaveValue('ana')
    expect(screen.getByRole('button', { name: 'Dovrši registraciju' })).toBeEnabled()
  })

  it('neuspjela odjava prikazuje pogrešku i korisnik ostaje prijavljen', async () => {
    const backend = createBackend({ user: ana })
    backend.fail('DELETE', /auth\/session$/, () => Response.json({ detail: 'Server Error' }, { status: 500 }))
    const { user, onChange } = setup('account')
    await user.click(screen.getByRole('button', { name: /Odjava/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server Error')
    expect(onChange).not.toHaveBeenCalled()
    expect(backend.db.user).toEqual(ana)
  })
})
