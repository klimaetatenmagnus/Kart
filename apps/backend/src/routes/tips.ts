import { Router } from 'express'
import { tipsCollection } from '../services/firestore.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import type { TipsStatus } from '@klimaoslo-kart/shared'

export const tipsRouter = Router()

// Hent alle tips
tipsRouter.get('/', async (_req, res) => {
  try {
    const snapshot = await tipsCollection
      .orderBy('opprettet', 'desc')
      .get()

    const tips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json({ success: true, data: tips })
  } catch (err) {
    console.error('Error fetching tips:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente tips' })
  }
})

// Behandle tips (godkjenn/avvis)
tipsRouter.put('/:tipId', async (req: AuthenticatedRequest, res) => {
  try {
    const { tipId } = req.params
    const { status } = req.body as { status: TipsStatus }

    const doc = await tipsCollection.doc(tipId).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Tips ikke funnet' })
    }

    const updates = {
      status,
      behandletAv: req.user?.email,
    }

    await tipsCollection.doc(tipId).update(updates)

    res.json({ success: true, data: { id: tipId, ...doc.data(), ...updates } })
  } catch (err) {
    console.error('Error updating tips:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke oppdatere tips' })
  }
})
