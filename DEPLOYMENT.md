# KlimaOslo Kartplattform - Deployment til Google Cloud

## Innholdsfortegnelse
1. [Sammendrag](#sammendrag)
2. [Fremdriftsstatus](#fremdriftsstatus)
3. [Forutsetninger](#forutsetninger)
4. [Fase 1: GCP-prosjekt og infrastruktur](#fase-1-gcp-prosjekt-og-infrastruktur)
5. [Fase 2: Secret Manager](#fase-2-secret-manager)
6. [Fase 3: Cloud Storage (Bildecache)](#fase-3-cloud-storage-bildecache)
7. [Fase 3b: Backend bildecache-implementasjon](#fase-3b-backend-bildecache-implementasjon)
8. [Fase 4: Dockerfiler og build-konfigurasjon](#fase-4-dockerfiler-og-build-konfigurasjon)
9. [Fase 5: Cloud Run deployment](#fase-5-cloud-run-deployment)
10. [Fase 6: Cloud Scheduler og Functions](#fase-6-cloud-scheduler-og-functions)
11. [Fase 7: Domene og SSL](#fase-7-domene-og-ssl)
12. [Fase 8: CI/CD med Cloud Build](#fase-8-cicd-med-cloud-build)
13. [Fase 9: Azure AD for produksjon](#fase-9-azure-ad-for-produksjon)
14. [Fase 10: Verifisering og lansering](#fase-10-verifisering-og-lansering)
15. [Neste steg](#neste-steg)
16. [Vedlegg](#vedlegg)

---

## Sammendrag

Dette dokumentet beskriver steg-for-steg deployment av KlimaOslo Kartplattform til Google Cloud Platform. Plattformen består av tre komponenter:

| Komponent | Teknologi | Cloud Run-tjeneste |
|-----------|-----------|-------------------|
| **Backend API** | Node.js/Express | `klimaoslo-kart-api` |
| **Admin-app** | React/Vite | `klimaoslo-kart-admin` |
| **Kartwidget** | React/Vite | `klimaoslo-kart-widget` |

**GCP-prosjekt:** `bruktbutikk-navn` (ID: 412468299057)
**Region:** `europe-west1` (Belgium)
**Estimert kostnad:** ~$20-55/måned

---

## ⚠️ VIKTIG: Dev-modus er aktivert

**Dev-modus er midlertidig aktivert for testing.** Dette gjør at admin-verktøyet kan brukes uten Azure AD-innlogging.

### Hva er aktivert:
- **Backend:** `DEV_MODE=true` - API-et aksepterer alle forespørsler uten token-validering
- **Admin:** `VITE_SKIP_AUTH=true` - Hopper over Azure AD-innlogging

### Før produksjon MÅ du:
1. Konfigurere Azure AD (se Fase 9)
2. Fjerne `DEV_MODE` fra backend:
   ```bash
   gcloud run services update klimaoslo-kart-api --region=europe-west1 --remove-env-vars="DEV_MODE"
   ```
3. Bygge admin på nytt UTEN `VITE_SKIP_AUTH`:
   ```bash
   docker build -f apps/admin/Dockerfile \
     --build-arg VITE_API_URL=https://api.kart.klimaoslo.no \
     --build-arg VITE_AZURE_CLIENT_ID=din-client-id \
     --build-arg VITE_AZURE_TENANT_ID=din-tenant-id \
     -t europe-west1-docker.pkg.dev/bruktbutikk-navn/klimaoslo-kart/admin:latest .
   ```

---

## Fremdriftsstatus

### Oversikt
```
Fase 1:  GCP infrastruktur      [##########] 100% - FULLFORT
Fase 2:  Secret Manager         [##########] 100% - FULLFORT
Fase 3:  Cloud Storage          [##########] 100% - FULLFORT
Fase 3b: Bildecache-impl.       [##########] 100% - FULLFORT
Fase 4:  Dockerfiler            [##########] 100% - FULLFORT
Fase 5:  Cloud Run              [##########] 100% - FULLFORT - Alle tjenester deployet!
Fase 6:  Scheduler/Functions    [#####     ] 50%  - Kode opprettet, deployment gjenstår
Fase 7:  Domene og SSL          [          ] 0%   - Krever DNS-tilgang
Fase 8:  CI/CD                  [#####     ] 50%  - cloudbuild.yaml opprettet, trigger gjenstår
Fase 9:  Azure AD               [          ] 0%   - Krever Azure-tilgang
Fase 10: Verifisering           [######    ] 60%  - Widget og Admin testet, migrering gjenstår
```

### Detaljert fremdriftslogg

| Dato | Aktivitet | Status | Notater |
|------|-----------|--------|---------|
| 2026-01-11 | Deployment-plan opprettet | Fullfort | Dette dokumentet |
| 2026-01-11 | Fase 3b.1: BildeCache types | Fullfort | packages/shared/src/types.ts oppdatert |
| 2026-01-11 | Fase 3b.5: @google-cloud/storage | Fullfort | Installert i backend |
| 2026-01-11 | Fase 3b.2: imageCache service | Fullfort | apps/backend/src/services/imageCache.ts |
| 2026-01-11 | Fase 3b.3: steder-ruter oppdatert | Fullfort | Bildecaching ved opprettelse/sletting |
| 2026-01-11 | Fase 3b.4: images API-ruter | Fullfort | apps/backend/src/routes/images.ts |
| 2026-01-11 | Fase 3b.6: Widget oppdatert | Fullfort | InfoWindowContent bruker bildeCache |
| 2026-01-11 | Fase 4.1: Backend Dockerfile | Fullfort | apps/backend/Dockerfile |
| 2026-01-11 | Fase 4.2-4.3: Admin Dockerfile | Fullfort | apps/admin/Dockerfile + nginx.conf |
| 2026-01-11 | Fase 4.4-4.5: Widget Dockerfile | Fullfort | apps/widget/Dockerfile + nginx.conf |
| 2026-01-11 | Fase 6.1: Cloud Function | Fullfort | functions/refresh-images/ |
| 2026-01-11 | Fase 8.1: cloudbuild.yaml | Fullfort | cloudbuild.yaml i root |
| 2026-01-11 | Fase 10.4: Migreringsskript | Fullfort | scripts/migrateExistingImages.ts |
| 2026-01-11 | Fase 1.2: GCP API-er aktivert | Fullfort | run, artifactregistry, cloudbuild, etc. |
| 2026-01-11 | Fase 1.3: Artifact Registry | Fullfort | klimaoslo-kart repository |
| 2026-01-11 | Fase 1.4: Service accounts | Fullfort | runner + scheduler |
| 2026-01-11 | Fase 2.1: Secrets opprettet | Fullfort | google-places-api-key, google-maps-api-key |
| 2026-01-11 | Fase 3.1-3.3: Cloud Storage | Fullfort | klimaoslo-kart-bilder bucket med CORS |
| 2026-01-11 | Fase 5.1: Docker images bygget | Fullfort | amd64 platform, pushet til Artifact Registry |
| 2026-01-11 | Fase 5.2: Backend deployet | Fullfort | https://klimaoslo-kart-api-412468299057.europe-west1.run.app |
| 2026-01-11 | Fase 5.3: Admin deployet | Fullfort | https://klimaoslo-kart-admin-412468299057.europe-west1.run.app |
| 2026-01-11 | Fase 5.4: Widget deployet | Fullfort | https://klimaoslo-kart-widget-412468299057.europe-west1.run.app |
| 2026-01-11 | Dev-modus implementert | Fullfort | VITE_SKIP_AUTH + DEV_MODE for testing uten Azure AD |
| 2026-01-11 | Testdata opprettet | Fullfort | Kartinstans "gjenbrukskartet" med 4 teststeder |
| 2026-01-11 | Widget API URL fikset | Fullfort | Bruker VITE_API_URL for alle fetch-kall |
| 2026-01-11 | Admin API URL fikset | Fullfort | Opprettet apiFetch helper, alle komponenter oppdatert |
| 2026-01-11 | Oslo-filter for søk | Fullfort | Autocomplete begrenset til Oslo-området |
| 2026-01-11 | Forhåndsvisning URL fikset | Fullfort | Bruker Cloud Run widget-URL i dev-modus |
| 2026-01-13 | **API-sikkerhet (Fase 2b)** | Fullført | Separerte API-nøkler for frontend/backend |
| 2026-01-13 | Backend Places API-nøkkel | Fullført | Ny nøkkel i Secret Manager (v2) |
| 2026-01-13 | Frontend HTTP referrers | Fullført | Begrenset til godkjente domener |
| 2026-01-13 | Rate limiting | Fullført | 30 req/min (places), 5 req/min (tips) |
| 2026-01-13 | .gitignore opprettet | Fullført | Beskytter .env-filer |
| 2026-01-13 | **InfoWindow via backend API** | Fullført | Widget henter detaljer fra backend i stedet for frontend Places SDK |
| 2026-01-13 | `/api/public/places/details` utvidet | Fullført | Inkluderer nå telefon, nettside, åpningstider, bilder |
| 2026-01-13 | Bilde-URL generering | Fullført | Backend genererer Google Places Photo URL-er |
| | | | |

---

## Forutsetninger

### Allerede fullfort
- [x] GCP-prosjekt opprettet (`bruktbutikk-navn`)
- [x] Firestore database konfigurert (europe-west1, native mode)
- [x] Google Maps Platform API-er aktivert
- [x] Google Places API aktivert og testet
- [x] Lokal utvikling fungerer (backend, admin, widget)
- [x] npm workspaces monorepo-struktur
- [x] Node.js 20.x

### Trenger tilgang/avklaring
- [ ] Tilgang til kart.klimaoslo.no DNS-administrasjon
- [ ] Azure AD app-registrering for Oslo kommune
- [ ] Bekreftelse av GCP billing-konto

### Nodvendige verktoy
```bash
# Google Cloud CLI
brew install google-cloud-sdk

# Docker (for lokal testing av containere)
brew install --cask docker

# Verifiser installasjon
gcloud version
docker --version
```

---

## Fase 1: GCP-prosjekt og infrastruktur

### 1.1 Autentiser gcloud CLI

```bash
# Logg inn
gcloud auth login

# Sett prosjekt
gcloud config set project bruktbutikk-navn

# Verifiser
gcloud config list
```

**Status:** [x] Fullfort

### 1.2 Aktiver nodvendige API-er

```bash
# Cloud Run
gcloud services enable run.googleapis.com

# Artifact Registry (for Docker images)
gcloud services enable artifactregistry.googleapis.com

# Cloud Build
gcloud services enable cloudbuild.googleapis.com

# Cloud Storage
gcloud services enable storage.googleapis.com

# Cloud Scheduler
gcloud services enable cloudscheduler.googleapis.com

# Cloud Functions
gcloud services enable cloudfunctions.googleapis.com

# Secret Manager
gcloud services enable secretmanager.googleapis.com

# Compute Engine (nodvendig for Cloud Run)
gcloud services enable compute.googleapis.com

# Verifiser aktiverte API-er
gcloud services list --enabled
```

**Status:** [x] Fullfort

### 1.3 Opprett Artifact Registry repository

```bash
# Opprett repository for Docker images
gcloud artifacts repositories create klimaoslo-kart \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker images for KlimaOslo Kartplattform"

# Konfigurer Docker autentisering
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

**Status:** [x] Fullfort

### 1.4 Opprett service accounts

```bash
# Service account for Cloud Run
gcloud iam service-accounts create klimaoslo-kart-runner \
  --display-name="KlimaOslo Kart Cloud Run Runner"

# Service account for Cloud Scheduler
gcloud iam service-accounts create klimaoslo-kart-scheduler \
  --display-name="KlimaOslo Kart Cloud Scheduler"

# Gi roller til runner-kontoen
gcloud projects add-iam-policy-binding bruktbutikk-navn \
  --member="serviceAccount:klimaoslo-kart-runner@bruktbutikk-navn.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding bruktbutikk-navn \
  --member="serviceAccount:klimaoslo-kart-runner@bruktbutikk-navn.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding bruktbutikk-navn \
  --member="serviceAccount:klimaoslo-kart-runner@bruktbutikk-navn.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Status:** [x] Fullfort

---

## Fase 2: Secret Manager

### 2.1 Opprett secrets

```bash
# Google Places API-nokkel
echo -n "DIN_GOOGLE_PLACES_API_KEY" | gcloud secrets create google-places-api-key \
  --replication-policy="user-managed" \
  --locations="europe-west1" \
  --data-file=-

# Google Maps API-nokkel (for frontend)
echo -n "DIN_GOOGLE_MAPS_API_KEY" | gcloud secrets create google-maps-api-key \
  --replication-policy="user-managed" \
  --locations="europe-west1" \
  --data-file=-

# Azure AD Client Secret (for admin-autentisering)
echo -n "DIN_AZURE_AD_CLIENT_SECRET" | gcloud secrets create azure-ad-client-secret \
  --replication-policy="user-managed" \
  --locations="europe-west1" \
  --data-file=-
```

**Status:** [x] Fullfort (google-places-api-key og google-maps-api-key)

### 2.2 Verifiser secrets

```bash
# List secrets
gcloud secrets list

# Sjekk versjoner
gcloud secrets versions list google-places-api-key
```

**Status:** [x] Fullført

---

## Fase 2b: API-nøkkelsikkerhet

**Implementert 2026-01-13**

Vi bruker separate API-nøkler for frontend og backend for å minimere risiko ved eksponering.

### 2b.1 Nøkkeloversikt

| Nøkkel | Navn i GCP | Bruk | Restriksjoner |
|--------|------------|------|---------------|
| Frontend | `Frontend Maps JavaScript API Key` | Widget (Maps JS) | HTTP referrers + kun Maps API |
| Backend | `Backend Places API Key` | Server (Places API) | Kun Places API, ingen referrer |

### 2b.2 Frontend-nøkkel (eksponert i browser)

Denne nøkkelen er synlig i JavaScript-bundlen, men er sikret med:

**HTTP Referrer-restriksjoner:**
- `https://kart.klimaoslo.no/*`
- `https://admin.kart.klimaoslo.no/*`
- `https://klimaoslo-kart-widget-412468299057.europe-west1.run.app/*`
- `https://klimaoslo-kart-admin-412468299057.europe-west1.run.app/*`
- `http://localhost:3000/*` (dev)
- `http://localhost:3001/*` (dev)

**API-restriksjoner:**
- Kun `Maps JavaScript API` (maps-backend.googleapis.com)

### 2b.3 Backend-nøkkel (kun på server)

Lagret i Secret Manager, aldri eksponert til klient:

**API-restriksjoner:**
- `Places API` (places.googleapis.com)
- `Places API (New)` (places-backend.googleapis.com)

### 2b.4 Rate limiting

Offentlige API-endepunkter har rate limiting for å beskytte mot misbruk:

| Endepunkt | Grense | Vindu |
|-----------|--------|-------|
| `/api/public/places/autocomplete` | 30 req | 1 min per IP |
| `/api/public/places/details` | 30 req | 1 min per IP |
| `/api/public/tips` | 5 req | 1 min per IP |

Implementert i `apps/backend/src/routes/public.ts` med `express-rate-limit`.

### 2b.5 Stedsdetaljer via backend API

**Implementert 2026-01-13**

Widget bruker nå backend API for å hente stedsdetaljer i InfoWindow, i stedet for frontend Places SDK. Dette sikrer at backend API-nøkkelen brukes for alle Places API-kall.

**Flyten:**
1. Bruker klikker på markør i kartet
2. Widget viser cached data umiddelbart (navn, adresse)
3. Widget kaller `GET /api/public/places/details?placeId=xxx`
4. Backend henter utvidede detaljer fra Google Places API
5. Backend returnerer: navn, adresse, telefon, nettside, åpningstider, bilder, Google Maps URL
6. Widget oppdaterer InfoWindow med fullstendige detaljer

**Fordeler:**
- Backend API-nøkkel brukes (ikke eksponert i browser)
- Rate limiting beskytter mot misbruk
- Bildene genereres som URL-er fra backend (Photo API)
- `bildeCache` (Cloud Storage) brukes primært hvis tilgjengelig

**Endrede filer:**
- `apps/backend/src/routes/public.ts` - Utvidet `/places/details` med alle felt
- `apps/widget/src/components/MapView.tsx` - Bruker backend API i stedet for Places SDK

### 2b.6 Administrere nøkler

```bash
# List alle nøkler
gcloud services api-keys list

# Se detaljer for en nøkkel
gcloud services api-keys describe projects/412468299057/locations/global/keys/NØKKEL-ID

# Oppdater referrer-restriksjoner
gcloud services api-keys update projects/412468299057/locations/global/keys/NØKKEL-ID \
  --allowed-referrers="https://kart.klimaoslo.no/*,https://admin.kart.klimaoslo.no/*"

# Rotere backend-nøkkel (opprett ny, oppdater secret, slett gammel)
gcloud services api-keys create --display-name="Backend Places API Key v2" \
  --api-target=service=places.googleapis.com
echo -n "NY_NØKKEL" | gcloud secrets versions add google-places-api-key --data-file=-
gcloud run services update klimaoslo-kart-api --region=europe-west1 --update-env-vars="DEPLOY_TIME=$(date +%s)"
```

**Status:** [x] Fullført

---

## Fase 3: Cloud Storage (Bildecache)

### 3.1 Opprett bucket

```bash
# Opprett bucket for bildecache
gsutil mb -l europe-west1 -b on gs://klimaoslo-kart-bilder

# Sett uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://klimaoslo-kart-bilder
```

**Status:** [ ] Ikke startet

### 3.2 Konfigurer offentlig lesetilgang

```bash
# Gi offentlig lesetilgang (for widget)
gsutil iam ch allUsers:objectViewer gs://klimaoslo-kart-bilder
```

**Status:** [ ] Ikke startet

### 3.3 Sett CORS-policy

Opprett fil `cors.json` (må matche arkitekturplan):

```json
[
  {
    "origin": [
      "https://kart.klimaoslo.no",
      "https://admin.kart.klimaoslo.no",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

**Merk:** Konfigurasjonen er hentet fra ARKITEKTURPLAN.md og sikrer at widgeten kan laste bilder fra Cloud Storage.

```bash
# Appliser CORS-konfigurasjon
gsutil cors set cors.json gs://klimaoslo-kart-bilder

# Verifiser
gsutil cors get gs://klimaoslo-kart-bilder
```

**Status:** [ ] Ikke startet

### 3.4 Sett lifecycle-policy (valgfritt)

```bash
# Opprett lifecycle.json for automatisk sletting av gamle bilder
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 365,
        "matchesPrefix": ["steder/"]
      }
    }
  ]
}
EOF

gsutil lifecycle set lifecycle.json gs://klimaoslo-kart-bilder
```

**Status:** [ ] Ikke startet

---

## Fase 3b: Backend bildecache-implementasjon

Denne fasen implementerer bildecaching-logikken i backend før Docker-bygg.

### 3b.1 Oppdater shared types

Oppdater `packages/shared/src/types.ts` med bildeCache-typer:

```typescript
// Legg til i types.ts
export interface BildeCache {
  url: string;                        // Cloud Storage public URL
  cachetTidspunkt: Date;              // Når bildet ble cachet
  utloper: Date;                      // cachetTidspunkt + 30 dager
  originalPhotoReference: string;     // Google Places photo_reference for oppdatering
  bredde: number;                     // Lagret bildebredde (standard: 400)
  hoyde: number;                      // Lagret bildehøyde (standard: 300)
}

// Oppdater Sted-interface
export interface Sted {
  id: string;
  kartinstansId: string;
  placeId: string;
  kategoriId: string;
  cachedData: {
    navn: string;
    adresse: string;
    lat: number;
    lng: number;
    rating?: number;
    sisteOppdatering: Date;
  };
  bildeCache?: BildeCache;            // NY: Bildecache-data
  opprettet: Date;
  opprettetAv: string;
}
```

**Status:** [x] Fullfort

### 3b.2 Opprett imageCache service

Opprett `apps/backend/src/services/imageCache.ts`:

```typescript
import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';

const storage = new Storage();
const BUCKET_NAME = 'klimaoslo-kart-bilder';
const CACHE_DURATION_DAYS = 30;

interface ImageCacheResult {
  url: string;
  cachetTidspunkt: Date;
  utloper: Date;
  originalPhotoReference: string;
  bredde: number;
  hoyde: number;
}

export async function cacheStedBilde(
  placeId: string,
  photoReference: string,
  maxWidth: number = 400
): Promise<ImageCacheResult> {
  // 1. Hent bildet fra Google Places Photo API
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${response.statusText}`);
  }

  const imageBuffer = await response.buffer();

  // 2. Last opp til Cloud Storage
  const bucket = storage.bucket(BUCKET_NAME);
  const filePath = `steder/${placeId}/bilde.jpg`;
  const file = bucket.file(filePath);

  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=2592000', // 30 dager
    },
  });

  // 3. Generer offentlig URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;

  // 4. Beregn utløpstidspunkt
  const now = new Date();
  const utloper = new Date(now);
  utloper.setDate(utloper.getDate() + CACHE_DURATION_DAYS);

  return {
    url: publicUrl,
    cachetTidspunkt: now,
    utloper,
    originalPhotoReference: photoReference,
    bredde: maxWidth,
    hoyde: Math.round(maxWidth * 0.75), // Estimert aspect ratio
  };
}

export async function deleteStedBilde(placeId: string): Promise<void> {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(`steder/${placeId}/bilde.jpg`);

  try {
    await file.delete();
  } catch (error) {
    console.warn(`Could not delete image for ${placeId}:`, error);
  }
}
```

**Status:** [x] Fullfort

### 3b.3 Oppdater steder-ruter

Oppdater `apps/backend/src/routes/steder.ts` til å cache bilder ved opprettelse og slette ved fjerning:

```typescript
import { cacheStedBilde, deleteStedBilde } from '../services/imageCache';

// POST - Legg til sted (oppdatert)
router.post('/:slug/steder', authMiddleware, async (req, res) => {
  const { slug } = req.params;
  const { placeId, kategoriId } = req.body;

  try {
    const placeDetails = await getPlaceDetails(placeId);

    // Cache bildet hvis stedet har bilder
    let bildeCache = null;
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photoReference = placeDetails.photos[0].photo_reference;
      bildeCache = await cacheStedBilde(placeId, photoReference);
    }

    const stedData = {
      kartinstansId: slug,
      placeId,
      kategoriId,
      cachedData: {
        navn: placeDetails.name,
        adresse: placeDetails.formatted_address,
        lat: placeDetails.geometry.location.lat,
        lng: placeDetails.geometry.location.lng,
        rating: placeDetails.rating,
        sisteOppdatering: new Date(),
      },
      bildeCache,  // Bildecache-data
      opprettet: new Date(),
      opprettetAv: req.user.email,
    };

    const docRef = await db.collection('steder').add(stedData);
    res.status(201).json({ id: docRef.id, ...stedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Fjern sted (oppdatert)
router.delete('/:slug/steder/:stedId', authMiddleware, async (req, res) => {
  const { stedId } = req.params;

  try {
    const stedDoc = await db.collection('steder').doc(stedId).get();
    if (stedDoc.exists) {
      const stedData = stedDoc.data();

      // Slett cachet bilde fra Cloud Storage
      await deleteStedBilde(stedData.placeId);

      // Slett sted fra Firestore
      await db.collection('steder').doc(stedId).delete();
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Status:** [x] Fullfort

### 3b.4 Legg til bildecache API-endepunkter

Legg til i `apps/backend/src/routes/images.ts`:

```typescript
import express from 'express';
import { cacheStedBilde, deleteStedBilde } from '../services/imageCache';

const router = express.Router();

// POST /api/images/cache - Cache bilde for et sted
router.post('/cache', authMiddleware, async (req, res) => {
  const { placeId, photoReference } = req.body;

  try {
    const result = await cacheStedBilde(placeId, photoReference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/images/refresh-expired - Oppdater utløpte bilder (brukes av Cloud Scheduler)
router.get('/refresh-expired', async (req, res) => {
  // Implementert i Cloud Function - se Fase 6
  res.status(501).json({ message: 'Use Cloud Function endpoint' });
});

// DELETE /api/images/:placeId - Slett cachet bilde
router.delete('/:placeId', authMiddleware, async (req, res) => {
  const { placeId } = req.params;

  try {
    await deleteStedBilde(placeId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Status:** [x] Fullfort

### 3b.5 Installer @google-cloud/storage i backend

```bash
cd apps/backend
npm install @google-cloud/storage
```

**Status:** [x] Fullfort

### 3b.6 Oppdater widget til å bruke cachede bilder

Widgeten må oppdateres til å bruke `bildeCache.url` fra Firestore i stedet for å hente bilder direkte fra Google Places.

**Oppdater `apps/widget/src/components/InfoWindowContent.tsx`:**

```tsx
// Bildet lastes nå fra Cloud Storage i stedet for Google Places
{placeDetails.bildeCache?.url && (
  <img
    src={placeDetails.bildeCache.url}
    alt={placeDetails.cachedData?.navn || placeDetails.navn}
    className="pkt-info-window__image"
    loading="lazy"
  />
)}
```

**Merk:** Hvis `bildeCache` ikke finnes (for eldre steder som ikke er migrert), kan du falle tilbake til Google Places API midlertidig:

```tsx
const bildeUrl = placeDetails.bildeCache?.url || placeDetails.googlePhotoUrl;

{bildeUrl && (
  <img
    src={bildeUrl}
    alt={placeDetails.cachedData?.navn || placeDetails.navn}
    className="pkt-info-window__image"
    loading="lazy"
  />
)}
```

**Status:** [x] Fullfort

---

## Fase 4: Dockerfiler og build-konfigurasjon

### 4.1 Backend Dockerfile

Opprett `apps/backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopier package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Installer avhengigheter
RUN npm ci --workspace=@klimaoslo-kart/backend --workspace=@klimaoslo-kart/shared

# Kopier kildekode
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Bygg
RUN npm run build -w apps/backend

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Kopier kun nodvendige filer
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Sett miljovariable
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start server
CMD ["node", "apps/backend/dist/index.js"]
```

**Status:** [x] Fullfort

### 4.2 Admin Dockerfile

Opprett `apps/admin/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopier package files
COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/shared/package*.json ./packages/shared/

# Installer avhengigheter
RUN npm ci --workspace=@klimaoslo-kart/admin --workspace=@klimaoslo-kart/shared

# Kopier kildekode
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin

# Bygg (environment variables settes ved deploy)
ARG VITE_API_URL
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID
ENV VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID

RUN npm run build -w apps/admin

# Production stage - serve med nginx
FROM nginx:alpine AS runner

# Kopier nginx-konfigurasjon
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Kopier bygget app
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**Status:** [x] Fullfort

### 4.3 Admin nginx.conf

Opprett `apps/admin/nginx.conf`:

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip-komprimering
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache statiske filer
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - fallback til index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Helsesj ekk
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

**Status:** [x] Fullfort

### 4.4 Widget Dockerfile

Opprett `apps/widget/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopier package files
COPY package*.json ./
COPY apps/widget/package*.json ./apps/widget/
COPY packages/shared/package*.json ./packages/shared/

# Installer avhengigheter
RUN npm ci --workspace=@klimaoslo-kart/widget --workspace=@klimaoslo-kart/shared

# Kopier kildekode
COPY packages/shared ./packages/shared
COPY apps/widget ./apps/widget

# Bygg
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN npm run build -w apps/widget

# Production stage
FROM nginx:alpine AS runner

COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/widget/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**Status:** [x] Fullfort

### 4.5 Widget nginx.conf

Opprett `apps/widget/nginx.conf`:

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache statiske filer
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # CORS headers for iframe embedding
    add_header X-Frame-Options "ALLOWALL";
    add_header Content-Security-Policy "frame-ancestors *";

    # Kartinstans-routes (slug-basert)
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

**Status:** [x] Fullfort

### 4.6 Test Docker-bygg lokalt

```bash
# Backend
docker build -f apps/backend/Dockerfile -t klimaoslo-kart-api:local .
docker run -p 8080:8080 klimaoslo-kart-api:local

# Admin (med build args)
docker build -f apps/admin/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:8080 \
  --build-arg VITE_AZURE_CLIENT_ID=test \
  --build-arg VITE_AZURE_TENANT_ID=test \
  -t klimaoslo-kart-admin:local .

# Widget
docker build -f apps/widget/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:8080 \
  --build-arg VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY \
  -t klimaoslo-kart-widget:local .
```

**Status:** [ ] Ikke startet

---

## Fase 5: Cloud Run deployment

### 5.1 Bygg og push Docker images

```bash
# Sett variabler
export PROJECT_ID=bruktbutikk-navn
export REGION=europe-west1
export REGISTRY=${REGION}-docker.pkg.dev/${PROJECT_ID}/klimaoslo-kart

# Backend
docker build -f apps/backend/Dockerfile -t ${REGISTRY}/api:latest .
docker push ${REGISTRY}/api:latest

# Admin
docker build -f apps/admin/Dockerfile \
  --build-arg VITE_API_URL=https://api.kart.klimaoslo.no \
  --build-arg VITE_AZURE_CLIENT_ID=${AZURE_CLIENT_ID} \
  --build-arg VITE_AZURE_TENANT_ID=${AZURE_TENANT_ID} \
  -t ${REGISTRY}/admin:latest .
docker push ${REGISTRY}/admin:latest

# Widget
docker build -f apps/widget/Dockerfile \
  --build-arg VITE_API_URL=https://api.kart.klimaoslo.no \
  --build-arg VITE_GOOGLE_MAPS_API_KEY=${MAPS_API_KEY} \
  -t ${REGISTRY}/widget:latest .
docker push ${REGISTRY}/widget:latest
```

**Status:** [x] Fullfort

### 5.2 Deploy Backend API

```bash
gcloud run deploy klimaoslo-kart-api \
  --image=${REGISTRY}/api:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=klimaoslo-kart-runner@bruktbutikk-navn.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=bruktbutikk-namn" \
  --set-secrets="GOOGLE_PLACES_API_KEY=google-places-api-key:latest" \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s \
  --concurrency=80
```

**Status:** [x] Fullfort

### 5.3 Deploy Admin-app

```bash
gcloud run deploy klimaoslo-kart-admin \
  --image=${REGISTRY}/admin:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=5 \
  --memory=256Mi \
  --cpu=1 \
  --timeout=30s
```

**Status:** [x] Fullfort

### 5.4 Deploy Widget

```bash
gcloud run deploy klimaoslo-kart-widget \
  --image=${REGISTRY}/widget:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=20 \
  --memory=256Mi \
  --cpu=1 \
  --timeout=30s
```

**Status:** [x] Fullfort

### 5.5 Noter Cloud Run URLer

```bash
# Hent URLer
gcloud run services describe klimaoslo-kart-api --region=europe-west1 --format='value(status.url)'
gcloud run services describe klimaoslo-kart-admin --region=europe-west1 --format='value(status.url)'
gcloud run services describe klimaoslo-kart-widget --region=europe-west1 --format='value(status.url)'
```

| Tjeneste | Cloud Run URL | Custom domene |
|----------|---------------|---------------|
| API | https://klimaoslo-kart-api-412468299057.europe-west1.run.app | api.kart.klimaoslo.no |
| Admin | https://klimaoslo-kart-admin-412468299057.europe-west1.run.app | admin.kart.klimaoslo.no |
| Widget | https://klimaoslo-kart-widget-412468299057.europe-west1.run.app | kart.klimaoslo.no |

**Status:** [x] Fullfort - alle tjenester deployet til Cloud Run

---

## Fase 6: Cloud Scheduler og Functions

### 6.1 Deploy Cloud Function for bildeoppdatering

Opprett `functions/refresh-images/index.js`:

```javascript
const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');

const db = new Firestore();
const storage = new Storage();
const BUCKET_NAME = 'klimaoslo-kart-bilder';

exports.refreshExpiredImages = async (req, res) => {
  const now = new Date();

  try {
    const expiredSteder = await db
      .collection('steder')
      .where('bildeCache.utloper', '<=', now)
      .get();

    console.log(`Found ${expiredSteder.size} places with expired cache`);

    const results = { updated: 0, failed: 0, errors: [] };

    for (const doc of expiredSteder.docs) {
      const sted = doc.data();

      try {
        // Hent nytt bilde fra Google Places
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${sted.bildeCache.originalPhotoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

        const response = await fetch(photoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.buffer();

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
      } catch (error) {
        results.failed++;
        results.errors.push(`${sted.placeId}: ${error.message}`);
      }
    }

    console.log('Refresh completed:', results);
    res.json(results);
  } catch (error) {
    console.error('Refresh failed:', error);
    res.status(500).json({ error: error.message });
  }
};
```

```bash
# Deploy function
gcloud functions deploy refreshExpiredImages \
  --runtime=nodejs20 \
  --trigger-http \
  --region=europe-west1 \
  --service-account=klimaoslo-kart-runner@bruktbutikk-navn.iam.gserviceaccount.com \
  --set-secrets="GOOGLE_PLACES_API_KEY=google-places-api-key:latest" \
  --memory=256MB \
  --timeout=540s \
  --source=functions/refresh-images
```

**Status:** [x] Kode fullfort - deployment gjenstor

### 6.2 Opprett Cloud Scheduler jobb

```bash
# Opprett scheduler-jobb (kjorer 1. i hver maned kl 03:00)
gcloud scheduler jobs create http refresh-klimaoslo-kart-images \
  --location=europe-west1 \
  --schedule="0 3 1 * *" \
  --uri="https://europe-west1-bruktbutikk-navn.cloudfunctions.net/refreshExpiredImages" \
  --http-method=GET \
  --oidc-service-account-email=klimaoslo-kart-scheduler@bruktbutikk-navn.iam.gserviceaccount.com \
  --oidc-token-audience="https://europe-west1-bruktbutikk-navn.cloudfunctions.net/refreshExpiredImages" \
  --description="Oppdaterer utlopte bilder i KlimaOslo Kartplattform"

# Test jobb manuelt
gcloud scheduler jobs run refresh-klimaoslo-kart-images --location=europe-west1
```

**Status:** [ ] Ikke startet

---

## Fase 7: Domene og SSL

### 7.1 Konfigurer Cloud Run domain mapping

```bash
# Verifiser domene (forst gang)
gcloud domains verify kart.klimaoslo.no

# Map domener til Cloud Run-tjenester
gcloud beta run domain-mappings create \
  --service=klimaoslo-kart-widget \
  --domain=kart.klimaoslo.no \
  --region=europe-west1

gcloud beta run domain-mappings create \
  --service=klimaoslo-kart-admin \
  --domain=admin.kart.klimaoslo.no \
  --region=europe-west1

gcloud beta run domain-mappings create \
  --service=klimaoslo-kart-api \
  --domain=api.kart.klimaoslo.no \
  --region=europe-west1
```

**Status:** [ ] Ikke startet

### 7.2 DNS-konfigurasjon

Legg til folgende DNS-records hos domeneadministrator:

| Type | Navn | Verdi | TTL |
|------|------|-------|-----|
| CNAME | kart | ghs.googlehosted.com | 3600 |
| CNAME | admin.kart | ghs.googlehosted.com | 3600 |
| CNAME | api.kart | ghs.googlehosted.com | 3600 |

**Merk:** Eksakt konfigurasjon avhenger av hvordan klimaoslo.no DNS administreres.

```bash
# Verifiser DNS-propagering
dig kart.klimaoslo.no CNAME
dig admin.kart.klimaoslo.no CNAME
dig api.kart.klimaoslo.no CNAME
```

**Status:** [ ] Ikke startet

### 7.3 Verifiser SSL-sertifikater

SSL-sertifikater provisjoneres automatisk av Cloud Run. Sjekk status:

```bash
gcloud beta run domain-mappings describe \
  --domain=kart.klimaoslo.no \
  --region=europe-west1
```

**Status:** [ ] Ikke startet

---

## Fase 8: CI/CD med Cloud Build

### 8.1 Opprett cloudbuild.yaml

Opprett `cloudbuild.yaml` i prosjekt-root:

```yaml
steps:
  # Bygg og push backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'apps/backend/Dockerfile'
      - '-t'
      - '${_REGISTRY}/api:$COMMIT_SHA'
      - '-t'
      - '${_REGISTRY}/api:latest'
      - '.'
    id: 'build-backend'

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGISTRY}/api:$COMMIT_SHA']
    id: 'push-backend'
    waitFor: ['build-backend']

  # Bygg og push admin
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'apps/admin/Dockerfile'
      - '--build-arg'
      - 'VITE_API_URL=https://api.kart.klimaoslo.no'
      - '--build-arg'
      - 'VITE_AZURE_CLIENT_ID=${_AZURE_CLIENT_ID}'
      - '--build-arg'
      - 'VITE_AZURE_TENANT_ID=${_AZURE_TENANT_ID}'
      - '-t'
      - '${_REGISTRY}/admin:$COMMIT_SHA'
      - '-t'
      - '${_REGISTRY}/admin:latest'
      - '.'
    id: 'build-admin'

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGISTRY}/admin:$COMMIT_SHA']
    id: 'push-admin'
    waitFor: ['build-admin']

  # Bygg og push widget
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'apps/widget/Dockerfile'
      - '--build-arg'
      - 'VITE_API_URL=https://api.kart.klimaoslo.no'
      - '--build-arg'
      - 'VITE_GOOGLE_MAPS_API_KEY=${_MAPS_API_KEY}'
      - '-t'
      - '${_REGISTRY}/widget:$COMMIT_SHA'
      - '-t'
      - '${_REGISTRY}/widget:latest'
      - '.'
    id: 'build-widget'

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGISTRY}/widget:$COMMIT_SHA']
    id: 'push-widget'
    waitFor: ['build-widget']

  # Deploy til Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'klimaoslo-kart-api'
      - '--image=${_REGISTRY}/api:$COMMIT_SHA'
      - '--region=europe-west1'
      - '--platform=managed'
    id: 'deploy-backend'
    waitFor: ['push-backend']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'klimaoslo-kart-admin'
      - '--image=${_REGISTRY}/admin:$COMMIT_SHA'
      - '--region=europe-west1'
      - '--platform=managed'
    id: 'deploy-admin'
    waitFor: ['push-admin']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'klimaoslo-kart-widget'
      - '--image=${_REGISTRY}/widget:$COMMIT_SHA'
      - '--region=europe-west1'
      - '--platform=managed'
    id: 'deploy-widget'
    waitFor: ['push-widget']

substitutions:
  _REGISTRY: europe-west1-docker.pkg.dev/bruktbutikk-navn/klimaoslo-kart
  _AZURE_CLIENT_ID: ''  # Settes i trigger
  _AZURE_TENANT_ID: ''  # Settes i trigger
  _MAPS_API_KEY: ''     # Settes i trigger

options:
  logging: CLOUD_LOGGING_ONLY

images:
  - '${_REGISTRY}/api:$COMMIT_SHA'
  - '${_REGISTRY}/admin:$COMMIT_SHA'
  - '${_REGISTRY}/widget:$COMMIT_SHA'
```

**Status:** [x] Fullfort

### 8.2 Opprett Cloud Build trigger

```bash
# Koble til Git-repository (krever manuell godkjenning i Console)
gcloud builds triggers create github \
  --name="klimaoslo-kart-deploy" \
  --repo-owner="GITHUB_ORG" \
  --repo-name="klimaoslo-kart" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_AZURE_CLIENT_ID=xxx,_AZURE_TENANT_ID=xxx,_MAPS_API_KEY=xxx"
```

**Alternativt:** Opprett trigger manuelt i Cloud Console under Cloud Build > Triggers.

**Status:** [ ] Ikke startet

---

## Fase 9: Azure AD for produksjon

### 9.1 App-registrering i Azure

1. Ga til Azure Portal > Azure Active Directory > App registrations
2. Klikk "New registration"
3. Fyll ut:
   - Name: `KlimaOslo Kartplattform Admin`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `https://admin.kart.klimaoslo.no/auth/callback`

### 9.2 Konfigurer redirect URIs

Legg til folgende URIs under Authentication:
- `https://admin.kart.klimaoslo.no/auth/callback`
- `https://admin.kart.klimaoslo.no/` (for silent refresh)
- `http://localhost:3000/auth/callback` (for lokal utvikling)

### 9.3 Opprett Client Secret

1. Ga til Certificates & secrets
2. Klikk "New client secret"
3. Lagre verdien i GCP Secret Manager (se Fase 2)

### 9.4 Noter konfigurasjonsverdier

| Verdi | Plassering |
|-------|------------|
| Application (client) ID | Overview |
| Directory (tenant) ID | Overview |
| Client secret | Certificates & secrets |

### 9.5 Oppdater backend miljovariable

```bash
# Oppdater Cloud Run med Azure AD-konfigurasjon
gcloud run services update klimaoslo-kart-api \
  --region=europe-west1 \
  --set-env-vars="AZURE_CLIENT_ID=xxx,AZURE_TENANT_ID=xxx" \
  --set-secrets="AZURE_CLIENT_SECRET=azure-ad-client-secret:latest"
```

**Status:** [ ] Ikke startet

---

## Fase 10: Verifisering og lansering

### 10.1 Funksjonell testing

| Test | URL | Forventet resultat | Status |
|------|-----|-------------------|--------|
| API helsesjekk | https://api.kart.klimaoslo.no/health | 200 OK | [ ] |
| Admin innlogging | https://admin.kart.klimaoslo.no | Azure AD redirect | [ ] |
| Widget laster | https://kart.klimaoslo.no/gjenbrukskartet | Kart vises | [ ] |
| Google Maps fungerer | | Markorer vises | [ ] |
| Stedssok | | Autocomplete fungerer | [ ] |
| Tips-skjema | | Kan sende tips | [ ] |
| **Bildecache** | Cloud Storage | Bilder lastes fra storage.googleapis.com | [ ] |
| **InfoWindow bilder** | | Stedsbilder vises i popup | [ ] |

### 10.2 Ytelsestesting

```bash
# Test responstid
curl -w "@curl-format.txt" -o /dev/null -s https://api.kart.klimaoslo.no/health
curl -w "@curl-format.txt" -o /dev/null -s https://kart.klimaoslo.no/
```

### 10.3 Sikkerhetstesting

- [x] HTTPS fungerer pa alle domener
- [x] Ingen CORS-feil i browser console
- [ ] Admin krever innlogging
- [x] API-nokler korrekt separert (se Fase 2b nedenfor)
- [x] Rate limiting på offentlige endepunkter
- [x] HTTP referrer-restriksjoner på frontend-nøkkel

### 10.4 Migrering av eksisterende data (bildecache)

For eksisterende steder uten bildecache må vi kjøre et migreringsskript.

**Opprett `scripts/migrateExistingImages.ts`:**

```typescript
import { Firestore } from '@google-cloud/firestore';
import { cacheStedBilde } from '../apps/backend/src/services/imageCache';
import { getPlaceDetails } from '../apps/backend/src/services/places';

const db = new Firestore();

async function migrateExistingImages() {
  // Hent alle steder uten bildecache
  const stederWithoutCache = await db
    .collection('steder')
    .where('bildeCache', '==', null)
    .get();

  console.log(`Migrerer ${stederWithoutCache.size} steder...`);

  for (const doc of stederWithoutCache.docs) {
    const sted = doc.data();

    try {
      // Hent photo_reference fra Google Places
      const details = await getPlaceDetails(sted.placeId);

      if (details.photos && details.photos.length > 0) {
        const bildeCache = await cacheStedBilde(
          sted.placeId,
          details.photos[0].photo_reference
        );

        await doc.ref.update({ bildeCache });
        console.log(`✓ ${sted.cachedData.navn}`);
      } else {
        console.log(`⚠ ${sted.cachedData.navn} - ingen bilder`);
      }
    } catch (error) {
      console.error(`✗ ${sted.cachedData.navn}:`, error.message);
    }

    // Rate limiting - vent 200ms mellom kall
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('Migrering fullført!');
}

migrateExistingImages();
```

**Legg til script i root package.json:**

```json
{
  "scripts": {
    "migrate:images": "tsx scripts/migrateExistingImages.ts"
  }
}
```

**Kjør migrering:**

```bash
# Sett miljøvariabler først
export GOOGLE_PLACES_API_KEY=din_nokkel
export GCP_PROJECT_ID=bruktbutikk-navn

# Kjør migrering
npm run migrate:images
```

**Status:** [x] Skript fullfort - kjoring gjenstor etter deployment

### 10.5 Oppdater embed-koder

Oppdater iframe-koder pa klimaoslo.no fra:
```html
<iframe src="https://gammel-leverandor.no/kart/..." />
```
Til:
```html
<iframe src="https://kart.klimaoslo.no/gjenbrukskartet" />
```

### 10.6 Dokumentasjon for redaksjonen

- [ ] Brukerveiledning for admin-verktoy
- [ ] Hvordan legge til nye kart
- [ ] Hvordan handtere tips
- [ ] Kontaktinfo for teknisk support

**Status:** [ ] Ikke startet

---

## Neste steg

### Umiddelbare oppgaver (Prioritert)

1. **Verifiser GCP-tilgang** - Sjekk at du har nodvendige rettigheter i prosjektet
2. **Installer gcloud CLI** - Folg instruksjonene i Forutsetninger
3. **Aktiver API-er** - Kjor kommandoene i Fase 1.2
4. **Opprett Dockerfiler** - Start med backend, test lokalt

### Avhengigheter og blokkere

| Oppgave | Avhengig av | Blokker |
|---------|-------------|---------|
| Cloud Run deploy | Dockerfiler, Artifact Registry | |
| Domene-mapping | DNS-tilgang | Hvem administrerer klimaoslo.no DNS? |
| Azure AD | App-registrering i Oslo kommune tenant | Tilgang til Azure AD |
| CI/CD | GitHub repo, Cloud Build trigger | Repo-tilgang |

### Sporsmal som ma avklares

1. **DNS-administrasjon:** Hvem har tilgang til a opprette DNS-records for klimaoslo.no?
2. **Azure AD:** Har du tilgang til a registrere apper i Oslo kommune sin Azure AD tenant?
3. **GitHub:** Skal koden ligge i et eksisterende repo, eller opprettes nytt?
4. **Backup:** Onskes automatisk backup av Firestore-data?

---

## Vedlegg

### A. Miljovariable-oversikt

#### Backend (Cloud Run)
| Variabel | Kilde | Beskrivelse |
|----------|-------|-------------|
| NODE_ENV | env | `production` |
| PORT | env | `8080` |
| GCP_PROJECT_ID | env | `bruktbutikk-navn` |
| GOOGLE_PLACES_API_KEY | Secret Manager | Google Places API-nokkel |
| AZURE_CLIENT_ID | env | Azure AD app ID |
| AZURE_TENANT_ID | env | Azure AD tenant ID |
| AZURE_CLIENT_SECRET | Secret Manager | Azure AD client secret |

#### Admin (build-time)
| Variabel | Kilde | Beskrivelse |
|----------|-------|-------------|
| VITE_API_URL | build-arg | `https://api.kart.klimaoslo.no` |
| VITE_AZURE_CLIENT_ID | build-arg | Azure AD app ID |
| VITE_AZURE_TENANT_ID | build-arg | Azure AD tenant ID |

#### Widget (build-time)
| Variabel | Kilde | Beskrivelse |
|----------|-------|-------------|
| VITE_API_URL | build-arg | `https://api.kart.klimaoslo.no` |
| VITE_GOOGLE_MAPS_API_KEY | build-arg | Google Maps API-nokkel |

### B. Kostnadsestimat (detaljert)

| Tjeneste | Enhet | Estimert bruk | Pris | Manedlig |
|----------|-------|---------------|------|----------|
| Cloud Run (API) | vCPU-sekunder | 50,000 | $0.00002400 | ~$1.20 |
| Cloud Run (API) | GB-sekunder | 25,000 | $0.00000250 | ~$0.06 |
| Cloud Run (Admin) | vCPU-sekunder | 10,000 | $0.00002400 | ~$0.24 |
| Cloud Run (Widget) | vCPU-sekunder | 100,000 | $0.00002400 | ~$2.40 |
| Firestore | Dokument-lesinger | 100,000 | $0.036/100k | ~$0.04 |
| Firestore | Dokument-skrivinger | 10,000 | $0.108/100k | ~$0.01 |
| Cloud Storage | GB lagret | 5 GB | $0.020/GB | ~$0.10 |
| Cloud Storage | Utgaende trafikk | 10 GB | $0.12/GB | ~$1.20 |
| Secret Manager | Tilganger | 10,000 | $0.03/10k | ~$0.03 |
| Cloud Scheduler | Jobber | 1 | Gratis | $0.00 |
| **Total estimat** | | | | **~$5-10** |

*Merk: Estimatet forutsetter lav til moderat trafikk. Ved hoyere trafikk kan kostnadene oke.*

### B.2 Kostnadsbesparelse med bildecaching

Bildecaching er kritisk for å holde kostnadene nede. Fra ARKITEKTURPLAN.md:

| Scenario | Uten bildecaching | Med bildecaching (30 dager) |
|----------|-------------------|----------------------------|
| 100 steder, 1000 visninger/dag | ~3000 Places Photo API-kall/dag | ~3-4 kall/måned |
| Google Places Photo API-kostnad | ~$21/dag ($630/måned) | ~$0.02/måned |
| **Årlig besparelse** | - | **~$7,500** |

**Forklaring:**
- Google Places Photo API koster **$7 per 1000 kall**
- Uten caching: Hvert kartbesøk trigger bildekall for alle synlige steder
- Med caching: Bilder serveres fra Cloud Storage, kun oppdateringskall hver 30. dag

**Cloud Storage-kostnader (bildecache):**
- Lagring: $0.02/GB/måned (estimert 1-5 GB for 500 steder)
- Utgående trafikk: $0.12/GB (gratis de første 1 GB/måned)
- Totalt: ~$1-5/måned avhengig av antall steder og trafikk

**Google Places API-vilkår:**
Google Places API tillater caching av data i **inntil 30 dager**. Vår løsning overholder vilkårene ved å:
- Cache bilder i maksimalt 30 dager
- Automatisk oppdatere utløpte bilder via Cloud Scheduler
- Beholde referanse til originaldata (`originalPhotoReference`)

Se: [Google Places API Policies](https://developers.google.com/maps/documentation/places/web-service/policies)

### C. Feilsoking

#### Cloud Run logger
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=klimaoslo-kart-api" --limit=50
```

#### Firestore-tilkobling
```bash
# Test fra Cloud Shell
gcloud firestore databases list
```

#### Container-debugging
```bash
# Koble til kjorende container
gcloud run services logs read klimaoslo-kart-api --region=europe-west1 --limit=100
```

---

*Sist oppdatert: 2026-01-13 (InfoWindow via backend API, bilde-URL generering)*
