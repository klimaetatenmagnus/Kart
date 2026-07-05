/**
 * Backfill-skript: lagrer fullstendige stedsdetaljer (åpningstider, telefon,
 * nettside osv.) i Firestore for alle eksisterende steder.
 *
 * Etter kjoring serveres alle stedsdetaljer og "åpen nå"-status fra Firestore
 * uten Google API-kall. Skriptet gjor ett Place Details-kall per unike placeId
 * (steder som finnes i flere kartinstanser deler kallet).
 *
 * Kjor med: npm run migrate:details
 *
 * Forutsetter at miljovariablene er satt:
 * - GOOGLE_PLACES_API_KEY
 * - GCP_PROJECT_ID (eller GOOGLE_CLOUD_PROJECT)
 */

import { Firestore } from '@google-cloud/firestore'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!GOOGLE_PLACES_API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY miljovariabel ma settes')
  process.exit(1)
}

// Firestore-SDK-en leser GOOGLE_CLOUD_PROJECT, ikke GCP_PROJECT_ID -
// send prosjekt-ID eksplisitt så skriptet aldri treffer feil prosjekt
const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
})

interface GoogleDetails {
  navn: string
  adresse: string
  lat: number
  lng: number
  rating: number | null
  telefon: string | null
  nettside: string | null
  apningstider: string[] | null
  openingPeriods: unknown[] | null
  currentOpeningPeriods: unknown[] | null
  googleMapsUrl: string | null
  photoReference: string | null
}

async function fetchDetails(placeId: string): Promise<GoogleDetails | null> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,formatted_address,geometry,opening_hours,current_opening_hours,formatted_phone_number,website,photos,rating,url&key=${GOOGLE_PLACES_API_KEY}`
  )
  const data = await response.json()
  const place = data.result

  if (!place) {
    console.warn(`  Ingen data fra Google for ${placeId} (status: ${data.status})`)
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

async function main() {
  const forceAll = process.argv.includes('--force')

  const snapshot = await db.collection('steder').get()
  console.log(`Fant ${snapshot.size} steder totalt`)

  // Grupper dokumenter per placeId slik at hvert sted kun koster ett Google-kall
  const byPlaceId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>()
  for (const doc of snapshot.docs) {
    const placeId = doc.data().placeId as string | undefined
    if (!placeId) {
      console.warn(`  Hopper over ${doc.id} - mangler placeId`)
      continue
    }
    const docs = byPlaceId.get(placeId) || []
    docs.push(doc)
    byPlaceId.set(placeId, docs)
  }

  const results = { updated: 0, skipped: 0, failed: 0 }

  for (const [placeId, docs] of byPlaceId) {
    // Hopp over steder som allerede har nytt dataformat (med mindre --force)
    const alreadyDone = docs.every((doc) => {
      const cachedData = doc.data().cachedData as Record<string, unknown> | undefined
      return cachedData && 'openingPeriods' in cachedData
    })
    if (alreadyDone && !forceAll) {
      results.skipped++
      continue
    }

    try {
      const details = await fetchDetails(placeId)

      if (!details) {
        // Negativt cache-merke: Google kjenner ikke stedet (utgått placeId e.l.).
        // Markeres som forsøkt, slik at backend ikke prøver på nytt ved hver
        // forespørsel - kun én gang per TTL-vindu.
        for (const doc of docs) {
          const previous = (doc.data().cachedData || {}) as Record<string, unknown>
          await doc.ref.update({
            'cachedData.openingPeriods': previous.openingPeriods ?? null,
            'cachedData.sisteOppdatering': new Date(),
          })
        }
        results.failed++
        console.warn(`  Ingen Google-data for ${placeId} - markert som forsøkt`)
        continue
      }

      for (const doc of docs) {
        // Bevar eksisterende verdier for felt Google ikke returnerte
        const previous = (doc.data().cachedData || {}) as Record<string, unknown>
        const keep = (fresh: unknown, key: string): unknown =>
          fresh !== null && fresh !== '' ? fresh : (previous[key] ?? null)

        const cachedData = {
          navn: keep(details.navn, 'navn') || '',
          adresse: keep(details.adresse, 'adresse') || '',
          lat: details.lat || ((previous.lat as number) ?? 0),
          lng: details.lng || ((previous.lng as number) ?? 0),
          rating: keep(details.rating, 'rating'),
          telefon: keep(details.telefon, 'telefon'),
          nettside: keep(details.nettside, 'nettside'),
          apningstider: keep(details.apningstider, 'apningstider'),
          openingPeriods: keep(details.openingPeriods, 'openingPeriods'),
          currentOpeningPeriods: details.currentOpeningPeriods,
          googleMapsUrl: keep(details.googleMapsUrl, 'googleMapsUrl'),
          photoReference: keep(details.photoReference, 'photoReference'),
          sisteOppdatering: new Date(),
        }

        await doc.ref.update({ cachedData })
      }

      results.updated++
      console.log(`  Oppdatert ${details.navn} (${placeId}, ${docs.length} dokument(er))`)
    } catch (error) {
      results.failed++
      console.error(`  Feilet for ${placeId}:`, error)
    }

    // Vent 200ms mellom Google-kall for a unnga rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log('\nFerdig:')
  console.log(`  Oppdatert: ${results.updated} unike steder`)
  console.log(`  Hoppet over (allerede oppdatert): ${results.skipped}`)
  console.log(`  Feilet: ${results.failed}`)
}

main().catch((err) => {
  console.error('Backfill feilet:', err)
  process.exit(1)
})
