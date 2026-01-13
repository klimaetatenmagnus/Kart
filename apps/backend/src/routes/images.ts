import { Router, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { cacheStedBilde, deleteStedBilde, getPhotoReference } from '../services/imageCache.js'

export const imagesRouter = Router()

interface ImageCacheRequest extends AuthenticatedRequest {
  body: {
    placeId: string
    photoReference?: string
  }
}

interface ImageDeleteRequest extends AuthenticatedRequest {
  params: {
    placeId: string
  }
}

// POST /api/images/cache - Cache bilde for et sted
imagesRouter.post('/cache', async (req: ImageCacheRequest, res: Response) => {
  try {
    const { placeId, photoReference } = req.body

    if (!placeId) {
      return res.status(400).json({ success: false, error: 'Mangler placeId' })
    }

    // Hent photoReference fra Google Places hvis ikke oppgitt
    let reference = photoReference
    if (!reference) {
      reference = await getPhotoReference(placeId) || undefined
      if (!reference) {
        return res.status(404).json({ success: false, error: 'Ingen bilder funnet for dette stedet' })
      }
    }

    const result = await cacheStedBilde(placeId, reference)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Error caching image:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke cache bilde' })
  }
})

// DELETE /api/images/:placeId - Slett cachet bilde
imagesRouter.delete('/:placeId', async (req: ImageDeleteRequest, res: Response) => {
  try {
    const { placeId } = req.params

    if (!placeId) {
      return res.status(400).json({ success: false, error: 'Mangler placeId' })
    }

    await deleteStedBilde(placeId)
    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting cached image:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke slette cachet bilde' })
  }
})
