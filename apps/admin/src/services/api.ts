/**
 * API-klient for admin-appen
 * Håndterer base URL og autentisering
 */

const API_URL = import.meta.env.VITE_API_URL || ''
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

// MSAL-instansen settes fra main.tsx når appen starter i produksjonsmodus
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let msalInstance: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setMsalInstance(instance: any) {
  msalInstance = instance
}

async function getToken(): Promise<string | null> {
  if (skipAuth || !msalInstance) return null

  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) return null

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: ['User.Read'],
      account: accounts[0],
    })
    return response.idToken
  } catch (error) {
    console.error('Kunne ikke hente token:', error)
    return null
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_URL}${endpoint}`
  const token = await getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
