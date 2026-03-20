/**
 * Piwik Pro analytics for kartwidgeten.
 * Sporer søk og klikk som custom events.
 */

declare global {
  interface Window {
    _paq?: unknown[][]
  }
}

const PIWIK_PRO_URL = 'https://klimatilskudd.piwik.pro/'

/** Initialiser Piwik Pro tracking */
export function initAnalytics(): void {
  const siteId = import.meta.env.VITE_PIWIK_PRO_SITE_ID
  if (!siteId) return

  window._paq = window._paq || []
  window._paq.push(['trackPageView'])
  window._paq.push(['enableLinkTracking'])
  window._paq.push(['setTrackerUrl', PIWIK_PRO_URL + 'ppms.php'])
  window._paq.push(['setSiteId', siteId])

  const script = document.createElement('script')
  script.async = true
  script.src = PIWIK_PRO_URL + 'ppms.js'
  document.head.appendChild(script)
}

function push(args: unknown[]): void {
  window._paq = window._paq || []
  window._paq.push(args)
}

/** Spor søk i kartets søkefelt */
export function trackSearch(term: string, type: 'sted' | 'område', kartSlug: string): void {
  push(['trackEvent', 'Kart', 'Søk', `${type}: ${term}`, kartSlug])
}

/** Spor klikk på en oppføring (sidebar eller markør) */
export function trackClick(stedNavn: string, source: 'sidebar' | 'markør', kartSlug: string): void {
  push(['trackEvent', 'Kart', 'Klikk', `${source}: ${stedNavn}`, kartSlug])
}
