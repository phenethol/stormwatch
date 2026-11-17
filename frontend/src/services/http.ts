export const apiUrl: string = import.meta.env.VITE_API_BASE_URL || ''

export class RequestError extends Error {
  readonly status: number
  readonly needsSignup: boolean

  constructor(message: string, status: number, needsSignup = false) {
    super(message)
    this.status = status
    this.needsSignup = needsSignup
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  let response: Response

  try {
    response = await fetch(apiUrl + path, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch (error) {
    if (options.signal?.aborted) {
      throw error
    }

    throw new RequestError('Veza s poslužiteljem trenutačno nije dostupna.', 0)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)

  if (response.ok) {
    if (data === null) {
      throw new RequestError(
        'Poslužitelj aplikacije (API) nije dostupan na ovoj adresi. Provjerite je li backend pokrenut i povezan s frontendom.',
        response.status,
      )
    }

    return data as T
  }

  const errors = data?.detail ?? data?.message ?? data?.errors
  let message = ''

  if (typeof errors === 'string') {
    message = errors
  } else if (Array.isArray(errors)) {
    const messages: string[] = []

    for (const error of errors) {
      const text = error.msg ?? error.message

      if (text) {
        messages.push(text)
      }
    }

    message = messages.join(' ')
  }

  let needsSignup = false
  const flows = data?.data?.flows

  if (Array.isArray(flows)) {
    for (const flow of flows) {
      if (flow.id === 'provider_signup' && flow.is_pending) {
        needsSignup = true
        break
      }
    }
  }

  throw new RequestError(
    message || `Poslužitelj nije dovršio zahtjev (${response.status}).`,
    response.status,
    needsSignup,
  )
}

export async function csrf() {
  await request<void>('/api/v1/auth/csrf')

  const cookies = document.cookie.split('; ')
  const cookie = cookies.find(item => item.startsWith('csrftoken='))
  const token = cookie?.slice('csrftoken='.length)

  if (!token) {
    throw new Error('Sigurnosni kolačić nije dostupan. Osvježite stranicu i pokušajte ponovno.')
  }

  return token
}

export async function write<T>(path: string, method: string, body?: FormData | object) {
  const token = await csrf()
  const headers = new Headers({ 'X-CSRFToken': token })

  let requestBody: FormData | string | undefined

  if (body instanceof FormData) {
    requestBody = body
  } else if (body) {
    headers.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  return request<T>(path, {
    method,
    headers,
    body: requestBody,
  })
}