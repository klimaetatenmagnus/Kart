/**
 * API-klient for admin-appen
 * Håndterer base URL og autentisering
 */

import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'
import { apiScope, usesCustomApiScope } from './authConfig'

const API_URL = import.meta.env.VITE_API_URL || ''
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

// MSAL-instansen settes fra main.tsx når appen starter i produksjonsmodus
let msalInstance: IPublicClientApplication | null = null

export function setMsalInstance(instance: IPublicClientApplication) {
  msalInstance = instance
}

function getActiveAccount(instance: IPublicClientApplication): AccountInfo | null {
  return instance.getActiveAccount() || instance.getAllAccounts()[0] || null
}

async function getToken(): Promise<string | null> {
  if (skipAuth || !msalInstance) return null

  const account = getActiveAccount(msalInstance)
  if (!account) return null

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: [apiScope],
      account,
    })

    // Kompatibilitetsmodus: uten eksponert API-scope i Entra bruker vi idToken.
    // Når API-scope er konfigurert (api://...), brukes accessToken.
    if (usesCustomApiScope) {
      return response.accessToken || null
    }

    return response.idToken || response.accessToken || null
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
