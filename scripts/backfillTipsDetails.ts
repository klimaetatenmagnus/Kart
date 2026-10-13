/**
 * Backfill-skript: erstatter navn og adresse på tips med fullstendige data
 * fra Google Place Details (basert på lagret placeId).
 *
 * Tips sendt inn før autocomplete ble begrenset til virksomheter kan ha
 * gateadresse som "butikknavn" og en forkortet adresse ("Oslo, Norge").
 * Opprinnelige verdier bevares i feltet `opprinnelig`.
 *
 * Kjor med: npm run migrate:tips            (kun visning, skriver ingenting)
 *           npm run migrate:tips -- --write (oppdaterer Firestore)
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

const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
})

interface TipsDetails {
  navn: string
  adresse: string
  erVirksomhet: boolean
}

async function fetchDetails(placeId: string): Promise<TipsDetails | null> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,formatted_address,types&language=no&key=${GOOGLE_PLACES_API_KEY}`
  )
  const data = await response.json()
  const place = data.result

  if (!place) {
    console.warn(`  Ingen data fra Google for ${placeId} (status: ${data.status})`)
    return null
  }

  const types: string[] = place.types || []
  return {
    navn: place.name || '',
    adresse: place.formatted_address || '',
    erVirksomhet: types.includes('establishment'),
  }
}

async function main() {
  const write = process.argv.includes('--write')

  const snapshot = await db.collection('tips').where('status', '==', 'ny').get()
  console.log(`Fant ${snapshot.size} nye tips${write ? '' : ' (kun visning - bruk --write for å lagre)'}\n`)

  const results = { updated: 0, skipped: 0, failed: 0 }

  for (const doc of snapshot.docs) {
    const tip = doc.data()
    const placeId = tip.placeId as string | null | undefined

    if (!placeId) {
      console.warn(`  Hopper over ${doc.id} - mangler placeId`)
      results.skipped++
      continue
    }
    if (tip.opprinnelig) {
      results.skipped++
      continue
    }

    try {
      const details = await fetchDetails(placeId)
      if (!details) {
        results.failed++
        continue
      }

      console.log(`  ${doc.id}${details.erVirksomhet ? '' : '  [IKKE VIRKSOMHET - trolig bare en adresse]'}`)
      console.log(`    Før:  ${tip.butikknavn} | ${tip.adresse}`)
      console.log(`    Etter: ${details.navn} | ${details.adresse}`)

      if (write) {
        await doc.ref.update({
          butikknavn: details.navn || tip.butikknavn,
          adresse: details.adresse || tip.adresse,
          opprinnelig: { butikknavn: tip.butikknavn, adresse: tip.adresse },
        })
      }
      results.updated++
    } catch (error) {
      results.failed++
      console.error(`  Feilet for ${doc.id}:`, error)
    }

    // Vent 200ms mellom Google-kall for a unnga rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log('\nFerdig:')
  console.log(`  ${write ? 'Oppdatert' : 'Ville oppdatert'}: ${results.updated}`)
  console.log(`  Hoppet over: ${results.skipped}`)
  console.log(`  Feilet: ${results.failed}`)
}

main().catch((err) => {
  console.error('Backfill feilet:', err)
  process.exit(1)
})
