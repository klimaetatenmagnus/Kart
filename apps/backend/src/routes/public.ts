import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { kartinstanserCollection, stederCollection, tipsCollection } from '../services/firestore.js'
import { ApiCache } from '../services/apiCache.js'
import type { TipsInput } from '@klimaoslo-kart/shared'

export const publicRouter = Router()

// Rate limiting for Places API-endepunkter (beskytter mot misbruk og høye kostnader)
const placesRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutt
  max: 30, // maks 30 forespørsler per minutt per IP
  message: { success: false, error: 'For mange forespørsler. Vennligst vent litt.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting for tips-innsending (beskytter mot spam)
const tipsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutt
  max: 5, // maks 5 tips per minutt per IP
  message: { success: false, error: 'For mange tips sendt. Vennligst vent litt.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

// Oslo sentrum koordinater og søkeradius
const OSLO_CENTER_LAT = 59.9139
const OSLO_CENTER_LNG = 10.7522
const OSLO_SEARCH_RADIUS = 15000 // 15 km dekker det meste av Oslo

// Server-side cacher for å redusere Google API-kall og kostnader
// Place Details: 30 minutter (statiske data som adresse, telefon osv.)
const placeDetailsCache = new ApiCache<Record<string, unknown>>(30 * 60)
// Åpen nå-status: 3 minutter (endres sjeldnere enn hvert 3. minutt)
const openNowCache = new ApiCache<boolean | null>(3 * 60)
// Foto-cache: 24 timer (bilder endres sjelden)
const photoCache = new ApiCache<{ buffer: Buffer; contentType: string }>(24 * 60 * 60)

// Rydd opp utløpte cache-oppføringer hvert 10. minutt
setInterval(() => {
  placeDetailsCache.cleanup()
  openNowCache.cleanup()
  photoCache.cleanup()
}, 10 * 60 * 1000)

// Hent kartinstans (offentlig)
publicRouter.get('/kartinstanser/:slug', async (req, res) => {
  try {
    const doc = await kartinstanserCollection.doc(req.params.slug).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Kartinstans ikke funnet' })
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (err) {
    console.error('Error fetching kartinstans:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente kartinstans' })
  }
})

// Hent steder for kartinstans (offentlig)
publicRouter.get('/kartinstanser/:slug/steder', async (req, res) => {
  try {
    const { slug } = req.params
    const snapshot = await stederCollection
      .where('kartinstansId', '==', slug)
      .get()

    const steder = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json({ success: true, data: steder })
  } catch (err) {
    console.error('Error fetching steder:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente steder' })
  }
})

// Autocomplete for tips-skjema (offentlig, rate limited)
publicRouter.get('/places/autocomplete', placesRateLimiter, async (req, res) => {
  try {
    const { input } = req.query

    if (!input) {
      return res.status(400).json({ success: false, error: 'Mangler input-parameter' })
    }

    // Begrens input-lengde for å unngå misbruk
    const inputStr = String(input)
    if (inputStr.length > 100) {
      return res.status(400).json({ success: false, error: 'Søketekst er for lang (maks 100 tegn)' })
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        inputStr
      )}&location=${OSLO_CENTER_LAT},${OSLO_CENTER_LNG}&radius=${OSLO_SEARCH_RADIUS}&strictbounds=true&components=country:no&key=${GOOGLE_PLACES_API_KEY}`
    )

    const data = await response.json()

    // Filtrer til kun Oslo-adresser
    const osloResults = (data.predictions || []).filter((prediction: Record<string, unknown>) => {
      const description = String(prediction.description || '')
      return description.includes('Oslo')
    })

    const results = osloResults.map((prediction: Record<string, unknown>) => ({
      placeId: prediction.place_id,
      beskrivelse: prediction.description,
      hovedtekst: (prediction.structured_formatting as { main_text?: string })?.main_text,
      sekundartekst: (prediction.structured_formatting as { secondary_text?: string })?.secondary_text,
    }))

    res.json({ success: true, data: results })
  } catch (err) {
    console.error('Error with autocomplete:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente autocomplete-forslag' })
  }
})

// Place Details for infoboks og tips-skjema (offentlig, rate limited)
publicRouter.get('/places/details', placesRateLimiter, async (req, res) => {
  try {
    const { placeId } = req.query

    if (!placeId) {
      return res.status(400).json({ success: false, error: 'Mangler placeId-parameter' })
    }

    const placeIdStr = String(placeId)

    // Sjekk cache først
    const cached = placeDetailsCache.get(placeIdStr)
    if (cached) {
      return res.json({ success: true, data: cached })
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeIdStr}&fields=name,formatted_address,geometry,opening_hours,formatted_phone_number,website,photos,rating,url&key=${GOOGLE_PLACES_API_KEY}`
    )

    const data = await response.json()
    const place = data.result

    if (!place) {
      return res.status(404).json({ success: false, error: 'Sted ikke funnet' })
    }

    // Generer proxy-URLer for bilder (skjuler API-nøkkelen fra klienten)
    const bilder = place.photos?.map((photo: { photo_reference: string }) =>
      `/api/public/places/photo?ref=${encodeURIComponent(photo.photo_reference)}&maxwidth=400`
    )

    const result: Record<string, unknown> = {
      placeId: placeIdStr,
      navn: place.name,
      adresse: place.formatted_address,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      rating: place.rating,
      telefon: place.formatted_phone_number,
      nettside: place.website,
      apningstider: place.opening_hours?.weekday_text,
      apenNa: place.opening_hours?.open_now,
      googleMapsUrl: place.url,
      bilder,
    }

    // Cache resultatet
    placeDetailsCache.set(placeIdStr, result)

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Error fetching place details:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente stedsdetaljer' })
  }
})

// Batch-sjekk av åpen nå-status for flere steder (offentlig, rate limited)
// Brukes av "Åpen nå"-filteret for å hente faktisk status på tidspunktet filteret aktiveres
publicRouter.get('/places/open-now-batch', placesRateLimiter, async (req, res) => {
  try {
    const { placeIds } = req.query

    if (!placeIds || typeof placeIds !== 'string') {
      return res.status(400).json({ success: false, error: 'Mangler placeIds-parameter' })
    }

    const ids = placeIds.split(',').filter(id => id.trim())

    if (ids.length === 0) {
      return res.json({ success: true, data: {} })
    }

    // Begrens antall steder per forespørsel for å unngå overbelastning
    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'For mange steder. Maks 50 per forespørsel.'
      })
    }

    // Sjekk cache og finn hvilke som trenger fersk data
    const statusMap: Record<string, boolean | null> = {}
    const uncachedIds: string[] = []

    for (const id of ids) {
      const cached = openNowCache.get(id)
      if (cached !== null) {
        statusMap[id] = cached
      } else {
        uncachedIds.push(id)
      }
    }

    // Hent åpen/lukket-status kun for steder som ikke er cachet
    if (uncachedIds.length > 0) {
      const results = await Promise.all(
        uncachedIds.map(async (placeId) => {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${GOOGLE_PLACES_API_KEY}`
            )
            const data = await response.json()

            // open_now er beregnet av Google basert på nåværende tidspunkt
            const isOpen = data.result?.opening_hours?.open_now ?? null
            // Cache resultatet
            openNowCache.set(placeId, isOpen)
            return { placeId, isOpen }
          } catch {
            // Returnerer null hvis vi ikke får svar, så stedet vises uansett
            return { placeId, isOpen: null }
          }
        })
      )

      for (const result of results) {
        statusMap[result.placeId] = result.isOpen
      }
    }

    res.json({ success: true, data: statusMap })
  } catch (err) {
    console.error('Error fetching open-now batch:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente åpningsstatus' })
  }
})

// Foto-proxy: serverer Google Places-bilder uten å eksponere API-nøkkelen
// Cacher bilder i minne (24 timer) + browser-cache (7 dager) for å minimere API-kall
publicRouter.get('/places/photo', placesRateLimiter, async (req, res) => {
  try {
    const { ref, maxwidth } = req.query

    if (!ref || typeof ref !== 'string') {
      return res.status(400).json({ success: false, error: 'Mangler ref-parameter' })
    }

    const width = Number(maxwidth) || 400
    const cacheKey = `${ref}_${width}`

    // Sjekk server-side cache først
    const cached = photoCache.get(cacheKey)
    if (cached) {
      res.set('Cache-Control', 'public, max-age=604800')
      res.set('Content-Type', cached.contentType)
      return res.send(cached.buffer)
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_PLACES_API_KEY}`
    const response = await fetch(photoUrl)

    if (!response.ok) {
      return res.status(502).json({ success: false, error: 'Kunne ikke hente bilde' })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Cache i minne i 24 timer
    photoCache.set(cacheKey, { buffer, contentType })

    // Sett cache-headers slik at browseren cacher bildet i 7 dager
    res.set('Cache-Control', 'public, max-age=604800')
    res.set('Content-Type', contentType)
    res.send(buffer)
  } catch (err) {
    console.error('Error proxying photo:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente bilde' })
  }
})

// Send inn tips (offentlig, rate limited)
publicRouter.post('/tips', tipsRateLimiter, async (req, res) => {
  try {
    const input: TipsInput = req.body

    const tip = {
      kartinstansId: input.kartinstansId,
      placeId: input.placeId || null, // Google Places ID for direkte godkjenning
      butikknavn: input.butikknavn,
      adresse: input.adresse,
      kategori: input.kategori,
      status: 'ny',
      opprettet: new Date(),
      behandletAv: null,
    }

    const docRef = await tipsCollection.add(tip)

    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...tip },
    })
  } catch (err) {
    console.error('Error creating tip:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke sende inn tips' })
  }
})
