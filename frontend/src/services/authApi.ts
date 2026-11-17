import { apiUrl, csrf, request, RequestError, write } from './http'

export type Session = 'guest' | 'account' | 'signup'
const sessionPath = '/_allauth/browser/v1/auth/session'
export async function loadSession(signal: AbortSignal): Promise<Session> {
  try {
    await request(sessionPath, { signal })
    return 'account'
  } catch (cause) {
    if (cause instanceof RequestError && cause.status === 401) return cause.needsSignup ? 'signup' : 'guest'
    throw cause
  }
}

// Account details come from allauth's authenticated session response; no new backend endpoint needed.
export type AccountInfo = { username: string; email: string }
export async function loadAccountInfo(signal: AbortSignal): Promise<AccountInfo> {
  const response = await request<{ data?: { user?: { username?: string; email?: string; display?: string } } }>(sessionPath, { signal })
  const user = response?.data?.user
  return { username: user?.username || user?.display || '', email: user?.email || '' }
}

export async function googleLogin() {
  const form = document.createElement('form')
  form.method = 'post'
  form.action = `${apiUrl}/_allauth/browser/v1/auth/provider/redirect`
  for (const [name, value] of Object.entries({
    csrfmiddlewaretoken: await csrf(), provider: 'google', process: 'login',
    callback_url: new URL('/?racun=povratak', window.location.origin).href,
  })) {
    const input = document.createElement('input')
    Object.assign(input, { type: 'hidden', name, value })
    form.append(input)
  }
  document.body.append(form)
  form.submit()
}

export function signup(username: string) {
  return write('/_allauth/browser/v1/auth/provider/signup', 'POST', { username, privacy_notice_accepted: true })
}

export async function signOut() {
  try { await write(sessionPath, 'DELETE') }
  catch (cause) { if (!(cause instanceof RequestError) || cause.status !== 401) throw cause }
}
