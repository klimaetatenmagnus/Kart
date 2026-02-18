# KlimaOslo Kartplattform

Selvhostet kartløsning for [KlimaOslo.no](https://klimaoslo.no) - Oslo kommunes nettsted for klimatiltak og bærekraftig byutvikling.

## Om prosjektet

Kartplattformen lar redaksjonen opprette interaktive kart med steder hentet fra Google Places. Kartene bygges inn som iframes på klimaoslo.no og viser f.eks. gjenbruksbutikker, byttehyller, verksteder og andre bærekraftige tilbud i Oslo.

## Funksjoner

- **Admin-verktøy** - Opprett og rediger kartinstanser, legg til steder, håndter tips fra brukere
- **Embeddbar kartwidget** - Responsivt kart med kategorifilter, søk og "Åpen nå"-filter
- **Google Places-integrasjon** - Automatisk henting av åpningstider, bilder og kontaktinfo
- **Tips fra brukere** - Publikum kan foreslå nye steder via skjema i kartet
- **Bildecaching** - Bilder caches i Cloud Storage for å minimere API-kostnader

## Arkitektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin-app     │     │   Kartwidget    │     │   Backend API   │
│  (React/Vite)   │     │  (React/Vite)   │     │ (Node/Express)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │     Google Cloud        │
                    │  ┌─────────────────┐    │
                    │  │    Firestore    │    │
                    │  └─────────────────┘    │
                    │  ┌─────────────────┐    │
                    │  │  Cloud Storage  │    │
                    │  └─────────────────┘    │
                    │  ┌─────────────────┐    │
                    │  │    Cloud Run    │    │
                    │  └─────────────────┘    │
                    └─────────────────────────┘
```

| Komponent | Beskrivelse | Teknologi |
|-----------|-------------|-----------|
| **Backend API** | REST API for kartdata og Google Places-proxy | Node.js, Express, Firestore |
| **Admin-app** | Administrasjonsgrensesnitt for redaksjonen | React, Vite, Azure AD |
| **Kartwidget** | Embeddbart kart for klimaoslo.no | React, Vite, Google Maps |
| **Shared** | Delte TypeScript-typer | TypeScript |

## Kom i gang

### Forutsetninger

- Node.js 20+
- Tilgang til GCP-prosjekt med Firestore
- Google Maps/Places API-nøkkel

### Installasjon

```bash
# Klon repository
git clone https://github.com/klimaetatenmagnus/Kart.git
cd Kart

# Installer avhengigheter
npm install

# Kopier miljøvariabler (rediger med dine verdier)
cp .env.example .env
```

### Lokal utvikling

```bash
# Start alle tjenester (i separate terminaler)
npm run dev:backend   # API på http://localhost:8080
npm run dev:admin     # Admin på http://localhost:3000
npm run dev:widget    # Widget på http://localhost:3001
```

Admin-appen kjører i dev-modus uten Azure AD-innlogging.

### Miljøvariabler

| Variabel | Beskrivelse |
|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Backend API-nøkkel for Places API |
| `VITE_GOOGLE_MAPS_API_KEY` | Frontend API-nøkkel for Maps JavaScript API |
| `VITE_API_URL` | URL til backend API |
| `AZURE_CLIENT_ID` | Backend app-ID/audience for tokenvalidering |
| `AZURE_TENANT_ID` | Azure AD tenant-ID for backend tokenvalidering |
| `AZURE_API_AUDIENCES` | Valgfri, komma-separert liste av gyldige audiences for backend |
| `AZURE_ALLOWED_GROUP_IDS` | Valgfri, komma-separert liste av Entra gruppe-IDer med skrivetilgang |
| `VITE_AZURE_CLIENT_ID` | Azure AD app-ID (produksjon) |
| `VITE_AZURE_TENANT_ID` | Azure AD tenant-ID (produksjon) |
| `VITE_AZURE_API_SCOPE` | API-scope admin ber om (default: `User.Read`). Ved custom API må dette være fullt scope, f.eks. `api://<app-id>/access_as_user` (ikke bare `api://<app-id>`) |

## Deployment

Prosjektet deployes automatisk til Google Cloud Run via GitHub Actions når du pusher til `main`.

**Selektiv deployment:** Kun tjenester med endrede filer bygges og deployes.

| Endring i | Deployer |
|-----------|----------|
| `apps/backend/**` | Backend API |
| `apps/admin/**` | Admin-app |
| `apps/widget/**` | Kartwidget |
| `packages/shared/**` | Alle tjenester |

Se [DEPLOYMENT.md](DEPLOYMENT.md) for detaljert dokumentasjon.

## Prosjektstruktur

```
Kart/
├── apps/
│   ├── admin/          # Admin-app (React + Vite)
│   ├── backend/        # API (Node.js + Express)
│   └── widget/         # Kartwidget (React + Vite)
├── packages/
│   └── shared/         # Delte TypeScript-typer
├── functions/
│   └── refresh-images/ # Cloud Function for bildeoppdatering
├── .github/
│   └── workflows/      # GitHub Actions for CI/CD
└── scripts/            # Migrerings- og hjelpeskript
```

## API-endepunkter

### Offentlige (widget)
- `GET /api/public/kartinstanser/:slug` - Hent kartinstans
- `GET /api/public/kartinstanser/:slug/steder` - Hent steder for kart
- `GET /api/public/places/autocomplete` - Stedssøk
- `GET /api/public/places/details` - Stedsdetaljer
- `POST /api/public/tips` - Send inn tips

### Autentiserte (admin)
- `GET/POST /api/kartinstanser` - CRUD for kartinstanser
- `GET/POST/DELETE /api/kartinstanser/:slug/steder` - CRUD for steder
- `GET/PATCH /api/tips` - Håndter tips

## Bidra

Prosjektet er åpent for bidrag. For større endringer, opprett en issue først for å diskutere.

1. Fork repoet
2. Opprett en feature-branch (`git checkout -b feature/ny-funksjon`)
3. Commit endringene (`git commit -m 'Legg til ny funksjon'`)
4. Push til branchen (`git push origin feature/ny-funksjon`)
5. Opprett en Pull Request

## Lisens

MIT License - Se [LICENSE](LICENSE) for detaljer.

## Kontakt

**Oslo kommune / Klimaetaten**
[klimaoslo.no](https://klimaoslo.no)
