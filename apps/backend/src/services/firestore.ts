import { Firestore } from '@google-cloud/firestore'

// Initialiser Firestore
// I Cloud Run vil dette automatisk bruke service account credentials
// Lokalt kan du sette GOOGLE_APPLICATION_CREDENTIALS miljovariabel
export const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID || 'klimaoslo-kart',
})

// Collection-referanser
export const kartinstanserCollection = db.collection('kartinstanser')
export const stederCollection = db.collection('steder')
export const brukereCollection = db.collection('brukere')
export const tipsCollection = db.collection('tips')
