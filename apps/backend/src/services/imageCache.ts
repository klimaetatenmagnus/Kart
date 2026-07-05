import { createHash } from 'node:crypto'
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

// ============================================
// Foto-proxy-cache i Cloud Storage
// Deles på tvers av Cloud Run-instanser og overlever nedskalering til null,
// slik at hvert unike bilde hentes fra Google maks én gang per lagringsperiode.
// ============================================

// photo_reference kan være svært lang - bruk hash som filnavn
function photoProxyPath(photoReference: string, width: number): string {
  const hash = createHash('sha256').update(photoReference).digest('hex')
  return `fotoproxy/${hash}_w${width}`
}

export interface ProxiedPhoto {
  buffer: Buffer
  contentType: string
}

/** Hent proxiet bilde fra Cloud Storage, eller null hvis det ikke finnes */
export async function getProxiedPhotoFromStorage(
  photoReference: string,
  width: number
): Promise<ProxiedPhoto | null> {
  const file = storage.bucket(BUCKET_NAME).file(photoProxyPath(photoReference, width))
  try {
    const [buffer] = await file.download()
    const [metadata] = await file.getMetadata()
    return {
      buffer,
      contentType: (metadata.contentType as string) || 'image/jpeg',
    }
  } catch {
    // Finnes ikke (eller utilgjengelig) - behandles som cache-miss
    return null
  }
}

/** Lagre proxiet bilde i Cloud Storage */
export async function saveProxiedPhotoToStorage(
  photoReference: string,
  width: number,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const file = storage.bucket(BUCKET_NAME).file(photoProxyPath(photoReference, width))
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=2592000', // 30 dager
    },
  })
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
