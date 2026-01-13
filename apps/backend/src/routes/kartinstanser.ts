import { Router } from 'express'
import { kartinstanserCollection } from '../services/firestore.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import type { KartinstansInput, Kategori } from '@klimaoslo-kart/shared'

export const kartinstanserRouter = Router()

// Hent alle kartinstanser
kartinstanserRouter.get('/', async (_req, res) => {
  try {
    const snapshot = await kartinstanserCollection.get()
    const kartinstanser = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json({ success: true, data: kartinstanser })
  } catch (err) {
    console.error('Error fetching kartinstanser:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke hente kartinstanser' })
  }
})

// Hent en kartinstans
kartinstanserRouter.get('/:slug', async (req, res) => {
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

// Opprett ny kartinstans
kartinstanserRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const input: KartinstansInput = req.body

    // Generer slug fra navn (håndterer norske tegn)
    const slug = input.navn
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Valider at slug ikke er tom
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Kartnavnet må inneholde minst ett bokstav eller tall' })
    }

    // Sjekk at slug ikke finnes
    const existing = await kartinstanserCollection.doc(slug).get()
    if (existing.exists) {
      return res.status(400).json({ success: false, error: 'Kartinstans med dette navnet finnes allerede' })
    }

    // Legg til ID-er pa kategorier hvis de mangler
    const kategorierMedId: Kategori[] = input.kategorier.map((kat, index) => ({
      ...kat,
      id: kat.id || `kategori-${index}`,
    }))

    const now = new Date()
    const kartinstans = {
      navn: input.navn,
      beskrivelse: input.beskrivelse,
      config: input.config,
      kategorier: kategorierMedId,
      opprettet: now,
      sisteEndret: now,
      opprettetAv: req.user?.email || 'unknown',
    }

    await kartinstanserCollection.doc(slug).set(kartinstans)

    res.status(201).json({
      success: true,
      data: { id: slug, ...kartinstans },
    })
  } catch (err) {
    console.error('Error creating kartinstans:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke opprette kartinstans' })
  }
})

// Oppdater kartinstans
kartinstanserRouter.put('/:slug', async (req: AuthenticatedRequest, res) => {
  try {
    const doc = await kartinstanserCollection.doc(req.params.slug).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Kartinstans ikke funnet' })
    }

    const input: KartinstansInput = req.body

    const updates = {
      navn: input.navn,
      beskrivelse: input.beskrivelse,
      config: input.config,
      kategorier: input.kategorier,
      sisteEndret: new Date(),
    }

    await kartinstanserCollection.doc(req.params.slug).update(updates)

    res.json({
      success: true,
      data: { id: req.params.slug, ...doc.data(), ...updates },
    })
  } catch (err) {
    console.error('Error updating kartinstans:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke oppdatere kartinstans' })
  }
})

// Slett kartinstans
kartinstanserRouter.delete('/:slug', async (req, res) => {
  try {
    const doc = await kartinstanserCollection.doc(req.params.slug).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Kartinstans ikke funnet' })
    }

    await kartinstanserCollection.doc(req.params.slug).delete()

    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting kartinstans:', err)
    res.status(500).json({ success: false, error: 'Kunne ikke slette kartinstans' })
  }
})
