import { useState, useCallback, useRef } from 'react'
import type { StedDTO } from '@klimaoslo-kart/shared'

const API_URL = import.meta.env.VITE_API_URL || ''

// Cache varighet i millisekunder (5 minutter)
// Status oppdateres automatisk når brukeren slår filteret av og på igjen
const CACHE_DURATION_MS = 5 * 60 * 1000

interface OpenNowCache {
  status: Map<string, boolean | null>
  fetchedAt: number
}

interface UseOpenNowStatusReturn {
  /**
   * Map fra placeId til åpen-status (true = åpen, false = lukket, null = ukjent)
   */
  openNowStatus: Map<string, boolean | null>

  /**
   * Om vi holder på å hente status
   */
  isLoading: boolean

  /**
   * Hent åpen nå-status for gitte steder.
   * Kalles når brukeren aktiverer "Åpen nå"-filteret.
   * Bruker cache hvis data er fersk nok, ellers hentes ny data.
   */
  fetchOpenNowStatus: (steder: StedDTO[], forceRefresh?: boolean) => Promise<void>

  /**
   * Tøm cache og status
   */
  clearStatus: () => void
}

/**
 * Hook for å hente og cache "åpen nå"-status for steder.
 *
 * Denne hooken sikrer at vi alltid henter status på det faktiske tidspunktet
 * brukeren aktiverer filteret, slik at filtreringen er pålitelig.
 */
export function useOpenNowStatus(): UseOpenNowStatusReturn {
  const [openNowStatus, setOpenNowStatus] = useState<Map<string, boolean | null>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef<OpenNowCache | null>(null)

  const fetchOpenNowStatus = useCallback(async (steder: StedDTO[], forceRefresh = false) => {
    // Sjekk om cache er fersk nok
    if (!forceRefresh && cacheRef.current) {
      const age = Date.now() - cacheRef.current.fetchedAt
      if (age < CACHE_DURATION_MS) {
        // Bruk cached data
        setOpenNowStatus(cacheRef.current.status)
        return
      }
    }

    if (steder.length === 0) {
      setOpenNowStatus(new Map())
      return
    }

    setIsLoading(true)

    try {
      // Hent alle place IDs
      const placeIds = steder.map((s) => s.placeId)

      // Del opp i batches på 50 (API-begrensning)
      const batches: string[][] = []
      for (let i = 0; i < placeIds.length; i += 50) {
        batches.push(placeIds.slice(i, i + 50))
      }

      // Hent status for alle batches parallelt
      const results = await Promise.all(
        batches.map(async (batch) => {
          const response = await fetch(
            `${API_URL}/api/public/places/open-now-batch?placeIds=${batch.join(',')}`
          )
          const data = await response.json()
          return data.success ? data.data : {}
        })
      )

      // Kombiner resultater til ett map
      const statusMap = new Map<string, boolean | null>()
      for (const result of results) {
        for (const [placeId, isOpen] of Object.entries(result)) {
          statusMap.set(placeId, isOpen as boolean | null)
        }
      }

      // Oppdater state og cache
      setOpenNowStatus(statusMap)
      cacheRef.current = {
        status: statusMap,
        fetchedAt: Date.now(),
      }
    } catch (err) {
      console.error('Kunne ikke hente åpen nå-status:', err)
      // Ved feil, sett alle til ukjent (null) så de fortsatt vises
      const unknownStatus = new Map<string, boolean | null>()
      for (const sted of steder) {
        unknownStatus.set(sted.placeId, null)
      }
      setOpenNowStatus(unknownStatus)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearStatus = useCallback(() => {
    setOpenNowStatus(new Map())
    cacheRef.current = null
  }, [])

  return {
    openNowStatus,
    isLoading,
    fetchOpenNowStatus,
    clearStatus,
  }
}
