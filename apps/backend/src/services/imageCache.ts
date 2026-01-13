import { Storage } from '@google-cloud/storage'
import type { BildeCache } from '@klimaoslo-kart/shared'

const storage = new Storage()
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'klimaoslo-kart-bilder'
const CACHE_DURATION_DAYS = 30

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

export interface ImageCacheResult {
  url: string
  cachetTidspunkt: Date
  utloper: Date
  originalPhotoReference: string
  bredde: number
  hoyde: number
}

/**
 * Cache et stedsbilde fra Google Places til Cloud Storage
 */
export async function cacheStedBilde(
  placeId: string,
  photoReference: string,
  maxWidth: number = 400
): Promise<ImageCacheResult> {
  // 1. Hent bildet fra Google Places Photo API
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`

  const response = await fetch(photoUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${response.statusText}`)
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer())

  // 2. Last opp til Cloud Storage
  const bucket = storage.bucket(BUCKET_NAME)
  const filePath = `steder/${placeId}/bilde.jpg`
  const file = bucket.file(filePath)

  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=2592000', // 30 dager
    },
  })

  // 3. Generer offentlig URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`

  // 4. Beregn utlopstidspunkt
  const now = new Date()
  const utloper = new Date(now)
  utloper.setDate(utloper.getDate() + CACHE_DURATION_DAYS)

  return {
    url: publicUrl,
    cachetTidspunkt: now,
    utloper,
    originalPhotoReference: photoReference,
    bredde: maxWidth,
    hoyde: Math.round(maxWidth * 0.75), // Estimert aspect ratio
  }
}

/**
 * Slett cachet bilde fra Cloud Storage
 */
export async function deleteStedBilde(placeId: string): Promise<void> {
  const bucket = storage.bucket(BUCKET_NAME)
  const file = bucket.file(`steder/${placeId}/bilde.jpg`)

  try {
    await file.delete()
    console.log(`Deleted cached image for place ${placeId}`)
  } catch (error) {
    // Ignorer feil hvis filen ikke finnes
    console.warn(`Could not delete image for ${placeId}:`, error)
  }
}

/**
 * Sjekk om bildecache har utlopt
 */
export function isBildeCacheExpired(bildeCache: BildeCache): boolean {
  const now = new Date()
  const utloper = new Date(bildeCache.utloper)
  return now > utloper
}

/**
 * Hent photo_reference fra Google Places API
 */
export async function getPhotoReference(placeId: string): Promise<string | null> {
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
