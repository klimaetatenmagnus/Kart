import { useState, useEffect } from 'react'
import type { StedDTO } from '@klimaoslo-kart/shared'

const API_URL = import.meta.env.VITE_API_URL || ''

export function useSteder(kartinstansId: string) {
  const [steder, setSteder] = useState<StedDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSteder() {
      try {
        const response = await fetch(`${API_URL}/api/public/kartinstanser/${kartinstansId}/steder`)
        if (!response.ok) {
          throw new Error('Kunne ikke hente steder')
        }
        const data = await response.json()
        setSteder(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukjent feil')
      } finally {
        setLoading(false)
      }
    }

    fetchSteder()
  }, [kartinstansId])

  return { steder, loading, error }
}
