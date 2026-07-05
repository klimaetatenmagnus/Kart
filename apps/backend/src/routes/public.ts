import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { kartinstanserCollection, stederCollection, tipsCollection } from '../services/firestore.js'
import { ApiCache } from '../services/apiCache.js'
import {
  buildCachedData,
  computeOpenNow,
  fetchPlaceDetailsFromGoogle,
  hasFullDetails,
  isDetailsStale,
  pickOpeningPeriods,
  refreshStedDetails,
  scheduleBackgroundRefresh,
} from '../services/placeDetails.js'
import {
  getProxiedPhotoFromStorage,
  saveProxiedPhotoToStorage,
} from '../services/imageCache.js'
import type { TipsInput, BildeCacheDTO } from '@klimaoslo-kart/shared'

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

// In-memory L1-cacher. Merk: Cloud Run skalerer til null mellom besøk,
// så disse er kun en rask snarvei innenfor en instans' levetid.
// Varig caching skjer i Firestore (stedsdetaljer) og Cloud Storage (bilder).
// Place Details-fallback for steder som IKKE finnes i noen kartinstans:
const placeDetailsCache = new ApiCache<Record<string, unknown>>(30 * 60)
// Foto: L1 foran Cloud Storage
const photoCache = new ApiCache<{ buffer: Buffer; contentType: string }>(24 * 60 * 60)

// Rydd opp utløpte cache-oppføringer hvert 10. minutt
setInterval(() => {
  placeDetailsCache.cleanup()
  photoCache.cleanup()
}, 10 * 60 * 1000)

/**
 * Bygg PlaceDetails-respons fra lagret Firestore-data.
 * "Åpen nå" beregnes lokalt fra lagrede åpningstidsperioder - ingen Google-kall.
 */
function buildDetailsResponse(
  placeId: string,
  cachedData: Record<string, unknown>,
  bildeCache?: BildeCacheDTO | null
): Record<string, unknown> {
  const periods = pickOpeningPeriods(cachedData)
  const photoReference = cachedData.photoReference as string | null | undefined

  // Foretrekk bildet som allerede ligger i Cloud Storage (gratis å servere),
  // fall tilbake til foto-proxy kun hvis bildeCache mangler
  let bilder: string[] | undefined
  if (bildeCache?.url) {
    bilder = [bildeCache.url]
  } else if (photoReference) {
    bilder = [`/api/public/places/photo?ref=${encodeURIComponent(photoReference)}&maxwidth=400`]
  }

  return {
    placeId,
    navn: cachedData.navn,
    adresse: cachedData.adresse,
    lat: cachedData.lat,
    lng: cachedData.lng,
    rating: cachedData.rating ?? undefined,
    telefon: cachedData.telefon ?? undefined,
    nettside: cachedData.nettside ?? undefined,
    apningstider: cachedData.apningstider ?? undefined,
    apenNa: computeOpenNow(periods) ?? undefined,
    googleMapsUrl:
      cachedData.googleMapsUrl ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    bilder,
  }
}

// Hent kartinstans (offentlig)
publicRouter.get('/kartinstanser/:slug', async (req, res) => {
  try {
    const doc = await kartinstanserCollection.doc(req.params.slug).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Kartinstans ikke funnet' })
    }

    res.set('Cache-Control', 'public, max-age=300')
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

    res.set('Cache-Control', 'public, max-age=300')
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

// Place Details for infoboks (offentlig, rate limited)
// Steder som finnes i et kart serveres fra Firestore (ingen Google-kall);
// utdaterte data oppdateres i bakgrunnen (stale-while-revalidate).
publicRouter.get('/places/details', placesRateLimiter, async (req, res) => {
  try {
    const { placeId } = req.query

    if (!placeId) {
      return res.status(400).json({ success: false, error: 'Mangler placeId-parameter' })
    }

    const placeIdStr = String(placeId)

    // 1) Sted i et av kartene: server fra Firestore
    const snapshot = await stederCollection.where('placeId', '==', placeIdStr).limit(1).get()

    if (!snapshot.empty) {
      const stedData = snapshot.docs[0].data()
      let cachedData = stedData.cachedData as Record<string, unknown> | undefined

      if (!hasFullDetails(cachedData)) {
        // Gammelt dataformat uten detaljer: hent fra Google én gang og lagre,
        // slik at alle senere forespørsler er gratis. Feiler Google, serverer
        // vi likevel det vi har (navn, adresse, posisjon) fra Firestore.
        try {
          const details = await refreshStedDetails(placeIdStr)
          if (details) {
            cachedData = buildCachedData(details, cachedData)
          }
        } catch (refreshErr) {
          console.warn(`Kunne ikke hente detaljer fra Google for ${placeIdStr}:`, refreshErr)
        }
      } else if (isDetailsStale(cachedData)) {
        scheduleBackgroundRefresh(placeIdStr)
      }

      if (cachedData) {
        res.set('Cache-Control', 'public, max-age=300')
        return res.json({
          success: true,
          data: buildDetailsResponse(placeIdStr, cachedData, stedData.bildeCache),
        })
      }
    }

    // 2) Ukjent sted (ikke i noen kartinstans): Google med in-memory cache
    const cached = placeDetailsCache.get(placeIdStr)
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300')
      return res.json({ success: true, data: cached })
    }

    const details = await fetchPlaceDetailsFromGoogle(placeIdStr)

    if (!details) {
      return res.status(404).json({ success: false, error: 'Sted ikke funnet' })
    }

    const result: Record<string, unknown> = {
      placeId: placeIdStr,
      navn: details.navn,
      adresse: details.adresse,
      lat: details.lat,
      lng: details.lng,
      rating: details.rating ?? undefined,
      telefon: details.telefon ?? undefined,
      nettside: details.nettside ?? undefined,
      apningstider: details.apningstider ?? undefined,
      apenNa: computeOpenNow(details.openingPeriods) ?? undefined,
      googleMapsUrl: details.googleMapsUrl ?? undefined,
      bilder: details.photoReference
        ? [`/api/public/places/photo?ref=${encodeURIComponent(details.photoReference)}&maxwidth=400`]
        : undefined,
    }

    placeDetailsCache.set(placeIdStr, result)

    res.set('Cache-Control', 'public, max-age=300')
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Error fetching place details:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente stedsdetaljer' })
  }
})

// Batch-sjekk av åpen nå-status for steder i en kartinstans (offentlig, rate limited)
// Status beregnes lokalt fra åpningstider lagret i Firestore - ingen Google-kall
// i normal drift, uansett trafikkvolum. Beregningen skjer i sanntid ved hver
// forespørsel, så statusen er alltid fersk.
publicRouter.get('/places/open-now-batch', placesRateLimiter, async (req, res) => {
  try {
    const { slug, placeIds } = req.query

    let docs
    if (slug && typeof slug === 'string') {
      // Foretrukket: hent alle steder i kartinstansen med én Firestore-spørring
      const snapshot = await stederCollection.where('kartinstansId', '==', slug).get()
      docs = snapshot.docs
    } else if (placeIds && typeof placeIds === 'string') {
      // Bakoverkompatibilitet med eldre widget-versjoner som sender placeIds
      const ids = placeIds.split(',').filter((id) => id.trim())

      if (ids.length === 0) {
        return res.json({ success: true, data: {} })
      }
      if (ids.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'For mange steder. Maks 50 per forespørsel.',
        })
      }

      // Firestore 'in'-spørringer tar maks 30 verdier - del opp
      docs = []
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30)
        const snapshot = await stederCollection.where('placeId', 'in', chunk).get()
        docs.push(...snapshot.docs)
      }
    } else {
      return res.status(400).json({ success: false, error: 'Mangler slug- eller placeIds-parameter' })
    }

    const statusMap: Record<string, boolean | null> = {}
    const needsBackfill = new Set<string>()

    for (const doc of docs) {
      const data = doc.data()
      const placeIdValue = data.placeId as string | undefined
      if (!placeIdValue) continue // defekte dokumenter uten placeId

      const cachedData = data.cachedData as Record<string, unknown> | undefined

      if (!hasFullDetails(cachedData)) {
        // Gammelt dataformat uten åpningstider - må hentes fra Google én gang
        needsBackfill.add(placeIdValue)
        statusMap[placeIdValue] = null
      } else {
        statusMap[placeIdValue] = computeOpenNow(pickOpeningPeriods(cachedData))
        if (isDetailsStale(cachedData)) {
          scheduleBackgroundRefresh(placeIdValue)
        }
      }
    }

    // Førstegangs-backfill for steder uten lagrede åpningstider: hent synkront
    // så filteret gir riktig svar med en gang. Hvert sted backfilles maks én
    // gang (også når Google ikke svarer - da settes et negativt cache-merke i
    // refreshStedDetails), og antallet per forespørsel er begrenset. Steder
    // over grensen får status ved neste forespørsel eller via migrate:details.
    const MAX_BACKFILL_PER_REQUEST = 25
    if (needsBackfill.size > 0) {
      const toBackfill = [...needsBackfill].slice(0, MAX_BACKFILL_PER_REQUEST)
      if (needsBackfill.size > toBackfill.length) {
        console.warn(
          `open-now-batch: ${needsBackfill.size - toBackfill.length} steder over backfill-grensen, tas ved neste forespørsel`
        )
      }
      const results = await Promise.all(
        toBackfill.map(async (id) => {
          try {
            const details = await refreshStedDetails(id)
            return { id, periods: details?.currentOpeningPeriods ?? details?.openingPeriods ?? null }
          } catch {
            return { id, periods: null }
          }
        })
      )
      for (const result of results) {
        statusMap[result.id] = computeOpenNow(result.periods)
      }
    }

    // Gamle widget-versjoner forventer en nøkkel per forespurt placeId -
    // fyll inn null (ukjent) for IDer som ikke lenger finnes i Firestore
    if (!slug && placeIds && typeof placeIds === 'string') {
      for (const id of placeIds.split(',')) {
        const trimmed = id.trim()
        if (trimmed && !(trimmed in statusMap)) {
          statusMap[trimmed] = null
        }
      }
    }

    // Kort browser-cache: reduserer kall ved rask av/på-toggling av filteret
    res.set('Cache-Control', 'public, max-age=60')
    res.json({ success: true, data: statusMap })
  } catch (err) {
    console.error('Error fetching open-now batch:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente åpningsstatus' })
  }
})

// Foto-proxy: serverer Google Places-bilder uten å eksponere API-nøkkelen.
// Cache-lag: minne (L1, per instans) -> Cloud Storage (delt, overlever
// nedskalering) -> Google Photo API. Hvert unike bilde hentes dermed fra
// Google maks én gang per 30 dager, globalt.
publicRouter.get('/places/photo', placesRateLimiter, async (req, res) => {
  try {
    const { ref, maxwidth } = req.query

    if (!ref || typeof ref !== 'string') {
      return res.status(400).json({ success: false, error: 'Mangler ref-parameter' })
    }

    // Kun godkjente bredder: hindrer at vilkårlige maxwidth-verdier omgår
    // cachene og utløser ett Google-kall + ett lagringsobjekt per unike verdi
    const ALLOWED_WIDTHS = [400, 800]
    const requestedWidth = Number(maxwidth)
    const width = ALLOWED_WIDTHS.includes(requestedWidth) ? requestedWidth : 400
    const cacheKey = `${ref}_${width}`

    // L1: in-memory
    const cached = photoCache.get(cacheKey)
    if (cached) {
      res.set('Cache-Control', 'public, max-age=604800')
      res.set('Content-Type', cached.contentType)
      return res.send(cached.buffer)
    }

    // L2: Cloud Storage
    const stored = await getProxiedPhotoFromStorage(ref, width)
    if (stored) {
      photoCache.set(cacheKey, stored)
      res.set('Cache-Control', 'public, max-age=604800')
      res.set('Content-Type', stored.contentType)
      return res.send(stored.buffer)
    }

    // L3: Google Photo API (koster penger - skal være sjelden)
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_PLACES_API_KEY}`
    const response = await fetch(photoUrl)

    if (!response.ok) {
      return res.status(502).json({ success: false, error: 'Kunne ikke hente bilde' })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    photoCache.set(cacheKey, { buffer, contentType })

    // Skriv til Cloud Storage før respons sendes - Cloud Run gir ikke garantert
    // CPU etter at responsen er levert. Feil her skal ikke stoppe bildevisning.
    try {
      await saveProxiedPhotoToStorage(ref, width, buffer, contentType)
    } catch (storageErr) {
      console.warn('Kunne ikke lagre proxiet bilde i Cloud Storage:', storageErr)
    }

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
