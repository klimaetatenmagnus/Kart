import { Router, Response } from 'express'
import { FieldValue } from '@google-cloud/firestore'
import { stederCollection } from '../services/firestore.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { cacheStedBilde, deleteStedBilde } from '../services/imageCache.js'
import type { StedInput } from '@klimaoslo-kart/shared'

interface StederRequest extends AuthenticatedRequest {
  params: {
    slug: string;
    stedId?: string;
  };
}

interface StedIdRequest extends AuthenticatedRequest {
  params: {
    slug: string;
    stedId: string;
  };
}

export const stederRouter = Router({ mergeParams: true })

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

// Hent stedsdetaljer fra Google Places API
async function fetchPlaceDetails(placeId: string): Promise<{
  navn: string;
  adresse: string;
  lat: number;
  lng: number;
  rating?: number;
  photoReference?: string;
}> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,photos&key=${GOOGLE_PLACES_API_KEY}`
    )
    const data = await response.json()
    const place = data.result

    return {
      navn: place?.name || '',
      adresse: place?.formatted_address || '',
      lat: place?.geometry?.location?.lat || 0,
      lng: place?.geometry?.location?.lng || 0,
      rating: place?.rating,
      photoReference: place?.photos?.[0]?.photo_reference,
    }
  } catch (err) {
    console.error('Error fetching place details:', err)
    return { navn: '', adresse: '', lat: 0, lng: 0 }
  }
}

// Hent alle steder for en kartinstans
stederRouter.get('/', async (req: StederRequest, res: Response) => {
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

// Legg til sted(er)
stederRouter.post('/', async (req: StederRequest, res: Response) => {
  try {
    const { slug } = req.params
    const input: StedInput | StedInput[] = req.body
    const stederInput = Array.isArray(input) ? input : [input]

    const createdSteder: unknown[] = []
    const now = new Date()

    // Hent detaljer for alle steder parallelt
    const detailsPromises = stederInput.map(s => fetchPlaceDetails(s.placeId))
    const allDetails = await Promise.all(detailsPromises)

    const batch = stederCollection.firestore.batch()

    for (let i = 0; i < stederInput.length; i++) {
      const stedInput = stederInput[i]
      const details = allDetails[i]
      const docRef = stederCollection.doc()

      const sted: Record<string, unknown> = {
        kartinstansId: slug,
        placeId: stedInput.placeId,
        cachedData: {
          navn: details.navn,
          adresse: details.adresse,
          lat: details.lat,
          lng: details.lng,
          rating: details.rating,
          sisteOppdatering: now,
        },
        opprettet: now,
        opprettetAv: req.user?.email || 'unknown',
      }

      // Fler-kategori støtte: prioriter kategoriIder, fallback til kategoriId
      if (stedInput.kategoriIder && stedInput.kategoriIder.length > 0) {
        sted.kategoriIder = stedInput.kategoriIder
      } else if (stedInput.kategoriId) {
        // Bakoverkompatibilitet: konverter enkelt kategoriId til array
        sted.kategoriIder = [stedInput.kategoriId]
      }

      // Cache bildet hvis stedet har bilder
      if (details.photoReference) {
        try {
          const bildeCache = await cacheStedBilde(stedInput.placeId, details.photoReference)
          sted.bildeCache = bildeCache
        } catch (imageError) {
          console.warn(`Could not cache image for ${stedInput.placeId}:`, imageError)
          // Fortsett uten bilde - ikke feile hele operasjonen
        }
      }

      batch.set(docRef, sted)
      createdSteder.push({ id: docRef.id, ...sted })
    }

    await batch.commit()

    res.status(201).json({ success: true, data: createdSteder })
  } catch (err) {
    console.error('Error creating steder:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke legge til steder' })
  }
})

// Oppdater sted (f.eks. endre kategorier)
stederRouter.put('/:stedId', async (req: StedIdRequest, res: Response) => {
  try {
    const { stedId } = req.params
    const doc = await stederCollection.doc(stedId).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Sted ikke funnet' })
    }

    const { kategoriIder, kategoriId } = req.body
    const docRef = stederCollection.doc(stedId)

    // Fler-kategori støtte: prioriter kategoriIder, fallback til kategoriId
    if (kategoriIder !== undefined) {
      // Nytt format med kategoriIder array
      if (Array.isArray(kategoriIder) && kategoriIder.length > 0) {
        // Oppdater med kategoriIder og fjern gammelt kategoriId-felt
        await docRef.update({
          kategoriIder,
          kategoriId: FieldValue.delete()
        })

        const updatedData = { ...doc.data(), kategoriIder } as Record<string, unknown>
        delete updatedData.kategoriId
        res.json({ success: true, data: { id: stedId, ...updatedData } })
      } else {
        // Tom array = fjern alle kategorier
        await docRef.update({
          kategoriIder: FieldValue.delete(),
          kategoriId: FieldValue.delete()
        })

        const updatedData = { ...doc.data() }
        delete updatedData.kategoriIder
        delete updatedData.kategoriId
        res.json({ success: true, data: { id: stedId, ...updatedData } })
      }
    } else if (kategoriId !== undefined) {
      // Bakoverkompatibilitet: støtt gammelt format med kategoriId
      if (kategoriId === null || kategoriId === '') {
        // Fjern kategori
        await docRef.update({
          kategoriIder: FieldValue.delete(),
          kategoriId: FieldValue.delete()
        })

        const updatedData = { ...doc.data() }
        delete updatedData.kategoriIder
        delete updatedData.kategoriId
        res.json({ success: true, data: { id: stedId, ...updatedData } })
      } else {
        // Konverter til kategoriIder array
        await docRef.update({
          kategoriIder: [kategoriId],
          kategoriId: FieldValue.delete()
        })

        const updatedData = { ...doc.data(), kategoriIder: [kategoriId] } as Record<string, unknown>
        delete updatedData.kategoriId
        res.json({ success: true, data: { id: stedId, ...updatedData } })
      }
    } else {
      // Ingen kategorier sendt - ingenting å oppdatere
      res.json({ success: true, data: { id: stedId, ...doc.data() } })
    }
  } catch (err) {
    console.error('Error updating sted:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke oppdatere sted' })
  }
})

// Fjern sted
stederRouter.delete('/:stedId', async (req: StedIdRequest, res: Response) => {
  try {
    const { stedId } = req.params
    const doc = await stederCollection.doc(stedId).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Sted ikke funnet' })
    }

    const stedData = doc.data()

    // Slett cachet bilde fra Cloud Storage
    if (stedData?.placeId) {
      try {
        await deleteStedBilde(stedData.placeId)
      } catch (imageError) {
        console.warn(`Could not delete cached image for ${stedData.placeId}:`, imageError)
        // Fortsett med sletting av sted selv om bildesletting feiler
      }
    }

    await stederCollection.doc(stedId).delete()

    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting sted:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke slette sted' })
  }
})
