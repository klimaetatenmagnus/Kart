/**
 * Migreringsskript for eksisterende steder uten bildecache
 *
 * Kjor med: npm run migrate:images
 *
 * Forutsetter at miljovariablene er satt:
 * - GOOGLE_PLACES_API_KEY
 * - GCP_PROJECT_ID (eller GOOGLE_CLOUD_PROJECT)
 * - GCS_BUCKET_NAME (valgfritt, default: klimaoslo-kart-bilder)
 */

import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'klimaoslo-kart-bilder'
const CACHE_DURATION_DAYS = 30

if (!GOOGLE_PLACES_API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY miljovariabel ma settes')
  process.exit(1)
}

const db = new Firestore()
const storage = new Storage()

interface StedData {
  placeId: string
  cachedData?: {
    navn?: string
  }
  bildeCache?: unknown
}

async function getPhotoReference(placeId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_PLACES_API_KEY}`
    )
    const data = await response.json()

    if (data.result?.photos && data.result.photos.length > 0) {
      return data.result.photos[0].photo_reference
    }
    return null
  } catch (error) {
    console.error(`Error fetching photo reference for ${placeId}:`, error)
    return null
  }
}

async function cacheStedBilde(placeId: string, photoReference: string) {
  // Hent bildet fra Google Places Photo API
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`

  const response = await fetch(photoUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${response.statusText}`)
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer())

  // Last opp til Cloud Storage
  const bucket = storage.bucket(BUCKET_NAME)
  const filePath = `steder/${placeId}/bilde.jpg`
  const file = bucket.file(filePath)

  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=2592000',
    },
  })

  // Generer offentlig URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`

  // Beregn utlopstidspunkt
  const now = new Date()
  const utloper = new Date(now)
  utloper.setDate(utloper.getDate() + CACHE_DURATION_DAYS)

  return {
    url: publicUrl,
    cachetTidspunkt: now,
    utloper,
    originalPhotoReference: photoReference,
    bredde: 400,
    hoyde: 300,
  }
}

async function migrateExistingImages() {
  console.log('Starter migrering av eksisterende bilder...')
  console.log(`Bucket: ${BUCKET_NAME}`)
  console.log('')

  // Hent alle steder
  const stederSnapshot = await db.collection('steder').get()

  console.log(`Totalt ${stederSnapshot.size} steder i databasen`)

  // Filtrer til steder uten bildecache
  const stederWithoutCache = stederSnapshot.docs.filter(doc => {
    const data = doc.data() as StedData
    return !data.bildeCache
  })

  console.log(`${stederWithoutCache.length} steder uten bildecache`)
  console.log('')

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const doc of stederWithoutCache) {
    const sted = doc.data() as StedData
    const stedNavn = sted.cachedData?.navn || sted.placeId

    try {
      // Hent photo_reference fra Google Places
      const photoReference = await getPhotoReference(sted.placeId)

      if (!photoReference) {
        console.log(`⚠ ${stedNavn} - ingen bilder tilgjengelig`)
        skipped++
        continue
      }

      // Cache bildet
      const bildeCache = await cacheStedBilde(sted.placeId, photoReference)

      // Oppdater Firestore
      await doc.ref.update({ bildeCache })

      console.log(`✓ ${stedNavn}`)
      updated++
    } catch (error) {
      console.error(`✗ ${stedNavn}:`, error instanceof Error ? error.message : error)
      failed++
    }

    // Rate limiting - vent 200ms mellom kall
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('')
  console.log('=== Migrering fullfort ===')
  console.log(`Oppdatert: ${updated}`)
  console.log(`Hoppet over (ingen bilder): ${skipped}`)
  console.log(`Feilet: ${failed}`)
}

// Kjor migrering
migrateExistingImages()
  .then(() => {
    console.log('')
    console.log('Ferdig!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Migrering feilet:', error)
    process.exit(1)
  })
