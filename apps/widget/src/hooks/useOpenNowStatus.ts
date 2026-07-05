import { useState, useCallback, useRef } from 'react'
import type { StedDTO } from '@klimaoslo-kart/shared'

const API_URL = import.meta.env.VITE_API_URL || ''

// Cache varighet i millisekunder (5 minutter).
// Backend beregner status i sanntid fra lagrede åpningstider, så en ny
// henting er billig - cachen finnes bare for å unngå unødige kall ved
// rask av/på-toggling av filteret.
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
   * Hent åpen nå-status for alle steder i kartinstansen.
   * Kalles når brukeren aktiverer "Åpen nå"-filteret.
   * Bruker cache hvis data er fersk nok, ellers hentes ny data.
   */
  fetchOpenNowStatus: (slug: string, steder: StedDTO[]) => Promise<void>

  /**
   * Skjul status (beholder cachen, så re-aktivering innen 5 min er gratis)
   */
  clearStatus: () => void
}

/**
 * Hook for å hente og cache "åpen nå"-status for steder.
 *
 * Statusen beregnes av backend ut fra åpningstider lagret i Firestore,
 * i sanntid ved hver forespørsel - ingen Google API-kall er involvert.
 */
export function useOpenNowStatus(): UseOpenNowStatusReturn {
  const [openNowStatus, setOpenNowStatus] = useState<Map<string, boolean | null>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef<OpenNowCache | null>(null)

  const fetchOpenNowStatus = useCallback(async (slug: string, steder: StedDTO[]) => {
    // Sjekk om cache er fersk nok
    if (cacheRef.current) {
      const age = Date.now() - cacheRef.current.fetchedAt
      if (age < CACHE_DURATION_MS) {
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
      // Én forespørsel per kartinstans - backend henter stedene fra Firestore
      // og beregner status for alle i samme slengen
      const response = await fetch(
        `${API_URL}/api/public/places/open-now-batch?slug=${encodeURIComponent(slug)}`
      )
      const data = await response.json()
      const result: Record<string, boolean | null> = data.success ? data.data : {}

      const statusMap = new Map<string, boolean | null>()
      for (const [placeId, isOpen] of Object.entries(result)) {
        statusMap.set(placeId, isOpen)
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
    // Behold cacheRef: hvis brukeren slår filteret på igjen innen 5 minutter,
    // gjenbrukes forrige svar uten nytt nettverkskall
    setOpenNowStatus(new Map())
  }, [])

  return {
    openNowStatus,
    isLoading,
    fetchOpenNowStatus,
    clearStatus,
  }
}
