import { stederCollection } from './firestore.js'
import type { OpeningPeriod } from '@klimaoslo-kart/shared'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

// Hvor lenge lagrede stedsdetaljer regnes som ferske.
// Etter dette serveres fortsatt lagrede data, men en bakgrunnsoppdatering
// mot Google startes (stale-while-revalidate) - maks ett Google-kall
// per sted per TTL-vindu, uavhengig av trafikk.
const DETAILS_TTL_DAYS = Number(process.env.PLACE_DETAILS_TTL_DAYS) || 7

const OSLO_TIMEZONE = 'Europe/Oslo'

export interface GooglePlaceDetails {
  navn: string
  adresse: string
  lat: number
  lng: number
  rating: number | null
  telefon: string | null
  nettside: string | null
  apningstider: string[] | null
  openingPeriods: OpeningPeriod[] | null
  currentOpeningPeriods: OpeningPeriod[] | null
  googleMapsUrl: string | null
  photoReference: string | null
}

/**
 * Hent fullstendige stedsdetaljer fra Google Places API.
 * Dette er det eneste stedet i backend som gjør betalte Details-kall
 * for kartsteder - alt annet leses fra Firestore.
 */
export async function fetchPlaceDetailsFromGoogle(placeId: string): Promise<GooglePlaceDetails | null> {
  // current_opening_hours dekker de faktiske tidene de neste ~7 dagene,
  // inkludert helligdager/spesialdager. Samme pristrinn som opening_hours.
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,formatted_address,geometry,opening_hours,current_opening_hours,formatted_phone_number,website,photos,rating,url&key=${GOOGLE_PLACES_API_KEY}`
  )

  const data = await response.json()
  const place = data.result

  if (!place) {
    console.warn(`Google Places returnerte ingen data for ${placeId} (status: ${data.status})`)
    return null
  }

  return {
    navn: place.name || '',
    adresse: place.formatted_address || '',
    lat: place.geometry?.location?.lat ?? 0,
    lng: place.geometry?.location?.lng ?? 0,
    rating: place.rating ?? null,
    telefon: place.formatted_phone_number ?? null,
    nettside: place.website ?? null,
    apningstider: place.opening_hours?.weekday_text ?? null,
    openingPeriods: place.opening_hours?.periods ?? null,
    currentOpeningPeriods: place.current_opening_hours?.periods ?? null,
    googleMapsUrl: place.url ?? null,
    photoReference: place.photos?.[0]?.photo_reference ?? null,
  }
}

/**
 * Bygg cachedData-objekt for Firestore fra Google-detaljer.
 * Bruker null (ikke undefined) for manglende verdier - Firestore avviser undefined.
 *
 * Hvis `previous` oppgis, bevares tidligere lagrede verdier for felt Google
 * ikke returnerte denne gangen - et ufullstendig/degradert Google-svar skal
 * ikke viske ut gode åpningstider eller bilder som allerede ligger lagret.
 */
export function buildCachedData(
  details: GooglePlaceDetails,
  previous?: Record<string, unknown> | null
): Record<string, unknown> {
  const keep = (fresh: unknown, key: string): unknown =>
    fresh !== null && fresh !== '' ? fresh : (previous?.[key] ?? null)

  return {
    navn: keep(details.navn, 'navn') || '',
    adresse: keep(details.adresse, 'adresse') || '',
    lat: details.lat || ((previous?.lat as number) ?? 0),
    lng: details.lng || ((previous?.lng as number) ?? 0),
    rating: keep(details.rating, 'rating'),
    telefon: keep(details.telefon, 'telefon'),
    nettside: keep(details.nettside, 'nettside'),
    apningstider: keep(details.apningstider, 'apningstider'),
    openingPeriods: keep(details.openingPeriods, 'openingPeriods'),
    // Bevares IKKE fra forrige versjon: utdaterte "denne uken"-tider er
    // verre enn ingen (da faller vi heller tilbake til den faste ukeplanen)
    currentOpeningPeriods: details.currentOpeningPeriods,
    googleMapsUrl: keep(details.googleMapsUrl, 'googleMapsUrl'),
    photoReference: keep(details.photoReference, 'photoReference'),
    sisteOppdatering: new Date(),
  }
}

// current_opening_hours fra Google er bare gyldig ~7 dager fra hentetidspunktet
const CURRENT_PERIODS_VALID_DAYS = 7

/**
 * Velg riktig åpningstidsplan for "åpen nå"-beregning:
 * de faktiske tidene for inneværende uke (fanger helligdager) hvis de
 * fortsatt er gyldige, ellers den faste ukeplanen.
 */
export function pickOpeningPeriods(
  cachedData: Record<string, unknown> | undefined
): OpeningPeriod[] | null {
  if (!cachedData) return null

  const current = (cachedData.currentOpeningPeriods ?? null) as OpeningPeriod[] | null
  if (current) {
    const updated = toDate(cachedData.sisteOppdatering)
    if (updated && Date.now() - updated.getTime() < CURRENT_PERIODS_VALID_DAYS * 24 * 60 * 60 * 1000) {
      return current
    }
  }

  return (cachedData.openingPeriods ?? null) as OpeningPeriod[] | null
}

/** Konverter Firestore Timestamp / Date / ISO-streng til Date */
export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'toDate' in (value as object)) {
    return (value as { toDate: () => Date }).toDate()
  }
  const parsed = new Date(String(value))
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Har stedet detaljdata i nytt format (med åpningstider osv.)?
 * Gamle dokumenter har bare navn/adresse/koordinater og må hentes fra Google én gang.
 */
export function hasFullDetails(cachedData: Record<string, unknown> | undefined): boolean {
  if (!cachedData) return false
  // openingPeriods settes eksplisitt (evt. til null) ved full henting,
  // så nøkkelen finnes kun i dokumenter som er oppdatert med nytt format
  return 'openingPeriods' in cachedData
}

/** Er lagrede detaljer eldre enn TTL? */
export function isDetailsStale(cachedData: Record<string, unknown> | undefined): boolean {
  const updated = toDate(cachedData?.sisteOppdatering)
  if (!updated) return true
  const ageMs = Date.now() - updated.getTime()
  return ageMs > DETAILS_TTL_DAYS * 24 * 60 * 60 * 1000
}

function parseHHMM(time: string): number {
  const hours = parseInt(time.slice(0, 2), 10)
  const minutes = parseInt(time.slice(2, 4), 10)
  if (isNaN(hours) || isNaN(minutes)) return NaN
  return hours * 60 + minutes
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** Nåværende ukedag (0=søndag) og minutter siden midnatt i Oslo-tid */
function osloDayAndMinutes(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: OSLO_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  let day = 0
  let hours = 0
  let minutes = 0
  for (const part of parts) {
    if (part.type === 'weekday') day = WEEKDAY_TO_INDEX[part.value] ?? 0
    // Intl kan gi "24" for midnatt i enkelte miljøer - normaliser til 0
    if (part.type === 'hour') hours = parseInt(part.value, 10) % 24
    if (part.type === 'minute') minutes = parseInt(part.value, 10)
  }
  return { day, minutes: hours * 60 + minutes }
}

/**
 * Beregn om et sted er åpent nå, ut fra lagrede åpningstidsperioder.
 * Erstatter Place Details-kall mot Google - beregningen er gratis og
 * alltid i sanntid mot den lagrede ukeplanen.
 *
 * Returnerer null hvis åpningstider er ukjent (stedet vises da som før).
 */
export function computeOpenNow(
  periods: OpeningPeriod[] | null | undefined,
  now: Date = new Date()
): boolean | null {
  if (!periods || periods.length === 0) return null

  // Googles format for døgnåpent: én periode med open day 0 / "0000" uten close
  if (periods.length === 1 && periods[0].open && !periods[0].close) {
    return true
  }

  const WEEK_MINUTES = 7 * 24 * 60
  const { day, minutes } = osloDayAndMinutes(now)
  const nowMin = day * 24 * 60 + minutes

  for (const period of periods) {
    if (!period.open || !period.close) continue

    const openTime = parseHHMM(period.open.time)
    const closeTime = parseHHMM(period.close.time)
    if (isNaN(openTime) || isNaN(closeTime)) continue

    const openMin = period.open.day * 24 * 60 + openTime
    let closeMin = period.close.day * 24 * 60 + closeTime

    // Perioder som krysser midnatt/ukeskiftet (f.eks. lørdag 22:00 - søndag 03:00)
    if (closeMin <= openMin) closeMin += WEEK_MINUTES

    if (nowMin >= openMin && nowMin < closeMin) return true
    // Sjekk også forrige ukes "runde" for perioder som krysser ukeskiftet
    if (nowMin + WEEK_MINUTES >= openMin && nowMin + WEEK_MINUTES < closeMin) return true
  }

  return false
}

// Deduplisering av pågående oppdateringer: mange samtidige forespørsler
// (f.eks. ved sponsede innlegg med høy trafikk) skal aldri utløse mer enn
// ett Google-kall per sted om gangen.
const refreshInFlight = new Map<string, Promise<GooglePlaceDetails | null>>()
const MAX_CONCURRENT_BACKGROUND_REFRESHES = 5

/**
 * Hent ferske detaljer fra Google og oppdater alle Firestore-dokumenter
 * med samme placeId (et sted kan finnes i flere kartinstanser).
 * Samtidige kall for samme placeId deles - kun ett Google-kall gjøres.
 * Returnerer detaljene, eller null hvis Google ikke ga svar.
 */
export function refreshStedDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const existing = refreshInFlight.get(placeId)
  if (existing) return existing

  const promise = (async () => {
    const details = await fetchPlaceDetailsFromGoogle(placeId)

    const snapshot = await stederCollection.where('placeId', '==', placeId).get()
    if (!snapshot.empty) {
      const batch = stederCollection.firestore.batch()
      for (const doc of snapshot.docs) {
        const previous = doc.data().cachedData as Record<string, unknown> | undefined
        if (details) {
          batch.update(doc.ref, { cachedData: buildCachedData(details, previous) })
        } else {
          // Negativt cache-merke: Google ga ikke svar (utgått placeId, kvotefeil
          // e.l.). Marker stedet som forsøkt oppdatert nå, slik at nye forsøk
          // skjer maks én gang per TTL-vindu - aldri ved hver forespørsel.
          batch.update(doc.ref, {
            'cachedData.openingPeriods': previous?.openingPeriods ?? null,
            'cachedData.sisteOppdatering': new Date(),
          })
        }
      }
      await batch.commit()
    }

    return details
  })().finally(() => {
    refreshInFlight.delete(placeId)
  })

  refreshInFlight.set(placeId, promise)
  return promise
}

/**
 * Start en bakgrunnsoppdatering av et sted (stale-while-revalidate).
 * Blokkerer aldri forespørselen som utløste den, og hopper over hvis
 * en oppdatering allerede pågår eller for mange kjører samtidig.
 */
export function scheduleBackgroundRefresh(placeId: string): void {
  if (refreshInFlight.has(placeId)) return
  if (refreshInFlight.size >= MAX_CONCURRENT_BACKGROUND_REFRESHES) return

  refreshStedDetails(placeId).catch((err) => {
    console.warn(`Bakgrunnsoppdatering feilet for ${placeId}:`, err)
  })
}
