# KlimaOslo Kartplattform - Arkitekturplan

## Innholdsfortegnelse
1. [Sammendrag](#sammendrag)
2. [Arbeidslogg](#arbeidslogg)
3. [Fremdriftsstatus](#fremdriftsstatus)
4. [Nåværende løsning](#nåværende-løsning)
5. [Ny arkitektur](#ny-arkitektur)
6. [Admin-verktøy](#admin-verktøy)
7. [Kartwidget](#kartwidget)
8. [Database-struktur](#database-struktur)
9. [API-spesifikasjon](#api-spesifikasjon)
10. [Autentisering](#autentisering)
11. [Teknisk stack](#teknisk-stack)
12. [Implementeringsplan](#implementeringsplan)
13. [Bildecaching-arkitektur](#bildecaching-arkitektur)
14. [UI-migreringsplan: Punkt designsystem](#ui-migreringsplan-punkt-designsystem)
15. [Admin-app: Punkt Designsystem Migreringsplan](#admin-app-punkt-designsystem-migreringsplan)
16. [Neste steg](#neste-steg)
17. [E-postvarsling for tips](#e-postvarsling-for-tips)

---

## Sammendrag

Målet er å bygge en selvhostet kartplattform på Google Cloud som:
- Erstatter dagens leverandør-hostede løsning
- Bruker Punkt designsystem for konsistent Oslo kommune-design
- Gir redaksjonen et brukervennlig admin-verktøy
- Beholder integrasjonen med Google Places API for automatisk henting av stedsinfo
- **Cacher bilder lokalt i Cloud Storage** for å minimere API-kostnader (30 dagers cache)

---

## Arbeidslogg

| Dato | Aktivitet | Status |
|------|-----------|--------|
| 2026-01-08 | Oppstart prosjekt. Arbeidslogg og fremdriftssporing lagt til i arkitekturplan. | Fullfort |
| 2026-01-08 | Monorepo-struktur opprettet med npm workspaces. | Fullfort |
| 2026-01-08 | Shared types-pakke opprettet med TypeScript-typer for alle entiteter. | Fullfort |
| 2026-01-08 | Admin-app (React + Vite) strukturert med Azure AD-auth, routing og komponenter. | Fullfort |
| 2026-01-08 | Kartwidget-app (React + Vite) strukturert med Google Maps-integrasjon. | Fullfort |
| 2026-01-08 | Backend (Node.js/Express) opprettet med Firestore-integrasjon og alle API-endepunkter. | Fullfort |
| 2026-01-08 | Utviklingsmodus konfigurert - admin apen uten Azure AD-innlogging (SKIP_AUTH). | Fullfort |
| 2026-01-08 | .env-filer opprettet for alle apper med Google Maps API-nokkel. | Fullfort |
| 2026-01-08 | npm install kjort - avhengigheter installert. | Fullfort |
| 2026-01-08 | Firestore API aktivert i GCP-prosjekt bruktbutikk-navn. | Fullfort |
| 2026-01-08 | Firestore database opprettet i europe-west1 (native mode). | Fullfort |
| 2026-01-08 | dotenv lagt til backend for miljovariabler. | Fullfort |
| 2026-01-08 | Backend, admin og widget kjorer lokalt med live GCP-tilkobling. | Fullfort |
| 2026-01-08 | Google Places API testet og verifisert fungerende. | Fullfort |
| 2026-01-08 | Test-kartinstans opprettet via admin og lagret i Firestore. | Fullfort |
| 2026-01-08 | Stedssok implementert i KartinstansEditor med Google Places Text Search. | Fullfort |
| 2026-01-08 | "Legg til sted"-funksjonalitet med kategorivelger implementert. | Fullfort |
| 2026-01-08 | Liste over steder med sletting implementert. | Fullfort |
| 2026-01-08 | Backend oppdatert til a cache stedsdata fra Google Places ved oppretting. | Fullfort |
| 2026-01-08 | Embed-kode generator implementert i KartinstansEditor med avanserte innstillinger. | Fullfort |
| 2026-01-08 | Kartwidget URL-parameter parsing for embed-innstillinger (sokefelt, filter, sidebar). | Fullfort |
| 2026-01-08 | Widget og backend testet sammen - API og komponenter fungerer. | Fullfort |
| 2026-01-08 | InfoWindow forbedret med fallback til cached data og bedre feilhåndtering. | Fullfort |
| 2026-01-08 | Autocomplete med debounce lagt til i admin stedssøk. | Fullfort |
| 2026-01-09 | Områdesøk implementert med Google Places Autocomplete (bydeler, nabolag). | Fullfort |
| 2026-01-09 | Søkefelt viser autocomplete-forslag for både steder i kartet og områder. | Fullfort |
| 2026-01-09 | Sidebar filtreres basert på valgt område med visuell indikator. | Fullfort |
| 2026-01-09 | Klikk i sidebar zoomer til sted og åpner InfoWindow. | Fullfort |
| 2026-01-09 | MapView refaktorert med forwardRef for ekstern kontroll (panTo, selectMarker). | Fullfort |
| 2026-01-09 | Widget fullstendig testet: kategorifilter, åpen nå, sidebar, mobil, tips-modal, embed-parametre. | Fullfort |
| 2026-01-09 | Punkt designsystem-pakker installert i widget (@oslokommune/punkt-react, punkt-css, punkt-assets). | Fullfort |
| 2026-01-09 | SCSS-struktur satt opp med Punkt-variabler og design tokens. | Fullfort |
| 2026-01-09 | MapView migrert til PktCheckbox for "Åpen nå"-filter. | Fullfort |
| 2026-01-09 | TipsModal migrert til Punkt-komponenter (PktTextinput, PktCombobox, PktButton, PktAlert). | Fullfort |
| 2026-01-09 | InfoWindowContent.tsx opprettet med Punkt-komponenter og React-rendering i Google Maps InfoWindow. | Fullfort |
| 2026-01-09 | Alle border-radius endret til 0 (skarpe hjørner) i henhold til Punkt designsystem. | Fullfort |
| 2026-01-09 | CategoryFilter stylet som Punkt (custom checkbox med 24px, 2px kant, hake-ikon, fokusring). | Fullfort |
| 2026-01-09 | InfoWindow fikset: fjernet dobbel lukkeknapp, aktivert scroll. | Fullfort |
| 2026-01-09 | Header med Oslo-logo og karttittel fjernet (embed-optimalisering). | Fullfort |
| 2026-01-09 | Tips-knappen flyttet til øverst til høyre over kartet med Punkt-spacing. | Fullfort |
| 2026-01-09 | Hover-effekter på kategori-knappene forbedret (bakgrunn, border, checkbox-glow). | Fullfort |
| 2026-01-09 | "Norway" fjernet fra adresser i sidebar for renere visning. | Fullfort |
| 2026-01-09 | Søkefelt oppdatert med forstørrelsesglass-ikon (inline SVG fra Punkt). | Fullfort |
| 2026-01-09 | Tips-knappen byttet til PktButton med korrekte Punkt hover-effekter. | Fullfort |
| 2026-01-09 | Google Maps fullskjerm-knapp fjernet (fullscreenControl: false). | Fullfort |
| 2026-01-11 | **Bildecaching-arkitektur dokumentert** - Cloud Storage, 30 dagers cache, Cloud Scheduler for oppdatering. | Planlagt |
| 2026-01-13 | **Tips-flyt forbedret med Google Places autocomplete** - Brukere velger verifiserte steder fra Google i tips-skjemaet. | Fullført |
| 2026-01-13 | Nye offentlige API-endepunkter for places autocomplete og details (widget). | Fullført |
| 2026-01-13 | TipsDTO utvidet med placeId for direkte godkjenning og tillegging til kart. | Fullført |
| 2026-01-13 | Admin TipsOversikt forenklet - ett-klikks godkjenning når placeId finnes. | Fullført |
| 2026-01-13 | Dashboard og TipsOversikt: Kart-titler med større font, robust datohåndtering, kategori-navn lookup. | Fullført |
| 2026-01-13 | **API-sikkerhet implementert:** Separerte API-nøkler (frontend/backend), rate limiting, HTTP referrer-restriksjoner. | Fullført |
| 2026-01-13 | Backend Places API-nøkkel opprettet og lagret i Secret Manager. | Fullført |
| 2026-01-13 | Frontend Maps-nøkkel sikret med HTTP referrer-restriksjoner for godkjente domener. | Fullført |
| 2026-01-13 | Rate limiting på offentlige endepunkter (30 req/min for places, 5 req/min for tips). | Fullført |
| 2026-01-13 | `.gitignore` opprettet for å beskytte .env-filer. | Fullført |
| 2026-01-13 | **InfoWindow-detaljer fikset:** Widget bruker nå backend API for stedsdetaljer. | Fullført |
| 2026-01-13 | `/api/public/places/details` utvidet med telefon, nettside, åpningstider, bilder. | Fullført |
| 2026-01-13 | MapView endret fra frontend Places SDK til backend API-kall for sikkerhet. | Fullført |
| 2026-01-13 | Backend genererer bilde-URL-er fra Google Places Photo API. | Fullført |
| 2026-01-13 | **Typografi-revisjon:** Alle hardkodede font-size verdier erstattet med Punkt `get-text()` SCSS-mixin. | Fullført |
| 2026-01-13 | Widget og admin SCSS oppdatert til å importere `@oslokommune/punkt-css/dist/scss/abstracts/mixins/typography`. | Fullført |
| 2026-01-13 | Typografi i InfoWindowContent, søkefelt, sidebar, tips-modal, admin-tabeller etc. følger nå Punkt-retningslinjer. | Fullført |
| 2026-01-13 | **"Åpen nå"-filter reimplementert:** Sanntidssjekk ved aktivering erstatter periodisk oppdatering. | Fullført |
| 2026-01-13 | Nytt batch-endepunkt `/api/public/places/open-now-batch` for effektiv statussjekk av flere steder. | Fullført |
| 2026-01-13 | `useOpenNowStatus` hook opprettet for å håndtere henting og caching av åpen-status. | Fullført |
| 2026-01-13 | Filtreringslogikk i App.tsx oppdatert til å faktisk filtrere basert på åpen-status. | Fullført |

---

## Fremdriftsstatus

### Oversikt
```
Fase 1: Grunnlag           [##########] 100% <- Fullfort! Live GCP + Firestore fungerer
Fase 2: Admin-verktoy MVP  [######### ] 90%  <- Embed-kode generator fullfort, mangler Azure AD
Fase 3: Kartwidget         [##########] 100% <- Fullfort! Alle funksjoner testet og verifisert
Fase 4: Bildecaching       [          ] 0%   <- NY! Cloud Storage + 30 dagers cache
Fase 5: Lansering          [          ] 0%
Fase 6: Forbedringer       [          ] 0%
```

### Prosjektstruktur (opprettet)
```
Kart/
├── package.json                 # Monorepo med npm workspaces
├── .env                         # Hoved-miljøvariabler (API-nokler)
├── ARKITEKTURPLAN.md           # Dette dokumentet
├── Gjenbrukskartet.html        # Eksisterende losning (referanse)
├── node_modules/               # Avhengigheter (npm install kjort)
├── apps/
│   ├── admin/                  # Admin-app (React + Vite)
│   │   ├── .env                # VITE_SKIP_AUTH=true for dev
│   │   ├── src/
│   │   │   ├── components/     # Layout, etc.
│   │   │   ├── pages/          # Dashboard, KartinstansEditor, Tips, Login
│   │   │   ├── services/       # Auth config
│   │   │   └── styles/         # CSS
│   │   └── package.json
│   ├── widget/                 # Kartwidget (React + Vite + Google Maps)
│   │   ├── .env                # VITE_GOOGLE_MAPS_API_KEY
│   │   ├── src/
│   │   │   ├── components/     # MapView, Sidebar, BottomSheet, etc.
│   │   │   ├── hooks/          # useKartinstans, useSteder
│   │   │   └── styles/         # CSS
│   │   └── package.json
│   └── backend/                # API (Node.js + Express)
│       ├── .env                # SKIP_AUTH=true, GOOGLE_PLACES_API_KEY
│       ├── src/
│       │   ├── routes/         # kartinstanser, steder, tips, places, public
│       │   ├── services/       # Firestore
│       │   └── middleware/     # Auth
│       └── package.json
└── packages/
    └── shared/                 # Delte TypeScript-typer
        └── src/types.ts
```

### Neste steg (prioritert)

#### Fullfort
- [x] Installere avhengigheter
- [x] Konfigurere miljovariabler (utviklingsmodus)
- [x] Start backend (port 8080)
- [x] Start admin (port 3000)
- [x] Start widget (port 3001)
- [x] Konfigurer Firestore (live-tilkobling til bruktbutikk-navn)
- [x] Test opprettelse av kartinstans (test-kart lagret i Firestore)

#### Fase 2: Admin-verktoy (pagaende)
1. ~~**Implementer stedssok i KartinstansEditor** - Legg til sokefelt med Google Places Text Search~~ Fullfort
2. ~~**Implementer "Legg til sted"-funksjonalitet** - Velg kategori og lagre sted til Firestore~~ Fullfort
3. ~~**Vis liste over steder i kartinstansen** - Tabell med mulighet for sletting~~ Fullfort
4. ~~**Embed-kode generator** - Generer iframe-kode for WordPress~~ Fullfort

#### Fase 3: Kartwidget (80% fullfort)
5. ~~**Implementer Google Maps i widget** - Vis kart med markorer~~ Fullfort
6. ~~**Hent steder fra backend** - Koble til /api/public endepunkter~~ Fullfort
7. ~~**Kategorifilter og sidebar** - Filtrer og vis steder i liste~~ Fullfort
8. ~~**Responsivt design** - Bottom sheet pa mobil~~ Fullfort

### For a kjore lokalt

```bash
# Terminal 1 - Backend API
npm run dev:backend

# Terminal 2 - Admin (apen uten innlogging i dev-modus)
npm run dev:admin

# Terminal 3 - Kartwidget
npm run dev:widget
```

Admin-appen viser en "DEV"-badge og krever ikke innlogging i utviklingsmodus.

### Blokkere / Avklaringer nodvendig
- [x] Tilgang til Google Cloud-prosjekt - Prosjekt bruktbutikk-navn (412468299057)
- [x] Google Maps API-nokkel - Konfigurert i .env
- [x] Utviklingsmodus uten Azure AD - Konfigurert med SKIP_AUTH=true
- [x] Firestore-database - Opprettet i europe-west1 (native mode)
- [x] Google Places API - Aktivert og testet (sokefunksjon virker)
- [x] Maps JavaScript API - Aktivert (maps-backend.googleapis.com)
- [ ] Azure AD for produksjon - Kan vente til produksjonslansering
- ~~Avklare domene-oppsett~~ - Ikke nodvendig for iframe-embedding

### Miljøvariabler (allerede satt opp)

**Root (.env):**
```
MAPS_PLATFORM_API_KEY=AIzaSy... (din nokkel)
NODE_ENV=development
SKIP_AUTH=true
```

**Backend (apps/backend/.env):**
```
PORT=8080
NODE_ENV=development
SKIP_AUTH=true
GCP_PROJECT_ID=bruktbutikk-navn
GOOGLE_PLACES_API_KEY=AIzaSy... (din nokkel)
```

**Admin (apps/admin/.env):**
```
VITE_SKIP_AUTH=true
VITE_DEV_USER_EMAIL=dev@oslo.kommune.no
VITE_DEV_USER_NAME=Developer
```

**Widget (apps/widget/.env):**
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSy... (din nokkel)
```

---

## Nåværende løsning

### Dataflyt (i dag)
```
Google Sheets (manuell input)
        │
        ▼
Apps Script (henter place_id)
        │
        ▼
Publisert CSV via Google Sheets
        │
        ▼
HTML/JS-widget (PapaParse + Google Maps API)
```

### Datastruktur (CSV)
| Kolonne   | Beskrivelse                        |
|-----------|------------------------------------|
| Place ID  | Google Places ID (f.eks. ChIJ...) |
| Kategori  | Kommaseparert liste (f.eks. "Klær, Tekstiler") |

### Eksisterende funksjoner
- Kategorier med fargekoder (hovedkategorier + underkategorier)
- Søk i butikknavn
- "Åpen nå"-filter med sanntidssjekk ved aktivering
- Responsivt design (bottom sheet på mobil)
- "Tips oss"-skjema for brukerinnspill
- Sidebar med liste over steder

### Kategorier i Gjenbrukskartet
| Hovedkategori | Underkategorier                              |
|---------------|----------------------------------------------|
| Reparasjon    | Skomaker, Klesreparasjon, Mobil og elektronikk |
| Bruktbutikker | Klær, Tekstiler, Interiør                    |

---

## Ny arkitektur

### Systemdiagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE CLOUD PLATFORM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     CLOUD RUN - ADMIN APP                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   React     │  │   Node.js   │  │   Microsoft Entra ID    │  │   │
│  │  │   Punkt UI  │  │   Express   │  │   (Azure AD) Auth       │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        FIRESTORE DATABASE                        │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │   │
│  │  │ kartinstanser │  │    steder     │  │    kategorier     │   │   │
│  │  └───────────────┘  └───────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────┼───────────────────────────────┐   │
│  │                     CLOUD STORAGE (Bilder)                       │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  klimaoslo-kart-bilder/                                   │  │   │
│  │  │  ├── steder/{placeId}/bilde.jpg     (stedsbilder)         │  │   │
│  │  │  └── metadata.json                   (cache-timestamps)   │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   CLOUD RUN - KARTWIDGET                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   React     │  │ Google Maps │  │   Bilder fra Cloud      │  │   │
│  │  │   Punkt UI  │  │   JS API    │  │   Storage (cachet)      │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CLOUD SCHEDULER + FUNCTIONS                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  Månedlig jobb (hver 30. dag):                            │  │   │
│  │  │  - Sjekker alle steder med cache >30 dager                │  │   │
│  │  │  - Henter oppdaterte bilder fra Google Places API         │  │   │
│  │  │  - Oppdaterer Cloud Storage og Firestore                  │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        KLIMAOSLO.NO (WordPress)                         │
│                                                                         │
│  <iframe src="https://kart.klimaoslo.no/badstuer" />                   │
│  <iframe src="https://kart.klimaoslo.no/sykkelreparasjon" />           │
│  <iframe src="https://kart.klimaoslo.no/bruktbutikker" />              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Admin-verktøy

### Hovedfunksjoner

#### 1. Dashboard
```
┌─────────────────────────────────────────────────────────────────────────┐
│  KLIMAOSLO KARTADMIN                      [Magnus Lundstein ▼] [Logg ut]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DINE KARTINSTANSER                                    [+ Nytt kart]    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │ 🗺️ Badstuer i Oslo │  │ 🗺️ Sykkelverksteder│  │ 🗺️ Bruktbutikker│ │
│  │                     │  │                     │  │                  │ │
│  │ 24 steder           │  │ 18 steder           │  │ 42 steder        │ │
│  │ 5 kategorier        │  │ 3 kategorier        │  │ 6 kategorier     │ │
│  │                     │  │                     │  │                  │ │
│  │ Sist endret:        │  │ Sist endret:        │  │ Sist endret:     │ │
│  │ 2. jan 2026         │  │ 15. des 2025        │  │ 8. jan 2026      │ │
│  │                     │  │                     │  │                  │ │
│  │ [Rediger] [Forhånds]│  │ [Rediger] [Forhånds]│  │ [Rediger] [Forh] │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2. Opprett/Rediger kartinstans
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Tilbake til dashboard                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  REDIGER KART: Badstuer i Oslo                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─ GRUNNINNSTILLINGER ────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Kartnavn:        [Badstuer i Oslo                          ]   │   │
│  │  URL-slug:        [badstuer                                 ]   │   │
│  │  Beskrivelse:     [Oversikt over badstuer i Oslo-området    ]   │   │
│  │                                                                  │   │
│  │  Startposisjon:   Lat: [59.9139]  Lng: [10.7522]  Zoom: [12]   │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ KATEGORIER ────────────────────────────────────────────────────┐   │
│  │                                                   [+ Ny kategori]│   │
│  │                                                                  │   │
│  │  ● Sjøbadstu        [#6FE9FF] ████████  [Rediger] [Slett]       │   │
│  │  ● Elvebadstu       [#034B45] ████████  [Rediger] [Slett]       │   │
│  │  ● Bybadstu         [#FF8274] ████████  [Rediger] [Slett]       │   │
│  │  ● Skogbadstu       [#F9C66B] ████████  [Rediger] [Slett]       │   │
│  │  ● Båtbadstu        [#2A2859] ████████  [Rediger] [Slett]       │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ STEDER (24) ───────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  [Se "Legg til steder" under]                                   │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Lagre endringer]  [Forhåndsvis kart]  [Hent embed-kode]              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3. Legg til steder (med søk)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  LEGG TIL STEDER                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Badstuer i Oslo                                           🔎 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📍 Søk etter type sted (f.eks. "Badstuer i Oslo")                     │
│  📍 Eller søk etter spesifikt sted (f.eks. "KOK Oslo Sauna")           │
│                                                                         │
│  ┌─ SØKERESULTATER (8 treff) ──────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │  □  KOK Oslo Sauna, Aker Brygge                            │ │   │
│  │  │     Stranden 3, 0250 Oslo                                  │ │   │
│  │  │     ⭐ 4.6 · Badstue · Åpent til 22:00                     │ │   │
│  │  │                                                            │ │   │
│  │  │     Velg kategori: [Sjøbadstu        ▼]    [+ Legg til]    │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │  □  Oslo Badstuforening, Bogstad                           │ │   │
│  │  │     Ankerveien 117, 0766 Oslo                              │ │   │
│  │  │     ⭐ 4.8 · Badstue · Stengt nå                           │ │   │
│  │  │                                                            │ │   │
│  │  │     Velg kategori: [Skogbadstu       ▼]    [+ Legg til]    │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │  ✓  Sukkerbiten Badstue                      ALLEREDE LAGT │ │   │
│  │  │     Operagata 71, 0194 Oslo                       TIL      │ │   │
│  │  │     ⭐ 4.5 · Badstue                                       │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │                                          [Vis flere resultater] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ VALGTE STEDER (2) ─────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ● KOK Oslo Sauna, Aker Brygge        Sjøbadstu        [Fjern]  │   │
│  │  ● Oslo Badstuforening, Bogstad       Skogbadstu       [Fjern]  │   │
│  │                                                                  │   │
│  │                            [Legg til 2 steder i kartet]         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 4. Administrer eksisterende steder
```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEDER I KARTET (24)                               [+ Legg til steder] │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Filtrer: [Alle kategorier ▼]    Søk: [________________]               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Navn                      │ Kategori    │ Rating │ Handlinger   │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  KOK Oslo Sauna, Aker B.   │ ● Sjøbadstu │ ⭐ 4.6 │ [✎] [🗑️]    │  │
│  │  KOK Oslo Sauna, Langkaia  │ ● Sjøbadstu │ ⭐ 4.5 │ [✎] [🗑️]    │  │
│  │  Sukkerbiten Badstue       │ ● Sjøbadstu │ ⭐ 4.5 │ [✎] [🗑️]    │  │
│  │  Lilleborg elvebadstue     │ ● Elvebadstu│ ⭐ 4.7 │ [✎] [🗑️]    │  │
│  │  Oslo Badstuforening, Bo.  │ ● Skogbadstu│ ⭐ 4.8 │ [✎] [🗑️]    │  │
│  │  ...                       │             │        │              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Viser 1-10 av 24                              [← Forrige] [Neste →]   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 5. Tips-håndtering (brukerinnspill)

Brukere kan sende inn tips via "Tips oss"-knappen i kartwidgeten. Tips sendes inn med verifisert Google Places-data for enklere godkjenning.

**Widget: Tips-skjema med Google Places autocomplete**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Tips oss om et sted                                              ✕    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Søk etter sted                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  fretex major                                                    │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  Fretex Majorstuen                                               │  │
│  │  Bogstadveien 30, Oslo, Norway                                   │  │
│  │──────────────────────────────────────────────────────────────────│  │
│  │  Fretex Bislett                                                  │  │
│  │  Pilestredet 56, Oslo, Norway                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Kategori                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Klær                                                         ▼  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         Send inn                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

Når bruker velger et sted fra autocomplete-listen:
- placeId lagres sammen med tipset
- Navn og adresse hentes automatisk fra Google

**Admin: Oversikt over innkomne tips**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  TIPS FRA BRUKERE                                      [3 nye tips]    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Filter: [● Nye (3)] [Godkjent] [Avvist] [Alle]                        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🆕 NY                                          8. jan 2026 14:32 │  │
│  │  ────────────────────────────────────────────────────────────────│  │
│  │  Kart:        Bruktbutikker i Oslo                               │  │
│  │  Sted:        Fretex Majorstuen                                  │  │
│  │  Adresse:     Bogstadveien 30, Oslo                              │  │
│  │  Foreslått kategori: Klær                                        │  │
│  │                                                                  │  │
│  │  [✓ Godkjenn og legg til]  [✕ Avvis]                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Fordeler med ny tips-flyt:**
- Brukere velger verifiserte Google Places-oppføringer
- Ett-klikks godkjenning for admin (placeId allerede verifisert)
- Stedet legges automatisk til i kartet ved godkjenning
- Ingen manuell søking/verifisering nødvendig

**Varsling om nye tips:**
- Badge på dashboard: "X nye tips"
- Chip i Tips-seksjonen med Punkt-styling

#### 6. Embed-kode generator
```
┌─────────────────────────────────────────────────────────────────────────┐
│  EMBED-KODE FOR: Badstuer i Oslo                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Kopier denne koden og lim inn i WordPress:                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  <iframe                                                         │  │
│  │    src="https://kart.klimaoslo.no/badstuer"                     │  │
│  │    width="100%"                                                  │  │
│  │    height="600"                                                  │  │
│  │    frameborder="0"                                               │  │
│  │    title="Kart over badstuer i Oslo"                            │  │
│  │  ></iframe>                                                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                           [Kopier kode] │
│                                                                         │
│  Direkte lenke: https://kart.klimaoslo.no/badstuer         [Kopier]    │
│                                                                         │
│  ┌─ AVANSERTE INNSTILLINGER ───────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  □ Skjul søkefelt                                               │   │
│  │  □ Skjul kategorifilter                                         │   │
│  │  □ Skjul sidebar/liste                                          │   │
│  │  □ Vis kun spesifikke kategorier: [________________]            │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Kartwidget

### Funksjoner (bevart fra eksisterende løsning)
- [x] Søk i stedsnavn
- [x] Kategorifiltrering med fargekodet checkboxer
- [x] "Åpen nå"-filter med sanntidssjekk ved aktivering
- [x] Sidebar med liste over steder
- [x] Infovindu med stedsdetaljer (desktop)
- [x] Bottom sheet (mobil)
- [x] Responsivt design
- [x] Fullskjerm-modus

### Nye funksjoner
- [x] Punkt designsystem-komponenter (TipsModal, InfoWindow, MapView, CategoryFilter, skarpe hjørner)
- [ ] Forbedret tilgjengelighet (WCAG 2.1)
- [ ] Mørk modus (følger system/brukerpreferanse)
- [ ] Deling av spesifikt sted (URL med place_id)
- [x] "Tips oss"-skjema integrert med admin
- [x] **Områdesøk** - Søk etter nabolag/bydel for å finne tilbud i nærheten

### Områdesøk (ny funksjon)

Brukere kan søke etter områder/nabolag i tillegg til stedsnavn. Når de velger et område, zoomer kartet inn slik at de ser tilbudene i nabolaget sitt.

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Søk sted eller område...                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ FORSLAG ───────────────────────────────────────────────────────┐
│                                                                  │
│  📍 OMRÅDER                                                      │
│  ├─ Sagene, Oslo                                                │
│  ├─ Sagene bad                                                  │
│  └─ Sagene kirke                                                │
│                                                                  │
│  🏪 STEDER I KARTET                                              │
│  └─ Sagene Folkebad Badstue                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Når bruker velger "Sagene, Oslo":**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📍 Sagene                                                  [✕]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────┐  ┌────────────────────────────────────────────┐   │
│  │                 │  │                                            │   │
│  │  Lilleborg      │  │      [Kartet har zoomet inn til Sagene]   │   │
│  │  elvebadstue    │  │                                            │   │
│  │                 │  │              ●  Lilleborg                  │   │
│  │  Oslo Badstu-   │  │                                            │   │
│  │  forening,      │  │                      ●  Sagene Folkebad    │   │
│  │  Sagene         │  │                                            │   │
│  │                 │  │                                            │   │
│  │                 │  │    Brukeren ser nå tilbudene               │   │
│  │                 │  │    i sitt nabolag                          │   │
│  │                 │  │                                            │   │
│  └─────────────────┘  └────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Teknisk implementasjon:**
- Google Places Autocomplete med `types: ['neighborhood', 'sublocality', 'postal_code', 'locality']`
- Bounds begrenset til Oslo-området
- Ved valg: `map.panTo(område.geometry.location)` + `map.setZoom(14-15)`
- URL-parameter for deling: `?område=sagene`

### Teknisk flyt
```
1. Widget lastes med kartinstans-slug (f.eks. /badstuer)
           │
           ▼
2. Hent kartinstans-config fra Firestore
   (kategorier, farger, innstillinger)
           │
           ▼
3. Hent liste over steder fra Firestore
   (place_id + kategori for hvert sted)
           │
           ▼
4. Batch-kall til Google Places API
   (navn, adresse, åpningstider, bilder, etc.)
           │
           ▼
5. Render kart med markører og sidebar
           │
           ▼
6. Ved aktivering av "Åpen nå"-filter: Hent sanntidsstatus fra Google Places API
```

---

## Database-struktur

### Firestore Collections

#### `kartinstanser`
```javascript
{
  id: "badstuer",                           // URL-slug
  navn: "Badstuer i Oslo",
  beskrivelse: "Oversikt over badstuer...",
  opprettet: Timestamp,
  sisteEndret: Timestamp,
  opprettetAv: "magnus.lundstein@oslo.kommune.no",

  // Kartinnstillinger
  config: {
    senterLat: 59.9139,
    senterLng: 10.7522,
    zoom: 12,
    visApenNaFilter: true,
    visSokefelt: true,
    visSidebar: true
  },

  // Kategorier for dette kartet
  kategorier: [
    {
      id: "sjobadstu",
      navn: "Sjøbadstu",
      farge: "#6FE9FF",
      hoverFarge: "#9AF0FF",
      ikon: "water"           // Valgfritt
    },
    {
      id: "elvebadstu",
      navn: "Elvebadstu",
      farge: "#034B45",
      hoverFarge: "#4F827D"
    },
    // ...
  ]
}
```

#### `steder`
```javascript
{
  id: "auto-generated-id",
  kartinstansId: "badstuer",               // Referanse til kartinstans
  placeId: "ChIJXwZ...",                   // Google Places ID
  kategoriId: "sjobadstu",                 // Referanse til kategori

  // Cache av Google Places-data (oppdateres hver 30. dag)
  cachedData: {
    navn: "KOK Oslo Sauna, Aker Brygge",
    adresse: "Stranden 3, 0250 Oslo",
    lat: 59.9103,
    lng: 10.7295,
    rating: 4.6,
    sisteOppdatering: Timestamp
  },

  // Bildecache (Cloud Storage)
  bildeCache: {
    url: "https://storage.googleapis.com/klimaoslo-kart-bilder/steder/ChIJXwZ.../bilde.jpg",
    cachetTidspunkt: Timestamp,            // Når bildet ble cachet
    utloper: Timestamp,                    // cachetTidspunkt + 30 dager
    originalPhotoReference: "AfLeUg...",   // Google Places photo_reference for oppdatering
    bredde: 400,                           // Lagret bildebredde
    hoyde: 300                             // Lagret bildehøyde
  },

  // Metadata
  opprettet: Timestamp,
  opprettetAv: "rikke.dahl@oslo.kommune.no"
}
```

#### `brukere`
```javascript
{
  id: "magnus.lundstein@oslo.kommune.no",
  navn: "Magnus Lundstein",
  rolle: "admin",                          // "admin" | "redaktor"
  sisteInnlogging: Timestamp
}
```

#### `tips` (brukerinnspill)
```javascript
{
  id: "auto-generated",
  kartinstansId: "bruktbutikker",
  butikknavn: "Fretex Majorstuen",
  adresse: "Bogstadveien 32",
  kategori: "Klær",
  status: "ny",                            // "ny" | "godkjent" | "avvist"
  opprettet: Timestamp,
  behandletAv: null
}
```

---

## API-spesifikasjon

### Admin API (Cloud Run)

#### Autentisering
Alle endepunkter krever gyldig Microsoft Entra ID-token.

```
Authorization: Bearer <azure-ad-token>
```

#### Endpoints

##### Kartinstanser
```
GET    /api/kartinstanser              # Liste alle
GET    /api/kartinstanser/:slug        # Hent én
POST   /api/kartinstanser              # Opprett ny
PUT    /api/kartinstanser/:slug        # Oppdater
DELETE /api/kartinstanser/:slug        # Slett
```

##### Steder
```
GET    /api/kartinstanser/:slug/steder           # Liste steder
POST   /api/kartinstanser/:slug/steder           # Legg til sted(er)
DELETE /api/kartinstanser/:slug/steder/:id       # Fjern sted
PUT    /api/kartinstanser/:slug/steder/:id       # Oppdater kategori
```

##### Google Places (proxy)
```
GET    /api/places/search?query=...              # Text Search
GET    /api/places/autocomplete?input=...        # Autocomplete
GET    /api/places/details?placeId=...           # Place Details
```

##### Tips
```
GET    /api/tips                                  # Liste alle tips
PUT    /api/tips/:id                             # Behandle tips
```

##### Bildecache (intern)
```
POST   /api/images/cache                          # Cache bilde for et sted
GET    /api/images/refresh-expired                # Oppdater utløpte bilder (brukes av Cloud Scheduler)
DELETE /api/images/:placeId                       # Slett cachet bilde
```

### Widget API (offentlig)

```
GET    /api/public/kartinstanser/:slug           # Hent kartconfig
GET    /api/public/kartinstanser/:slug/steder    # Hent steder
GET    /api/public/places/details?placeId=X      # Hent stedsdetaljer (åpningstider, bilder, etc.)
GET    /api/public/places/open-now-batch?placeIds=X,Y,Z  # Batch-sjekk åpen nå-status
POST   /api/public/tips                          # Send inn tips
```

---

## Autentisering

### Microsoft Entra ID (Azure AD)

#### Oppsett
1. Registrer app i Azure AD (Oslo kommune tenant)
2. Konfigurer tillatte domener: `@oslo.kommune.no`
3. Sett opp redirect URIs for admin-app

#### Flyt
```
1. Bruker åpner admin.kart.klimaoslo.no
           │
           ▼
2. Redirect til Microsoft-innlogging
           │
           ▼
3. Bruker logger inn med @oslo.kommune.no
           │
           ▼
4. Callback med auth code
           │
           ▼
5. Backend bytter code mot tokens
           │
           ▼
6. Bruker får tilgang til admin-panel
```

#### Roller
| Rolle    | Rettigheter                                      |
|----------|--------------------------------------------------|
| Admin    | Full tilgang, kan administrere brukere           |
| Redaktør | Kan opprette/redigere kart og steder            |

---

## Teknisk stack

### Frontend (Admin + Widget)
| Teknologi          | Versjon | Formål                          |
|--------------------|---------|----------------------------------|
| React              | 18.x    | UI-rammeverk                    |
| TypeScript         | 5.x     | Type-sikkerhet                  |
| @oslokommune/punkt-react | latest | Designsystem-komponenter  |
| @oslokommune/punkt-css   | latest | Styling                   |
| Google Maps JS API | latest  | Kartvisning                     |
| Vite               | 5.x     | Build tool                      |

### Backend
| Teknologi          | Versjon | Formål                          |
|--------------------|---------|----------------------------------|
| Node.js            | 20.x    | Runtime                         |
| Express            | 4.x     | HTTP-server                     |
| Firebase Admin SDK | latest  | Firestore-tilgang               |
| @azure/msal-node   | latest  | Azure AD-integrasjon            |

### Infrastruktur
| Tjeneste           | Formål                               |
|--------------------|--------------------------------------|
| Cloud Run          | Hosting av admin-app og widget      |
| Firestore          | Database                            |
| **Cloud Storage**  | **Bildecache (stedsbilder)**        |
| **Cloud Scheduler**| **Månedlig oppdatering av bildecache** |
| **Cloud Functions**| **Bildeoppdateringsjobb**           |
| Cloud Build        | CI/CD                               |
| Secret Manager     | API-nøkler og secrets               |
| Cloud DNS          | Domene-håndtering                   |

### Domener
| Domene                        | Formål              |
|-------------------------------|---------------------|
| kart.klimaoslo.no             | Kartwidget          |
| admin.kart.klimaoslo.no       | Admin-panel         |

---

## API-sikkerhet

### Separerte API-nøkler

Vi bruker **to separate Google API-nøkler** for å minimere risiko:

| Nøkkel | Eksponert? | Bruk | Sikring |
|--------|------------|------|---------|
| **Frontend** | Ja (i JS-bundle) | Maps JavaScript API | HTTP referrer-restriksjoner |
| **Backend** | Nei (kun server) | Places API | Ingen eksponering, kun på server |

### Frontend-nøkkel

Synlig i browser, men begrenset til:
- **Domener:** kart.klimaoslo.no, admin.kart.klimaoslo.no, localhost
- **API-er:** Kun Maps JavaScript API

### Backend-nøkkel

Lagret i Google Secret Manager, brukes kun av:
- Cloud Run API-tjeneste
- Cloud Functions (bildeoppdatering)

### Rate limiting

Offentlige endepunkter er beskyttet mot misbruk:

```
/api/public/places/autocomplete    → 30 req/min per IP
/api/public/places/details         → 30 req/min per IP
/api/public/places/open-now-batch  → 30 req/min per IP
/api/public/tips                   → 5 req/min per IP
```

Implementert med `express-rate-limit` i `apps/backend/src/routes/public.ts`.

### Input-validering

- Autocomplete-søk begrenset til 100 tegn
- Tips-skjema validerer påkrevde felt
- PlaceId valideres mot Google Places API

---

## Implementeringsplan

### Fase 1: Grunnlag (FULLFORT)
- [x] Sette opp Google Cloud-prosjekt (bruktbutikk-navn)
- [x] Konfigurere Firestore-database (europe-west1, native mode)
- [x] Aktivere nodvendige API-er (Places, Maps JavaScript)
- [ ] Sette opp Cloud Run-tjenester
- [ ] **Opprette Cloud Storage bucket for bildecache** (klimaoslo-kart-bilder)
- [ ] Konfigurere Microsoft Entra ID-integrasjon
- [ ] Sette opp CI/CD med Cloud Build

### Fase 2: Admin-verktoy (MVP) - PAGAENDE (90% ferdig)
- [x] Dashboard med oversikt over kartinstanser
- [x] Opprett/rediger kartinstans
- [x] Legg til kategorier med farger
- [x] Sok etter steder (Text Search via Google Places API)
- [x] Legg til steder med kategorivelger
- [x] Vis eksisterende steder i tabell
- [x] Fjern steder fra kartinstans
- [x] Backend cacher stedsdata automatisk fra Google Places
- [x] Embed-kode generator med avanserte innstillinger
- [ ] Innlogging med Oslo kommune-konto (Azure AD) <- Kan vente til produksjon

### Fase 3: Kartwidget - FULLFORT
- [x] Implementer Google Maps-visning med markorer og InfoWindow
- [x] Hent data fra backend API (hooks: useKartinstans, useSteder)
- [x] Kategorifilter med fargekodet checkboxer
- [x] Sidebar med stedsliste (desktop)
- [x] Responsivt design (bottom sheet pa mobil)
- [x] "Apen na"-filter
- [x] Tips-modal for brukerinnspill
- [x] URL-parameter parsing for embed-innstillinger
- [x] Omradesok med Google Places Autocomplete
- [x] Sidebar filtrering basert pa valgt omrade
- [x] Klikk i sidebar zoomer til sted og apner InfoWindow
- [ ] Punkt designsystem-komponenter <- Kan vente til lansering

### Fase 4: Bildecaching (NY)
- [ ] **Opprette Cloud Storage bucket** (klimaoslo-kart-bilder, europe-west1)
- [ ] **Konfigurere bucket som offentlig lesbar** (for widget-tilgang)
- [ ] **Implementere bildenedlasting i backend** ved opprettelse av sted
- [ ] **Oppdatere steder-schema** med bildeCache-felt
- [ ] **Lage Cloud Function** for oppdatering av utløpte bilder
- [ ] **Sette opp Cloud Scheduler** (kjører hver 30. dag)
- [ ] **Oppdatere widget** til å bruke cachede bilder fra Cloud Storage
- [ ] **Migrere eksisterende steder** - cache bilder for alle eksisterende steder

### Fase 5: Lansering
- [ ] Migrere eksisterende kartdata
- [ ] Oppdatere embed-koder pa klimaoslo.no
- [ ] Dokumentasjon for redaksjonen
- [ ] Opplæring av brukere

### Fase 6: Forbedringer
- [ ] Tips-handtering i admin
- [ ] Statistikk/analyse
- [ ] Bulk-import fra CSV
- [ ] Eksport-funksjonalitet

---

## Kostnadsestimat (Google Cloud)

| Tjeneste           | Estimert månedlig kostnad |
|--------------------|---------------------------|
| Cloud Run (2 tjenester) | ~$10-30             |
| Firestore          | ~$5-15                    |
| **Cloud Storage**  | **~$1-5** (bildecache)    |
| **Cloud Scheduler**| **~$0.10** (1 jobb/måned) |
| **Cloud Functions**| **~$0-1** (lav bruk)      |
| Google Maps API    | **Betydelig redusert***   |
| Secret Manager     | ~$1                       |
| **Total**          | **~$20-55**               |

### Kostnadsbesparelse med bildecaching

| Scenario | Uten bildecaching | Med bildecaching (30 dager) |
|----------|-------------------|----------------------------|
| 100 steder, 1000 visninger/dag | ~3000 Places Photo API-kall/dag | ~3-4 kall/måned |
| Google Places Photo API-kostnad | ~$21/dag ($630/måned) | ~$0.02/måned |
| **Årlig besparelse** | - | **~$7,500** |

*Merk: Google Places API Photo-kall koster $7 per 1000 kall. Med bildecaching reduseres dette til kun oppdateringskall hver 30. dag.*

**Cloud Storage-kostnader (bildecache):**
- Lagring: $0.02/GB/måned (estimert 1-5 GB for 500 steder)
- Utgående trafikk: $0.12/GB (gratis de første 1 GB/måned)
- Totalt: ~$1-5/måned avhengig av antall steder og trafikk

---

## Bildecaching-arkitektur

### Problemstilling

Den nåværende løsningen (og tidligere leverandør-hostet versjon) henter bilder fra Google Places API hver gang kartet lastes. Dette medfører:
- **Høye API-kostnader**: Google Places Photo API koster $7 per 1000 kall
- **Ved 100 steder og 1000 daglige visninger**: ~$630/måned i bildekostnader alene
- **Unødvendig båndbreddebruk**: Samme bilder lastes tusenvis av ganger

### Løsning: Lokal bildecaching med 30 dagers varighet

Google Places API tillater caching av data i opptil 30 dager. Vi implementerer en bildecache-løsning som:
1. Lagrer bilder i Cloud Storage ved første nedlasting
2. Serverer bilder fra Cloud Storage i stedet for Google Places
3. Oppdaterer bilder automatisk hver 30. dag

### Arkitekturflyt

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     BILDECACHING - DATAFLYT                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. NYTT STED LEGGES TIL I ADMIN                                        │
│  ───────────────────────────────────────────────────────────────────    │
│                                                                         │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────────────────────┐ │
│  │  Admin   │────▶│   Backend    │────▶│  Google Places API          │ │
│  │  legger  │     │  POST /steder│     │  - Hent stedsdata           │ │
│  │  til sted│     │              │     │  - Hent photo_reference     │ │
│  └──────────┘     └──────┬───────┘     └─────────────────────────────┘ │
│                          │                                              │
│                          ▼                                              │
│                   ┌──────────────┐                                      │
│                   │  Google      │                                      │
│                   │  Places      │                                      │
│                   │  Photo API   │  (Kun denne ene gangen!)             │
│                   └──────┬───────┘                                      │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CLOUD STORAGE                                  │  │
│  │  klimaoslo-kart-bilder/                                          │  │
│  │  └── steder/                                                      │  │
│  │      └── ChIJXwZ.../                                             │  │
│  │          └── bilde.jpg  (400x300, optimalisert)                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      FIRESTORE                                    │  │
│  │  steder/{id}/bildeCache: {                                       │  │
│  │    url: "https://storage.../ChIJXwZ.../bilde.jpg",              │  │
│  │    cachetTidspunkt: 2026-01-11T12:00:00Z,                       │  │
│  │    utloper: 2026-02-10T12:00:00Z,  // +30 dager                 │  │
│  │    originalPhotoReference: "AfLeUg..."                          │  │
│  │  }                                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  2. BRUKER ÅPNER KARTET (WIDGET)                                        │
│  ───────────────────────────────────────────────────────────────────    │
│                                                                         │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────────────────────┐ │
│  │  Widget  │────▶│   Backend    │────▶│  Firestore                  │ │
│  │  laster  │     │  GET /steder │     │  Returnerer bildeCache.url  │ │
│  │  kart    │     │              │     │  (Cloud Storage URL)        │ │
│  └──────────┘     └──────────────┘     └─────────────────────────────┘ │
│       │                                                                 │
│       │  <img src="https://storage.googleapis.com/                     │
│       │        klimaoslo-kart-bilder/steder/ChIJXwZ.../bilde.jpg">    │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CLOUD STORAGE                                  │  │
│  │  (Serverer bildet direkte - ingen Places API-kall!)              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  3. MÅNEDLIG OPPDATERING (CLOUD SCHEDULER + FUNCTION)                   │
│  ───────────────────────────────────────────────────────────────────    │
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────────────┐  │
│  │   Cloud      │────▶│   Cloud      │────▶│  For hvert sted der   │  │
│  │   Scheduler  │     │   Function   │     │  utloper < nå:        │  │
│  │   (dag 1/30) │     │              │     │  - Hent nytt bilde    │  │
│  └──────────────┘     └──────────────┘     │  - Oppdater Storage   │  │
│                                            │  - Oppdater Firestore │  │
│                                            └───────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cloud Storage Bucket-konfigurasjon

```bash
# Opprett bucket
gsutil mb -l europe-west1 gs://klimaoslo-kart-bilder

# Sett offentlig lesetilgang (for widget)
gsutil iam ch allUsers:objectViewer gs://klimaoslo-kart-bilder

# Sett CORS for widget-tilgang
gsutil cors set cors.json gs://klimaoslo-kart-bilder
```

**cors.json:**
```json
[
  {
    "origin": ["https://kart.klimaoslo.no", "http://localhost:3001"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

### Backend-implementasjon

#### Bildecaching ved opprettelse av sted

```typescript
// apps/backend/src/services/imageCache.ts

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
    // Ignorer feil hvis filen ikke finnes
    console.warn(`Could not delete image for ${placeId}:`, error);
  }
}
```

#### Oppdatert steder-rute

```typescript
// apps/backend/src/routes/steder.ts (oppdatert)

import { cacheStedBilde, deleteStedBilde } from '../services/imageCache';

router.post('/:slug/steder', authMiddleware, async (req, res) => {
  const { slug } = req.params;
  const { placeId, kategoriId } = req.body;

  try {
    // Hent stedsdetaljer fra Google Places
    const placeDetails = await getPlaceDetails(placeId);

    // Cache bildet hvis stedet har bilder
    let bildeCache = null;
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photoReference = placeDetails.photos[0].photo_reference;
      bildeCache = await cacheStedBilde(placeId, photoReference);
    }

    // Lagre sted i Firestore
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
      bildeCache, // Ny: bildecache-data
      opprettet: new Date(),
      opprettetAv: req.user.email,
    };

    const docRef = await db.collection('steder').add(stedData);

    res.status(201).json({ id: docRef.id, ...stedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ved sletting av sted, slett også cachet bilde
router.delete('/:slug/steder/:stedId', authMiddleware, async (req, res) => {
  const { slug, stedId } = req.params;

  try {
    const stedDoc = await db.collection('steder').doc(stedId).get();
    if (stedDoc.exists) {
      const stedData = stedDoc.data();

      // Slett cachet bilde
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

### Cloud Function for månedlig oppdatering

```typescript
// apps/backend/src/functions/refreshExpiredImages.ts

import * as functions from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import { cacheStedBilde } from '../services/imageCache';

const db = new Firestore();

functions.http('refreshExpiredImages', async (req, res) => {
  const now = new Date();

  try {
    // Finn alle steder med utløpt bildecache
    const expiredSteder = await db
      .collection('steder')
      .where('bildeCache.utloper', '<=', now)
      .get();

    console.log(`Found ${expiredSteder.size} steder with expired image cache`);

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const doc of expiredSteder.docs) {
      const sted = doc.data();

      try {
        // Oppdater bildecachen
        const newBildeCache = await cacheStedBilde(
          sted.placeId,
          sted.bildeCache.originalPhotoReference
        );

        // Oppdater Firestore
        await doc.ref.update({ bildeCache: newBildeCache });

        results.updated++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${sted.placeId}: ${error.message}`);
      }
    }

    console.log('Image refresh completed:', results);
    res.json(results);
  } catch (error) {
    console.error('Image refresh failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Cloud Scheduler-konfigurasjon

```bash
# Opprett Cloud Scheduler-jobb som kjører hver 30. dag
gcloud scheduler jobs create http refresh-image-cache \
  --location=europe-west1 \
  --schedule="0 3 1 * *" \
  --uri="https://europe-west1-bruktbutikk-navn.cloudfunctions.net/refreshExpiredImages" \
  --http-method=GET \
  --oidc-service-account-email=scheduler@bruktbutikk-navn.iam.gserviceaccount.com \
  --description="Oppdaterer utløpte bilder i kartplattformen hver måned"
```

### Widget-oppdatering

Widgeten trenger minimal endring - den bruker allerede `bildeCache.url` fra Firestore:

```tsx
// apps/widget/src/components/InfoWindowContent.tsx

// Bildet lastes nå fra Cloud Storage i stedet for Google Places
{placeDetails.bildeCache?.url && (
  <img
    src={placeDetails.bildeCache.url}
    alt={placeDetails.navn}
    className="pkt-info-window__image"
    loading="lazy"
  />
)}
```

### Migreringsscript for eksisterende steder

```typescript
// scripts/migrateExistingImages.ts

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

### Google Places API-vilkår

**Viktig:** Google Places API tillater caching av data i **inntil 30 dager**. Denne løsningen overholder vilkårene ved å:
- Cache bilder i maksimalt 30 dager
- Automatisk oppdatere utløpte bilder
- Beholde referanse til originaldata (`originalPhotoReference`)

Se: [Google Places API Policies](https://developers.google.com/maps/documentation/places/web-service/policies)

---

## UI-migreringsplan: Punkt designsystem

### Oversikt

Migrering av kartwidget og admin-app til Punkt designsystem for konsistent Oslo kommune-design. Denne planen dekker widget-appen først, deretter admin-appen.

### Installasjon av Punkt

Følgende pakker må installeres i både widget og admin:

```bash
# I apps/widget og apps/admin
npm add @oslokommune/punkt-react
npm add @oslokommune/punkt-css
npm add @oslokommune/punkt-assets
npm add -D sass
```

### SCSS-oppsett

Opprett `apps/widget/src/styles/main.scss`:

```scss
/* Overstyr stien til fontene */
@use "@oslokommune/punkt-css/dist/scss/abstracts/variables" with (
  $font-path: "@oslokommune/punkt-assets/dist"
);

/* Hent inn Punkts stiler */
@use "@oslokommune/punkt-css/dist/scss/pkt";

/* App-spesifikke stiler (kart, layout etc.) */
@use "./app";
```

I `apps/widget/src/styles/_app.scss`, importer nødvendige mixins:

```scss
@use "sass:map";
@use "@oslokommune/punkt-css/dist/scss/abstracts/variables" as pkt;
@use "@oslokommune/punkt-css/dist/scss/abstracts/mixins/breakpoints" as *;
@use "@oslokommune/punkt-css/dist/scss/abstracts/mixins/typography" as *;

// Bruk typography mixin for konsistent typografi
.info-window__header h3 {
  @include get-text("pkt-txt-18-medium");
}
```

### Widget-komponenter: Migreringsplan

#### 1. SearchBar.tsx

**Nåværende:** Custom `<input>` med CSS-styling
**Punkt-erstatning:** `PktTextinput`

```tsx
// Fra:
<input type="text" className="search-input" placeholder="Søk..." />

// Til:
import { PktTextinput } from '@oslokommune/punkt-react'

<PktTextinput
  label="Søk"
  name="search"
  placeholder="Søk sted eller område..."
  id="search-input"
  hideLabel  // Visuelt skjult label for kompakt visning
/>
```

**Merknad:** Autocomplete-dropdown må beholde custom styling da Punkt ikke har en dedikert autocomplete-komponent.

#### 2. CategoryFilter.tsx

**Nåværende:** Custom `<label>` med `<input type="checkbox">`
**Punkt-erstatning:** `PktCheckbox`

```tsx
// Fra:
<label className="category-label">
  <input type="checkbox" checked={...} onChange={...} />
  <span className="category-dot" style={{ backgroundColor: farge }} />
  {navn}
</label>

// Til:
import { PktCheckbox } from '@oslokommune/punkt-react'

<PktCheckbox
  label={navn}
  name={`kategori-${id}`}
  id={`kategori-${id}`}
  checked={selected.has(id)}
  onChange={() => toggleCategory(id)}
/>
// Fargeprikk må legges til via custom CSS eller som del av label
```

**Utfordring:** Punkt-checkbox har ikke innebygd støtte for fargeindikatorer. Løsning:
- Alternativ A: Wrap PktCheckbox med custom element som inkluderer fargeprikk
- Alternativ B: Bruk custom CSS på label for å legge til fargeprikk via `::before`

#### 3. TipsModal.tsx

**Nåværende:** Custom modal med `<input>`, `<select>`, `<button>`
**Punkt-erstatninger:**
- Modal-wrapper: Custom (Punkt har ikke modal-komponent)
- Input: `PktTextinput`
- Select: `PktSelect`
- Button: `PktButton`
- Success/Error: `PktAlert`

```tsx
import { PktTextinput, PktSelect, PktButton, PktAlert } from '@oslokommune/punkt-react'

// Input-felt
<PktTextinput
  label="Navn på stedet"
  name="butikknavn"
  id="butikknavn"
  value={butikknavn}
  onChange={(e) => setButikknavn(e.target.value)}
  required
/>

// Select
<PktSelect
  label="Kategori"
  name="kategori"
  id="kategori"
  value={kategori}
  onChange={(e) => setKategori(e.target.value)}
>
  {kategorier.map((kat) => (
    <option key={kat.id} value={kat.id}>{kat.navn}</option>
  ))}
</PktSelect>

// Knapp
<PktButton
  text={status === 'sending' ? 'Sender...' : 'Send inn'}
  appearance="primary"
  size="medium"
  disabled={status === 'sending'}
  type="submit"
/>

// Feilmelding
{status === 'error' && (
  <PktAlert skin="error">{errorMessage}</PktAlert>
)}

// Suksessmelding
{status === 'success' && (
  <PktAlert skin="success">Takk for tipset!</PktAlert>
)}
```

#### 4. Sidebar.tsx

**Nåværende:** Custom `<ul>/<li>` liste
**Punkt-erstatning:** Beholder custom struktur, men bruker Punkt-typografi og spacing

```tsx
// Bruker Punkt CSS-klasser for spacing og typografi
<div className="sidebar">
  <ul className="pkt-list">
    {steder.map((sted) => (
      <li className="pkt-list__item">
        {/* Innhold med Punkt-typografi */}
        <span className="pkt-txt-18-medium">{sted.cachedData.navn}</span>
        <span className="pkt-txt-14">{sted.cachedData.adresse}</span>
      </li>
    ))}
  </ul>
</div>
```

#### 5. BottomSheet.tsx

**Nåværende:** Custom bottom sheet for mobil
**Punkt-erstatning:** Beholder custom struktur, bruker Punkt-komponenter innvendig

```tsx
import { PktButton, PktLink } from '@oslokommune/punkt-react'

// Lukkeknapp
<PktButton
  appearance="tertiary"
  size="small"
  iconName="close"
  variant="icon-only"
  onClick={onClose}
  aria-label="Lukk"
/>

// Lenker
<PktLink href={placeDetails.nettside} target="_blank">
  Besøk nettside
</PktLink>

<PktLink href={placeDetails.googleMapsUrl} target="_blank">
  Få veibeskrivelse
</PktLink>
```

#### 6. MapView.tsx

**Nåværende:** Custom checkbox for "Åpen nå"-filter
**Punkt-erstatning:** `PktCheckbox`

```tsx
import { PktCheckbox } from '@oslokommune/punkt-react'

<div className="open-now-control">
  <PktCheckbox
    label="Åpen nå"
    name="open-now"
    id="open-now"
    checked={openNowFilter}
    onChange={(e) => onOpenNowChange(e.target.checked)}
  />
</div>
```

#### 7. InfoWindow (stedsdetaljer på desktop) → InfoWindowContent.tsx

**Nåværende:** HTML-streng i Google Maps InfoWindow med custom CSS
**Punkt-erstatning:** Ny React-komponent med Punkt-komponenter, rendret i InfoWindow via `createRoot`

**Ny fil: `apps/widget/src/components/InfoWindowContent.tsx`**

```tsx
import { PktLink, PktButton } from '@oslokommune/punkt-react'
import type { PlaceDetails } from '@klimaoslo-kart/shared'

interface InfoWindowContentProps {
  placeDetails: PlaceDetails
  onClose?: () => void
}

export function InfoWindowContent({ placeDetails, onClose }: InfoWindowContentProps) {
  return (
    <article className="pkt-info-window">
      <header className="pkt-info-window__header">
        <h3 className="pkt-txt-18-medium">{placeDetails.navn}</h3>
        {onClose && (
          <PktButton
            appearance="tertiary"
            size="small"
            iconName="close"
            variant="icon-only"
            onClick={onClose}
            aria-label="Lukk"
          />
        )}
      </header>

      {placeDetails.bilder?.[0] && (
        <img
          src={placeDetails.bilder[0]}
          alt={placeDetails.navn}
          className="pkt-info-window__image"
        />
      )}

      <dl className="pkt-info-window__details">
        <div className="pkt-info-window__detail-row">
          <dt className="pkt-txt-14-medium">Adresse</dt>
          <dd className="pkt-txt-14">{placeDetails.adresse}</dd>
        </div>

        {placeDetails.apningstider && (
          <div className="pkt-info-window__detail-row">
            <dt className="pkt-txt-14-medium">Åpningstider</dt>
            <dd className="pkt-txt-14">
              <ul className="pkt-info-window__hours">
                {placeDetails.apningstider.map((time, i) => (
                  <li key={i}>{time}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {placeDetails.telefon && (
          <div className="pkt-info-window__detail-row">
            <dt className="pkt-txt-14-medium">Telefon</dt>
            <dd className="pkt-txt-14">
              <PktLink href={`tel:${placeDetails.telefon}`}>
                {placeDetails.telefon}
              </PktLink>
            </dd>
          </div>
        )}

        {placeDetails.rating && (
          <div className="pkt-info-window__detail-row">
            <dt className="pkt-txt-14-medium">Vurdering</dt>
            <dd className="pkt-txt-14">⭐ {placeDetails.rating.toFixed(1)}</dd>
          </div>
        )}
      </dl>

      <nav className="pkt-info-window__actions">
        {placeDetails.nettside && (
          <PktLink
            href={placeDetails.nettside}
            target="_blank"
            iconName="external-link"
            iconPosition="right"
          >
            Besøk nettside
          </PktLink>
        )}
        {placeDetails.googleMapsUrl && (
          <PktLink
            href={placeDetails.googleMapsUrl}
            target="_blank"
            iconName="external-link"
            iconPosition="right"
          >
            Få veibeskrivelse
          </PktLink>
        )}
      </nav>
    </article>
  )
}
```

**Oppdatert MapView.tsx - rendering av InfoWindow med React:**

```tsx
import { createRoot, Root } from 'react-dom/client'
import { InfoWindowContent } from './InfoWindowContent'

// I MapView-komponenten, legg til ref for React root
const infoWindowRootRef = useRef<Root | null>(null)

// I marker click handler, erstatt HTML-streng med React-rendering:
marker.addListener('click', () => {
  // ... eksisterende logikk for å hente placeDetails ...

  const showInfoWindow = (placeDetails: PlaceDetails) => {
    if (window.innerWidth >= 600 && infoWindowRef.current) {
      // Opprett container div
      const container = document.createElement('div')

      // Unmount tidligere React root hvis den finnes
      if (infoWindowRootRef.current) {
        infoWindowRootRef.current.unmount()
      }

      // Opprett ny React root og render komponenten
      infoWindowRootRef.current = createRoot(container)
      infoWindowRootRef.current.render(
        <InfoWindowContent
          placeDetails={placeDetails}
          onClose={() => infoWindowRef.current?.close()}
        />
      )

      // Sett innholdet i Google Maps InfoWindow
      infoWindowRef.current.setContent(container)
      infoWindowRef.current.open(map, marker)
    }
  }

  // ... resten av click handler ...
})

// Cleanup i useEffect return
useEffect(() => {
  return () => {
    if (infoWindowRootRef.current) {
      infoWindowRootRef.current.unmount()
    }
  }
}, [])
```

**Custom SCSS for InfoWindow** (legges til i `_app.scss`):

```scss
@use "sass:map";
@use "@oslokommune/punkt-css/dist/scss/abstracts/variables";

.pkt-info-window {
  max-width: 350px;
  min-width: 280px;
  font-family: var(--pkt-font-family);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: map.get(variables.$pkt-spacing, 8);
    margin-bottom: map.get(variables.$pkt-spacing, 12);

    h3 {
      margin: 0;
      color: map.get(variables.$pkt-colors, "blue-dark");
    }
  }

  &__image {
    width: 100%;
    border-radius: map.get(variables.$pkt-spacing, 8);
    margin-bottom: map.get(variables.$pkt-spacing, 16);
    object-fit: cover;
    max-height: 180px;
  }

  &__details {
    margin: 0;
    margin-bottom: map.get(variables.$pkt-spacing, 16);
  }

  &__detail-row {
    display: flex;
    gap: map.get(variables.$pkt-spacing, 12);
    padding: map.get(variables.$pkt-spacing, 8) 0;
    border-bottom: 1px solid map.get(variables.$pkt-colors, "gray-200");

    &:last-child {
      border-bottom: none;
    }

    dt {
      flex-shrink: 0;
      width: 100px;
      color: map.get(variables.$pkt-colors, "gray-600");
    }

    dd {
      margin: 0;
      flex: 1;
    }
  }

  &__hours {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      padding: 2px 0;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: map.get(variables.$pkt-spacing, 8);
    padding-top: map.get(variables.$pkt-spacing, 8);
    border-top: 1px solid map.get(variables.$pkt-colors, "gray-200");
  }
}

// Overstyr Google Maps InfoWindow-styling
.gm-style-iw {
  padding: map.get(variables.$pkt-spacing, 16) !important;
}

.gm-style-iw-d {
  overflow: visible !important;
}
```

**Fordeler med denne tilnærmingen:**
- Full tilgang til Punkt React-komponenter (`PktLink`, `PktButton`)
- Type-sikkerhet med TypeScript
- Enklere vedlikehold og testing
- Konsistent med resten av applikasjonen
- Proper cleanup av React roots for å unngå memory leaks

### CSS-variabler: Mapping til Punkt

Erstatt custom CSS-variabler med Punkt-tokens:

| Nåværende variabel | Punkt-erstatning |
|-------------------|------------------|
| `--primary-color: #002855` | `$pkt-colors: "blue-dark"` |
| `--hover-color: #005A9C` | `$pkt-colors: "blue"` |
| `--accent-color: #034B45` | `$pkt-colors: "green-dark"` |
| `--neutral-border: #CCCCCC` | `$pkt-colors: "gray-300"` |
| `--background-light: #F9F9F9` | `$pkt-colors: "gray-100"` |
| `--text-color: #333333` | `$pkt-colors: "gray-900"` |
| `--spacing-small: 8px` | `$pkt-spacing: 8` |
| `--spacing-medium: 16px` | `$pkt-spacing: 16` |
| `--spacing-large: 24px` | `$pkt-spacing: 24` |

### Layout med Punkt Grid

Bruk Punkt grid-system for responsiv layout:

```tsx
// Hovedlayout
<div className="pkt-grid">
  <div className="pkt-cell pkt-cell--span3">
    {/* Sidebar */}
  </div>
  <div className="pkt-cell pkt-cell--span9">
    {/* Kart */}
  </div>
</div>
```

### Typografi

#### Tilgjengelige Punkt typografi-klasser

| Størrelse | Regular | Medium | Bold | Light |
|-----------|---------|--------|------|-------|
| 12px | `pkt-txt-12` | `pkt-txt-12-medium` | `pkt-txt-12-bold` | `pkt-txt-12-light` |
| 14px | `pkt-txt-14` | `pkt-txt-14-medium` | `pkt-txt-14-bold` | `pkt-txt-14-light` |
| 16px | `pkt-txt-16` | `pkt-txt-16-medium` | `pkt-txt-16-bold` | `pkt-txt-16-light` |
| 18px | `pkt-txt-18` | `pkt-txt-18-medium` | `pkt-txt-18-bold` | `pkt-txt-18-light` |
| 24px | `pkt-txt-24` | `pkt-txt-24-medium` | `pkt-txt-24-bold` | `pkt-txt-24-light` |
| 30px | `pkt-txt-30` | `pkt-txt-30-medium` | `pkt-txt-30-bold` | `pkt-txt-30-light` |

#### Bruk i SCSS med `get-text()` mixin (anbefalt)

For å bruke typografi i SCSS, importer typography-mixin og bruk `get-text()`:

```scss
@use "@oslokommune/punkt-css/dist/scss/abstracts/mixins/typography" as *;

.my-heading {
  @include get-text("pkt-txt-18-medium");
  color: var(--color-primary);
}

.my-body-text {
  @include get-text("pkt-txt-14");
}

.my-small-label {
  @include get-text("pkt-txt-12-medium");
}
```

Mixin-tilnærmingen er foretrukket fordi den:
- Setter korrekt `font-size`, `font-weight`, `line-height` og `letter-spacing`
- Holder styling i SCSS (separation of concerns)
- Er lettere å vedlikeholde

#### Bruk i JSX med CSS-klasser

For enklere tilfeller kan typografi-klasser brukes direkte:

```tsx
<h2 className="pkt-txt-24-medium">Overskrift</h2>
<p className="pkt-txt-14">Brødtekst</p>
```

#### Typografi-mapping

| Element | Anbefalt klasse |
|---------|-----------------|
| Hovedoverskrift (H1) | `pkt-txt-30-medium` |
| Seksjonsoverskrift (H2) | `pkt-txt-24-medium` |
| Underoverskrift (H3) | `pkt-txt-18-medium` |
| Brødtekst | `pkt-txt-16` eller `pkt-txt-14` |
| Labels/metadata | `pkt-txt-14-medium` |
| Liten tekst/badges | `pkt-txt-12` eller `pkt-txt-12-medium` |

### Implementeringsrekkefølge (Widget)

1. **Steg 1: Installasjon og oppsett** - FULLFORT
   - [x] Installer Punkt-pakker
   - [x] Sett opp SCSS med font-path
   - [x] Verifiser at Punkt CSS lastes korrekt

2. **Steg 2: Enkle komponenter først** - FULLFORT
   - [x] MapView.tsx (checkbox for "Åpen nå"-filter)
   - [x] TipsModal.tsx (inputs, select, button, alerts)

3. **Steg 3: InfoWindow som React-komponent** - FULLFORT
   - [x] Opprett ny `InfoWindowContent.tsx` med Punkt-komponenter
   - [x] Oppdater MapView.tsx til å rendre React i InfoWindow via `createRoot`
   - [x] Legg til SCSS for InfoWindow-layout

4. **Steg 4: Komplekse komponenter** - DELVIS FULLFORT
   - [ ] SearchBar.tsx (input + custom dropdown) - Beholder custom styling pga autocomplete
   - [x] CategoryFilter.tsx - Punkt-stylet custom checkbox med fargeprikker

5. **Steg 5: Layout og styling** - FULLFØRT
   - [x] Sidebar.tsx (typografi med `pkt-txt-16-medium` og `pkt-txt-14`)
   - [x] BottomSheet.tsx (`PktButton`, `PktLink`, Punkt-typografi)

6. **Steg 6: Global styling** - FULLFORT
   - [x] Migrer CSS-variabler til Punkt-tokens
   - [x] SCSS bruker Punkt-variabler for farger, spacing og border-radius
   - [x] Alle border-radius satt til 0 (skarpe hjørner)
   - [ ] Oppdater layout til Punkt grid (valgfritt)

7. **Steg 7: Typografi-revisjon** - FULLFØRT
   - [x] Importert typography mixin i `_app.scss`
   - [x] Erstattet alle hardkodede `font-size` med `@include get-text()`
   - [x] InfoWindowContent typografi (`pkt-txt-18-medium`, `pkt-txt-14`, `pkt-txt-14-medium`)
   - [x] Søkefelt og autocomplete typografi
   - [x] Sidebar og tips-modal typografi
   - [x] Area-filter typografi (`pkt-txt-14`, `pkt-txt-12`)

### Komponenter som beholder custom styling

Noen elementer har ikke direkte Punkt-erstatninger og beholder custom CSS (med Punkt-tokens):

- **Kart-container og Google Maps** - Spesifikk for kartintegrasjon
- **Bottom sheet animasjon** - Custom mobile UX
- **SearchBar med autocomplete dropdown** - Custom søkelogikk, Punkt-styling på input
- **Sidebar** - Custom layout, bruker Punkt-variabler for spacing/typografi
- **CategoryFilter** - Punkt-stylet custom checkbox + fargeprikker (ikke PktCheckbox pga fargeindikatorer)

### Tilgjengelighet (WCAG 2.1)

Punkt-komponenter følger WCAG 2.1 AA. Ved migrering:

- Behold alle `aria-*` attributter fra eksisterende kode
- Bruk `hideLabel` kun der visuelt skjult label er hensiktsmessig
- Test med skjermleser etter migrering
- Verifiser fargekontrast på custom fargeprikker

### Admin-app migreringsplan

Admin-appen følger samme mønster. Hovedkomponenter:

| Admin-komponent | Punkt-komponenter |
|-----------------|-------------------|
| Dashboard kort | Custom med Punkt-typografi |
| Skjemaer | PktTextinput, PktSelect, PktTextarea |
| Tabeller | Punkt-tabellstiler |
| Knapper | PktButton |
| Navigasjon | PktLink, custom layout |
| Alerts/Meldinger | PktAlert, PktMessagebox |

### Testplan

1. Visuell testing av alle komponenter
2. Responsiv testing (desktop, tablet, mobil)
3. Tilgjengelighetstesting med axe/WAVE
4. Funksjonell testing av alle brukerflyter
5. Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## Admin-app: Punkt Designsystem Migreringsplan

### Oversikt

Denne seksjonen beskriver stegvis refaktorering av admin-verktøyets UI til å bruke Punkt designsystem. Migreringen følger samme mønster som widget-appen, men tilpasset admin-konteksten.

### Nåværende Admin-UI Struktur

```
apps/admin/src/
├── components/
│   └── Layout.tsx          # Header, nav, footer
├── pages/
│   ├── Dashboard.tsx       # Oversikt over kartinstanser
│   ├── KartinstansEditor.tsx # Omfattende editor
│   ├── TipsOversikt.tsx    # Tips-administrasjon
│   └── Login.tsx           # Azure AD login
├── styles/
│   └── index.css           # Alle stiler (~870 linjer)
└── services/
    └── authConfig.ts       # MSAL konfigurasjon
```

**Nåværende tilnærming:**
- Ren CSS med custom properties
- Ingen UI-bibliotek
- React hooks for state management
- Flexbox/Grid for layout

### Admin-komponenter → Punkt-erstatninger

| Nåværende element | Fil | Punkt-erstatning |
|-------------------|-----|------------------|
| `.button` | Alle | `PktButton` |
| `.button.primary` | Alle | `PktButton appearance="primary"` |
| `.button.secondary` | Alle | `PktButton appearance="secondary"` |
| `.button.danger` | Alle | `PktButton color="red"` |
| `<input type="text">` | KartinstansEditor | `PktTextinput` |
| `<textarea>` | KartinstansEditor | `PktTextarea` |
| `<select>` | KartinstansEditor | `PktSelect` |
| `<input type="checkbox">` | KartinstansEditor | `PktCheckbox` |
| `.error` | Alle | `PktAlert skin="error"` |
| `.steder-table` | KartinstansEditor | `PktTable` |
| `.nav-link` | Layout | `PktLink` |
| `.tips-badge` | TipsOversikt | `PktTag` |
| `.status-badge` | TipsOversikt | `PktTag` |
| `.kartinstans-card` | Dashboard | `PktCard` |

### Elementer som beholder custom styling

| Element | Grunn |
|---------|-------|
| Autocomplete dropdown | Ingen Punkt-ekvivalent |
| Embed-kode visning | Spesialisert code display |
| Farge-velger (input color) | Ingen Punkt-ekvivalent |
| Grid layout | Bruker Punkt spacing-variabler |

### Admin SCSS-oppsett

**Opprett `apps/admin/src/styles/main.scss`:**

```scss
/* Overstyr stien til fontene */
@use "@oslokommune/punkt-css/dist/scss/abstracts/variables" with (
  $font-path: "@oslokommune/punkt-assets/dist"
);

/* Hent inn Punkts stiler */
@use "@oslokommune/punkt-css/dist/scss/pkt";

/* Admin-spesifikke stiler */
@use "./admin";
```

I `apps/admin/src/styles/_admin.scss`, importer nødvendige mixins:

```scss
@use "sass:map";
@use "@oslokommune/punkt-css/dist/scss/abstracts/variables" as pkt;
@use "@oslokommune/punkt-css/dist/scss/abstracts/mixins/breakpoints" as *;
@use "@oslokommune/punkt-css/dist/scss/abstracts/mixins/typography" as *;

// Bruk typography mixin for konsistent typografi
.card-meta {
  @include get-text("pkt-txt-14");
  color: var(--color-text-muted);
}

.kategori-badge {
  @include get-text("pkt-txt-12-medium");
}
```

### Implementeringsrekkefølge (Admin)

#### Fase 1: Oppsett
- [x] Installer Punkt-pakker i apps/admin
- [x] Sett opp SCSS-struktur med font-path
- [x] Verifiser at Punkt CSS lastes korrekt
- [x] Oppdater main.tsx til å importere main.scss

#### Fase 2: Layout-komponent
- [x] Migrer header til Punkt-styling
- [x] Erstatt navigasjonslenker med `PktLink`
- [x] Oppdater logout-knapp til `PktButton`

```tsx
import { PktButton, PktLink } from '@oslokommune/punkt-react'

<header className="pkt-header">
  <div className="pkt-header__logo">
    <Link to="/">
      <img src="..." alt="Oslo kommune" />
    </Link>
    <span className="pkt-header__logo-service">KlimaOslo Kartadmin</span>
  </div>
  <nav className="pkt-header__actions">
    <span className="pkt-txt-16">{userName}</span>
    <PktButton
      text="Logg ut"
      appearance="secondary"
      size="medium"
      onClick={handleLogout}
    />
  </nav>
</header>
```

#### Fase 3: Dashboard
- [x] Erstatt "Nytt kart"-knapp med `PktButton`
- [x] Migrer kartinstans-kort til `PktCard`
- [x] Oppdater loading/error states med `PktAlert`

```tsx
import { PktButton, PktCard, PktAlert } from '@oslokommune/punkt-react'

// Kartinstans-kort
<PktCard
  heading={kart.navn}
  skin="outlined"
  layout="vertical"
>
  <span>
    <p className="pkt-txt-14">{kart.beskrivelse}</p>
    <div className="card-meta">
      <span>{kart.kategorier.length} kategorier</span>
    </div>
    <div className="card-actions">
      <Link to={`/kart/${kart.id}`}>
        <PktButton text="Rediger" appearance="secondary" size="small" />
      </Link>
    </div>
  </span>
</PktCard>
```

#### Fase 4: KartinstansEditor - Skjemaer
- [x] Erstatt alle `<input type="text">` med `PktTextinput`
- [x] Erstatt `<textarea>` med `PktTextarea`
- [x] Erstatt `<select>` med `PktSelect`
- [x] Erstatt checkboxer med `PktCheckbox`
- [x] Erstatt alle knapper med `PktButton`
- [x] Erstatt feilmeldinger med `PktAlert`

```tsx
import {
  PktTextinput,
  PktTextarea,
  PktSelect,
  PktCheckbox,
  PktButton,
  PktAlert
} from '@oslokommune/punkt-react'

// Tekstinput
<PktTextinput
  label="Kartnavn"
  name="navn"
  id="navn"
  value={formData.navn}
  onChange={(e) => setFormData({ ...formData, navn: e.target.value })}
  required
  useWrapper
/>

// Textarea
<PktTextarea
  label="Beskrivelse"
  name="beskrivelse"
  id="beskrivelse"
  value={formData.beskrivelse}
  onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
  rows={3}
  useWrapper
/>

// Checkbox (embed-opsjoner)
<PktCheckbox
  id="skjul-sokefelt"
  label="Skjul søkefelt"
  checked={embedOptions.skjulSokefelt}
  onChange={(e) => setEmbedOptions({ ...embedOptions, skjulSokefelt: e.target.checked })}
/>

// Knapper
<PktButton text="Søk" appearance="primary" onClick={searchPlaces} />
<PktButton text="+ Ny kategori" appearance="secondary" onClick={addKategori} />
<PktButton text="Slett" color="red" size="small" onClick={() => removeKategori(index)} />
```

#### Fase 5: KartinstansEditor - Tabell
- [x] Migrer steder-tabellen til `PktTable`-komponenter (bruker standard HTML-tabell med Punkt-styling)

```tsx
import {
  PktTable, PktTableHeader, PktTableBody,
  PktTableRow, PktTableHeaderCell, PktTableDataCell,
  PktTag
} from '@oslokommune/punkt-react'

<PktTable skin="basic" responsiveView>
  <PktTableHeader>
    <PktTableRow>
      <PktTableHeaderCell><span>Navn</span></PktTableHeaderCell>
      <PktTableHeaderCell><span>Kategori</span></PktTableHeaderCell>
      <PktTableHeaderCell><span>Handlinger</span></PktTableHeaderCell>
    </PktTableRow>
  </PktTableHeader>
  <PktTableBody>
    {existingSteder.map((sted) => (
      <PktTableRow key={sted.id}>
        <PktTableDataCell>
          <span>
            <div className="pkt-txt-16-medium">{sted.cachedData?.navn}</div>
            <div className="pkt-txt-14">{sted.cachedData?.adresse}</div>
          </span>
        </PktTableDataCell>
        <PktTableDataCell>
          <span><PktTag text={kategori.navn} skin="blue" size="small" /></span>
        </PktTableDataCell>
        <PktTableDataCell>
          <span>
            <PktButton text="Fjern" color="red" size="small" onClick={() => deletePlace(sted.id)} />
          </span>
        </PktTableDataCell>
      </PktTableRow>
    ))}
  </PktTableBody>
</PktTable>
```

#### Fase 6: TipsOversikt
- [x] Migrer filter-knapper til `PktButton` med toggle-state
- [x] Erstatt status-badges med `PktTag`
- [x] Oppdater handlingsknapper

```tsx
// Filter-knapper
<PktButton
  text={`Nye (${newCount})`}
  appearance={filter === 'ny' ? 'primary' : 'secondary'}
  size="small"
  onClick={() => setFilter('ny')}
/>

// Status-badge
<PktTag
  text={tip.status}
  skin={tip.status === 'ny' ? 'yellow' : tip.status === 'godkjent' ? 'green' : 'red'}
  size="small"
/>

// Handlingsknapper
<PktButton text="Godkjenn" color="green" size="small" onClick={() => handleApprove(tip.id)} />
<PktButton text="Avvis" color="red" size="small" onClick={() => handleReject(tip.id)} />
```

#### Fase 7: Login-side
- [x] Oppdater login-knapp til `PktButton`
- [x] Bruk Punkt-typografi

```tsx
<div className="login-container">
  <img src="..." alt="Oslo kommune" />
  <h1 className="pkt-txt-24-medium">KlimaOslo Kartadmin</h1>
  <p className="pkt-txt-16">Logg inn med din Oslo kommune-konto</p>
  <PktButton
    text="Logg inn med Microsoft"
    appearance="primary"
    size="large"
    onClick={handleLogin}
  />
</div>
```

#### Fase 8: Typografi-revisjon - FULLFØRT
- [x] Importert typography mixin i `_admin.scss`
- [x] Erstattet alle hardkodede `font-size` med `@include get-text()`
- [x] Dashboard og kort-typografi (`pkt-txt-14`, `pkt-txt-14-medium`)
- [x] Tabell-typografi (`pkt-txt-14-medium` for headers)
- [x] Badges og labels (`pkt-txt-12-medium`)
- [x] Autocomplete og søkeresultater-typografi
- [x] Embed-kode og input-typografi
- [x] Floating action panel og bekreftelsesdialog-typografi

### CSS-variabel Mapping (Admin)

Erstatt nåværende CSS custom properties:

| Nåværende | Punkt-erstatning |
|-----------|------------------|
| `--color-primary: #002855` | `brand-dark-blue-1000` |
| `--color-accent: #034B45` | `brand-dark-green-1000` |
| `--color-danger: #D32F2F` | `brand-red-1000` |
| `--color-success: #2E7D32` | `brand-green-1000` |
| `--color-warning: #F9A825` | `brand-yellow-1000` |
| `--color-text: #333333` | `grays-gray-800` |
| `--color-background: #F9F9F9` | `brand-neutrals-100` |
| `--color-border: #CCCCCC` | `grays-gray-200` |
| `--radius-*` | `0` (skarpe hjørner) |

### Filer som må endres (Admin)

| Fil | Endring |
|-----|---------|
| `apps/admin/package.json` | Legg til Punkt-pakker |
| `apps/admin/src/main.tsx` | Import main.scss |
| `apps/admin/src/styles/main.scss` | Ny fil |
| `apps/admin/src/styles/_admin.scss` | Ny fil (custom stiler) |
| `apps/admin/src/components/Layout.tsx` | Punkt-komponenter |
| `apps/admin/src/pages/Dashboard.tsx` | Punkt-komponenter |
| `apps/admin/src/pages/KartinstansEditor.tsx` | Punkt-komponenter |
| `apps/admin/src/pages/TipsOversikt.tsx` | Punkt-komponenter |
| `apps/admin/src/pages/Login.tsx` | Punkt-komponenter |

### Admin Testplan

- [ ] Alle skjemaer fungerer med Punkt-komponenter
- [ ] Tabell viser data korrekt
- [ ] Knapper responderer og har riktig styling
- [ ] Alerts vises ved feil
- [ ] Navigasjon fungerer
- [ ] Responsivt design (desktop/tablet)
- [ ] Tilgjengelighet (keyboard, skjermleser)

---

## Neste steg

**Fullfort (Fase 2 - Admin MVP):**
1. ~~Implementer stedssok i KartinstansEditor med Google Places Text Search~~ Fullfort
2. ~~Legg til funksjonalitet for a lagre steder til Firestore med valgt kategori~~ Fullfort
3. ~~Vis liste over steder i kartinstansen med mulighet for sletting~~ Fullfort
4. ~~Implementer embed-kode generator~~ Fullfort

**Fullfort (Fase 3 - Kartwidget):**
5. ~~Implementer Google Maps-visning i widget~~ Fullfort
6. ~~Koble widget til backend API for a hente kartdata og steder~~ Fullfort
7. ~~Implementer kategorifilter, sidebar og responsivt design~~ Fullfort
8. ~~URL-parameter parsing for embed-innstillinger~~ Fullfort
9. ~~Omradesok med autocomplete~~ Fullfort
10. ~~Sidebar filtrering basert pa valgt omrade~~ Fullfort
11. ~~Test alle widget-funksjoner~~ Fullfort (verifisert 2026-01-09)
12. ~~Punkt designsystem integrert~~ Fullfort (TipsModal, InfoWindow, MapView, CategoryFilter, skarpe hjørner)

**Fullfort (Admin Punkt-migrering):**
13. ~~Admin UI migrert til Punkt designsystem~~ Fullfort (2026-01-10)
    - PktButton erstatter alle knapper
    - PktTextinput, PktTextarea, PktSelect for skjemafelt
    - PktCheckbox for checkboxer
    - PktAlert for feilmeldinger
    - PktTag for status-badges
    - SCSS med Punkt-variabler (farger, spacing, box-shadow)

**Neste prioritet (Fase 4 - Bildecaching):**
- Opprette Cloud Storage bucket (klimaoslo-kart-bilder) i europe-west1
- Konfigurere bucket som offentlig lesbar med CORS
- Implementere `imageCache.ts` service i backend
- Oppdatere steder-ruter til å cache bilder ved opprettelse
- Oppdatere `packages/shared/src/types.ts` med `bildeCache`-typer
- Lage Cloud Function for `refreshExpiredImages`
- Sette opp Cloud Scheduler (kjører 1. hver måned)
- Oppdatere widget til å bruke cachede bilder
- Kjøre migreringsscript for eksisterende steder

**Deretter (Fase 5 - Lansering):**
- Sette opp Cloud Run for hosting av backend og widget
- Konfigurere Azure AD for admin-innlogging
- Sette opp CI/CD med Cloud Build
- Migrere eksisterende kartdata fra Gjenbrukskartet
- Oppdatere embed-koder pa klimaoslo.no

**Fremtidige forbedringer (Fase 6):**
- Tips-handtering i admin (godkjenn/avvis)
- **E-postvarsling for nye tips** (krever Azure AD, se egen seksjon)
- Statistikk og analyse
- Bulk-import fra CSV
- Ytterligere Punkt-migrering (SearchBar, CategoryFilter, Sidebar, BottomSheet)

---

## E-postvarsling for tips

### Forutsetninger

Denne funksjonaliteten krever at Azure AD-autentisering er på plass, fordi:
- Verifiserte e-postadresser kommer automatisk fra innlogging
- Microsoft Graph API kan brukes for e-postsending
- `opprettetAv`-feltet gir tydelig eierskap til kartinstanser

### Utvidet kartinstans-schema

```javascript
// kartinstanser/{id}
{
  // ... eksisterende felter ...
  opprettetAv: "bruker@oslo.kommune.no",

  // Nytt: varslingsinnstillinger
  varsling: {
    tipsVarsling: true,                          // Motta varsler om nye tips
    varslingsEpost: "bruker@oslo.kommune.no",    // Kan overstyres
    varslingFrekvens: "umiddelbart"              // "umiddelbart" | "daglig" | "ukentlig"
  }
}
```

### E-posttjeneste

**Anbefalt: Microsoft Graph API** (allerede i Microsoft-økosystemet)

```typescript
// apps/backend/src/services/email.ts
import { Client } from '@microsoft/microsoft-graph-client';

interface TipsVarslingParams {
  til: string;
  kartNavn: string;
  tipsData: {
    butikknavn: string;
    adresse: string;
    kategori: string;
  };
}

export async function sendTipsVarsling({ til, kartNavn, tipsData }: TipsVarslingParams) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, process.env.GRAPH_API_TOKEN);
    }
  });

  await client.api('/me/sendMail').post({
    message: {
      subject: `Nytt tips til kartet "${kartNavn}"`,
      body: {
        contentType: 'HTML',
        content: `
          <h2>Nytt tips mottatt</h2>
          <p><strong>Sted:</strong> ${tipsData.butikknavn}</p>
          <p><strong>Adresse:</strong> ${tipsData.adresse}</p>
          <p><strong>Kategori:</strong> ${tipsData.kategori}</p>
          <p><a href="https://admin.kart.klimaoslo.no/tips">Gå til tips-oversikten</a></p>
        `
      },
      toRecipients: [{ emailAddress: { address: til } }]
    }
  });
}
```

### Backend-integrasjon

```typescript
// apps/backend/src/routes/public.ts (oppdatert)

router.post('/tips', rateLimiter, async (req, res) => {
  const { kartinstansId, butikknavn, adresse, kategori, placeId } = req.body;

  // Lagre tips
  const tipsData = {
    kartinstansId,
    butikknavn,
    adresse,
    kategori,
    placeId,
    status: 'ny',
    opprettet: new Date()
  };

  const tipDoc = await db.collection('tips').add(tipsData);

  // Hent kartinstans for varsling
  const kartinstans = await db.collection('kartinstanser')
    .doc(kartinstansId)
    .get();

  const data = kartinstans.data();
  const varsling = data?.varsling;

  // Send umiddelbar varsling hvis aktivert
  if (varsling?.tipsVarsling && varsling.varslingFrekvens === 'umiddelbart') {
    try {
      await sendTipsVarsling({
        til: varsling.varslingsEpost,
        kartNavn: data.navn,
        tipsData
      });
    } catch (error) {
      console.error('Kunne ikke sende tipsvarsling:', error);
      // Ikke fail request selv om e-post feiler
    }
  }

  res.status(201).json({ id: tipDoc.id });
});
```

### Cloud Function for daglig/ukentlig digest

```typescript
// apps/backend/src/functions/sendTipsDigest.ts
import * as functions from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import { sendTipsVarsling } from '../services/email';

const db = new Firestore();

functions.http('sendTipsDigest', async (req, res) => {
  const frekvens = req.query.frekvens as string; // 'daglig' | 'ukentlig'

  // Finn kartinstanser med denne varslingsfrekvensen
  const kartinstanser = await db
    .collection('kartinstanser')
    .where('varsling.tipsVarsling', '==', true)
    .where('varsling.varslingFrekvens', '==', frekvens)
    .get();

  for (const kartDoc of kartinstanser.docs) {
    const kart = kartDoc.data();

    // Finn nye tips siden forrige digest
    const sisteSjekk = frekvens === 'daglig'
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const nyeTips = await db
      .collection('tips')
      .where('kartinstansId', '==', kartDoc.id)
      .where('opprettet', '>=', sisteSjekk)
      .where('status', '==', 'ny')
      .get();

    if (nyeTips.size > 0) {
      await sendDigestEmail({
        til: kart.varsling.varslingsEpost,
        kartNavn: kart.navn,
        antallTips: nyeTips.size,
        tips: nyeTips.docs.map(d => d.data())
      });
    }
  }

  res.json({ status: 'ok' });
});
```

### Cloud Scheduler-oppsett

```bash
# Daglig digest kl. 08:00
gcloud scheduler jobs create http daily-tips-digest \
  --location=europe-west1 \
  --schedule="0 8 * * *" \
  --uri="https://europe-west1-bruktbutikk-navn.cloudfunctions.net/sendTipsDigest?frekvens=daglig" \
  --http-method=GET \
  --oidc-service-account-email=scheduler@bruktbutikk-navn.iam.gserviceaccount.com

# Ukentlig digest mandager kl. 08:00
gcloud scheduler jobs create http weekly-tips-digest \
  --location=europe-west1 \
  --schedule="0 8 * * 1" \
  --uri="https://europe-west1-bruktbutikk-navn.cloudfunctions.net/sendTipsDigest?frekvens=ukentlig" \
  --http-method=GET \
  --oidc-service-account-email=scheduler@bruktbutikk-namn.iam.gserviceaccount.com
```

### Admin UI: Varslingsinnstillinger

Legges til i KartinstansEditor under grunninnstillinger:

```
┌─ VARSLINGSINNSTILLINGER ─────────────────────────────────────┐
│                                                               │
│  ☑ Varsle meg om nye tips til dette kartet                   │
│                                                               │
│  E-post: [rikke.dahl@oslo.kommune.no        ]                │
│  (Forhåndsutfylt med innlogget brukers e-post)               │
│                                                               │
│  Hvor ofte?                                                   │
│  ○ Umiddelbart (e-post for hvert tips)                       │
│  ○ Daglig oppsummering (kl. 08:00)                           │
│  ○ Ukentlig oppsummering (mandager kl. 08:00)                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Implementeringsrekkefølge

1. **Etter Azure AD er på plass:**
   - Utvid `kartinstanser`-schema med `varsling`-felt
   - Legg til varslingsinnstillinger i KartinstansEditor
   - Implementer `sendTipsVarsling` med Microsoft Graph API

2. **Deretter:**
   - Oppdater `/api/public/tips` til å trigge umiddelbar varsling
   - Deploy Cloud Function for digest
   - Sett opp Cloud Scheduler-jobber
