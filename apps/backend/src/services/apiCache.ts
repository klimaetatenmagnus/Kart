/**
 * Enkel in-memory TTL-cache for å redusere Google Places API-kall.
 * Brukes for Place Details og Åpen nå-status.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class ApiCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private ttlMs: number

  constructor(ttlSeconds: number) {
    this.ttlMs = ttlSeconds * 1000
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    })
  }

  /** Fjern utløpte oppføringer (kjør periodisk for å unngå minnelekkasje) */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  get size(): number {
    return this.cache.size
  }
}
