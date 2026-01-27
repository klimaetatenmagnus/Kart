/**
 * KlimaOslo Kartplattform - Delte hjelpefunksjoner
 * Brukes av widget, admin og backend
 */

/**
 * Hent alle kategorier for et sted.
 * Støtter både ny kategoriIder[] og gammel kategoriId for bakoverkompatibilitet.
 *
 * @param sted - Sted med kategoriIder og/eller kategoriId
 * @returns Array med kategori-IDer (tom array hvis ingen kategorier)
 */
export function getStedKategorier(sted: { kategoriIder?: string[]; kategoriId?: string }): string[] {
  // Prioriter kategoriIder hvis den finnes og ikke er tom
  if (sted.kategoriIder && sted.kategoriIder.length > 0) {
    return sted.kategoriIder
  }

  // Fallback til kategoriId for bakoverkompatibilitet
  if (sted.kategoriId) {
    return [sted.kategoriId]
  }

  return []
}

/**
 * Hent første kategori-ID for et sted.
 * Brukes for å bestemme fargeprikk (første valgte kategori).
 *
 * @param sted - Sted med kategoriIder og/eller kategoriId
 * @returns Første kategori-ID eller undefined hvis ingen kategorier
 */
export function getForsteKategoriId(sted: { kategoriIder?: string[]; kategoriId?: string }): string | undefined {
  const kategorier = getStedKategorier(sted)
  return kategorier[0]
}
