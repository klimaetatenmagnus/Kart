/**
 * API-klient for admin-appen
 * Håndterer base URL og autentisering
 */

const API_URL = import.meta.env.VITE_API_URL || ''

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_URL}${endpoint}`

  // Legg til Content-Type header hvis ikke satt
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
