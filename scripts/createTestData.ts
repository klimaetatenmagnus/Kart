/**
 * Script for å opprette testdata i Firestore
 * Kjør med: npx tsx scripts/createTestData.ts
 */

import { Firestore } from '@google-cloud/firestore'

const db = new Firestore({
  projectId: 'bruktbutikk-navn',
})

async function createTestData() {
  console.log('Oppretter testdata...\n')

  // 1. Opprett kartinstans "gjenbrukskartet"
  const kartinstansRef = db.collection('kartinstanser').doc('gjenbrukskartet')

  await kartinstansRef.set({
    navn: 'Gjenbrukskartet',
    beskrivelse: 'Finn gjenbruksbutikker, loppemarkeder og reparasjonstjenester i Oslo',
    aktiv: true,
    opprettet: new Date(),
    senter: {
      lat: 59.9139,
      lng: 10.7522,
    },
    zoom: 12,
    kategorier: [
      { id: 'gjenbruk', navn: 'Gjenbruksbutikker', farge: '#4CAF50', ikon: 'recycling' },
      { id: 'loppemarked', navn: 'Loppemarkeder', farge: '#FF9800', ikon: 'store' },
      { id: 'reparasjon', navn: 'Reparasjonstjenester', farge: '#2196F3', ikon: 'build' },
    ],
  })
  console.log('✓ Kartinstans "gjenbrukskartet" opprettet')

  // 2. Opprett noen teststeder
  const steder = [
    {
      kartinstansId: 'gjenbrukskartet',
      placeId: 'test-fretex-gronland',
      kategoriId: 'gjenbruk',
      cachedData: {
        navn: 'Fretex Grønland',
        adresse: 'Grønlandsleiret 44, 0190 Oslo',
        lat: 59.9127,
        lng: 10.7614,
        rating: 4.2,
        sisteOppdatering: new Date(),
      },
      opprettet: new Date(),
      opprettetAv: 'test@klimaoslo.no',
    },
    {
      kartinstansId: 'gjenbrukskartet',
      placeId: 'test-uff-majorstuen',
      kategoriId: 'gjenbruk',
      cachedData: {
        navn: 'UFF Majorstuen',
        adresse: 'Bogstadveien 27, 0366 Oslo',
        lat: 59.9289,
        lng: 10.7128,
        rating: 4.0,
        sisteOppdatering: new Date(),
      },
      opprettet: new Date(),
      opprettetAv: 'test@klimaoslo.no',
    },
    {
      kartinstansId: 'gjenbrukskartet',
      placeId: 'test-loppis-toyen',
      kategoriId: 'loppemarked',
      cachedData: {
        navn: 'Tøyen Loppemarked',
        adresse: 'Tøyengata 2, 0190 Oslo',
        lat: 59.9142,
        lng: 10.7721,
        rating: 4.5,
        sisteOppdatering: new Date(),
      },
      opprettet: new Date(),
      opprettetAv: 'test@klimaoslo.no',
    },
    {
      kartinstansId: 'gjenbrukskartet',
      placeId: 'test-sykkelverksted',
      kategoriId: 'reparasjon',
      cachedData: {
        navn: 'Oslo Sykkelverksted',
        adresse: 'Markveien 56, 0550 Oslo',
        lat: 59.9225,
        lng: 10.7585,
        rating: 4.7,
        sisteOppdatering: new Date(),
      },
      opprettet: new Date(),
      opprettetAv: 'test@klimaoslo.no',
    },
  ]

  for (const sted of steder) {
    await db.collection('steder').add(sted)
    console.log(`✓ Sted "${sted.cachedData.navn}" opprettet`)
  }

  console.log('\n=== Testdata opprettet! ===')
  console.log('\nDu kan nå teste:')
  console.log('- Widget: https://klimaoslo-kart-widget-412468299057.europe-west1.run.app/gjenbrukskartet')
  console.log('- Admin: https://klimaoslo-kart-admin-412468299057.europe-west1.run.app')
}

createTestData()
  .then(() => {
    console.log('\nFerdig!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Feil:', error)
    process.exit(1)
  })
