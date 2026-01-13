const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');

const db = new Firestore();
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'klimaoslo-kart-bilder';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

exports.refreshExpiredImages = async (req, res) => {
  const now = new Date();

  try {
    // Hent alle steder med utlopt bildecache
    const expiredSteder = await db
      .collection('steder')
      .where('bildeCache.utloper', '<=', now)
      .get();

    console.log(`Found ${expiredSteder.size} places with expired cache`);

    const results = { updated: 0, failed: 0, errors: [] };

    for (const doc of expiredSteder.docs) {
      const sted = doc.data();

      // Hopp over hvis ingen bildecache
      if (!sted.bildeCache?.originalPhotoReference) {
        console.log(`Skipping ${sted.placeId} - no photo reference`);
        continue;
      }

      try {
        // Hent nytt bilde fra Google Places
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${sted.bildeCache.originalPhotoReference}&key=${GOOGLE_PLACES_API_KEY}`;

        const response = await fetch(photoUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Last opp til Cloud Storage
        const filePath = `steder/${sted.placeId}/bilde.jpg`;
        await storage.bucket(BUCKET_NAME).file(filePath).save(buffer, {
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=2592000'
          }
        });

        // Oppdater Firestore
        const utloper = new Date();
        utloper.setDate(utloper.getDate() + 30);

        await doc.ref.update({
          'bildeCache.cachetTidspunkt': now,
          'bildeCache.utloper': utloper
        });

        results.updated++;
        console.log(`Updated image for ${sted.placeId}`);
      } catch (error) {
        results.failed++;
        results.errors.push(`${sted.placeId}: ${error.message}`);
        console.error(`Failed to update ${sted.placeId}:`, error.message);
      }

      // Rate limiting - vent 200ms mellom kall for a unnga API-begrensninger
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('Refresh completed:', results);
    res.json(results);
  } catch (error) {
    console.error('Refresh failed:', error);
    res.status(500).json({ error: error.message });
  }
};
