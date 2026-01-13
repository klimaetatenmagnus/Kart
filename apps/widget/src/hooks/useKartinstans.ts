import { useState, useEffect } from 'react'
import type { KartinstansDTO } from '@klimaoslo-kart/shared'

const API_URL = import.meta.env.VITE_API_URL || ''

export function useKartinstans(slug: string) {
  const [kartinstans, setKartinstans] = useState<KartinstansDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchKartinstans() {
      try {
        const response = await fetch(`${API_URL}/api/public/kartinstanser/${slug}`)
        if (!response.ok) {
          throw new Error('Kunne ikke hente kartinstans')
        }
        const data = await response.json()
        setKartinstans(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukjent feil')
      } finally {
        setLoading(false)
      }
    }

    fetchKartinstans()
  }, [slug])

  return { kartinstans, loading, error }
}
