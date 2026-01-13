import { Router } from 'express'

export const placesRouter = Router()

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

// Oslo sentrum koordinater og søkeradius
const OSLO_CENTER_LAT = 59.9139
const OSLO_CENTER_LNG = 10.7522
const OSLO_SEARCH_RADIUS = 15000 // 15 km dekker det meste av Oslo

// Text Search - begrenset til Oslo-området
placesRouter.get('/search', async (req, res) => {
  try {
    const { query } = req.query

    if (!query) {
      return res.status(400).json({ success: false, error: 'Mangler query-parameter' })
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        String(query)
      )}&location=${OSLO_CENTER_LAT},${OSLO_CENTER_LNG}&radius=${OSLO_SEARCH_RADIUS}&region=no&key=${GOOGLE_PLACES_API_KEY}`
    )

    const data = await response.json()

    // Filtrer til kun Oslo-adresser
    const osloResults = (data.results || []).filter((place: Record<string, unknown>) => {
      const address = String(place.formatted_address || '')
      return address.includes('Oslo')
    })

    const results = osloResults.map((place: Record<string, unknown>) => ({
      placeId: place.place_id,
      navn: place.name,
      adresse: place.formatted_address,
      lat: (place.geometry as { location: { lat: number; lng: number } })?.location?.lat,
      lng: (place.geometry as { location: { lat: number; lng: number } })?.location?.lng,
      rating: place.rating,
      typer: place.types,
    }))

    res.json({ success: true, data: results })
  } catch (err) {
    console.error('Error searching places:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke soke etter steder' })
  }
})

// Autocomplete - begrenset til Oslo-området
placesRouter.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query

    if (!input) {
      return res.status(400).json({ success: false, error: 'Mangler input-parameter' })
    }

    // Bruk location bias for å prioritere Oslo-området
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        String(input)
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

// Place Details
placesRouter.get('/details', async (req, res) => {
  try {
    const { placeId } = req.query

    if (!placeId) {
      return res.status(400).json({ success: false, error: 'Mangler placeId-parameter' })
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,formatted_phone_number,website,photos,rating,url&key=${GOOGLE_PLACES_API_KEY}`
    )

    const data = await response.json()
    const place = data.result

    if (!place) {
      return res.status(404).json({ success: false, error: 'Sted ikke funnet' })
    }

    const result = {
      placeId,
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
    }

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Error fetching place details:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente stedsdetaljer' })
  }
})
