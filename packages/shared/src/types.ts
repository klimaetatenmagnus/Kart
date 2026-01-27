/**
 * KlimaOslo Kartplattform - Delte TypeScript-typer
 * Basert på Firestore-databasestrukturen i ARKITEKTURPLAN.md
 */

// ============================================
// Kartinstans
// ============================================

export interface KartinstansConfig {
  senterLat: number;
  senterLng: number;
  zoom: number;
  visApenNaFilter: boolean;
  visSokefelt: boolean;
  visSidebar: boolean;
}

export interface Kategori {
  id: string;
  navn: string;
  farge: string;
  hoverFarge: string;
  ikon?: string;
}

export interface Kartinstans {
  id: string; // URL-slug
  navn: string;
  beskrivelse: string;
  opprettet: Date;
  sisteEndret: Date;
  opprettetAv: string;
  sisteEndretAv?: string;
  config: KartinstansConfig;
  kategorier: Kategori[];
}

// For API-respons (timestamps som strings)
export interface KartinstansDTO {
  id: string;
  navn: string;
  beskrivelse: string;
  opprettet: string;
  sisteEndret: string;
  opprettetAv: string;
  sisteEndretAv?: string;
  config: KartinstansConfig;
  kategorier: Kategori[];
}

// For opprettelse/oppdatering
export interface KartinstansInput {
  navn: string;
  beskrivelse: string;
  config: KartinstansConfig;
  kategorier: Kategori[];
}

// ============================================
// Steder
// ============================================

export interface CachedPlaceData {
  navn: string;
  adresse: string;
  lat: number;
  lng: number;
  rating?: number;
  sisteOppdatering: Date;
}

export interface BildeCache {
  url: string;                        // Cloud Storage public URL
  cachetTidspunkt: Date;              // Når bildet ble cachet
  utloper: Date;                      // cachetTidspunkt + 30 dager
  originalPhotoReference: string;     // Google Places photo_reference for oppdatering
  bredde: number;                     // Lagret bildebredde (standard: 400)
  hoyde: number;                      // Lagret bildehøyde (standard: 300)
}

export interface BildeCacheDTO {
  url: string;
  cachetTidspunkt: string;
  utloper: string;
  originalPhotoReference: string;
  bredde: number;
  hoyde: number;
}

export interface Sted {
  id: string;
  kartinstansId: string;
  placeId: string; // Google Places ID
  kategoriId?: string; // Bakoverkompatibilitet - bruk kategoriIder for nye steder
  kategoriIder?: string[]; // Fler-kategori støtte - steder kan tilhøre flere kategorier
  cachedData: CachedPlaceData;
  bildeCache?: BildeCache; // Bildecache-data fra Cloud Storage
  opprettet: Date;
  opprettetAv: string;
}

export interface StedDTO {
  id: string;
  kartinstansId: string;
  placeId: string;
  kategoriId?: string; // Bakoverkompatibilitet - bruk kategoriIder for nye steder
  kategoriIder?: string[]; // Fler-kategori støtte - steder kan tilhøre flere kategorier
  cachedData: {
    navn: string;
    adresse: string;
    lat: number;
    lng: number;
    rating?: number;
    sisteOppdatering: string;
  };
  bildeCache?: BildeCacheDTO; // Bildecache-data fra Cloud Storage
  opprettet: string;
  opprettetAv: string;
}

export interface StedInput {
  placeId: string;
  kategoriId?: string; // Bakoverkompatibilitet - bruk kategoriIder for nye steder
  kategoriIder?: string[]; // Fler-kategori støtte - steder kan tilhøre flere kategorier
}

// ============================================
// Brukere
// ============================================

export type BrukerRolle = 'admin' | 'redaktor';

export interface Bruker {
  id: string; // E-postadresse
  navn: string;
  rolle: BrukerRolle;
  sisteInnlogging: Date;
}

export interface BrukerDTO {
  id: string;
  navn: string;
  rolle: BrukerRolle;
  sisteInnlogging: string;
}

// ============================================
// Tips (brukerinnspill)
// ============================================

export type TipsStatus = 'ny' | 'godkjent' | 'avvist';

export interface Tips {
  id: string;
  kartinstansId: string;
  placeId?: string; // Google Places ID - brukes for å legge til sted ved godkjenning
  butikknavn: string;
  adresse: string;
  kategori: string;
  status: TipsStatus;
  opprettet: Date;
  behandletAv?: string;
}

export interface TipsDTO {
  id: string;
  kartinstansId: string;
  placeId?: string; // Google Places ID - brukes for å legge til sted ved godkjenning
  butikknavn: string;
  adresse: string;
  kategori: string;
  status: TipsStatus;
  opprettet: string;
  behandletAv?: string;
}

export interface TipsInput {
  kartinstansId: string;
  placeId?: string; // Google Places ID - brukes for å legge til sted ved godkjenning
  butikknavn: string;
  adresse: string;
  kategori: string;
}

// ============================================
// Google Places API typer
// ============================================

export interface PlaceSearchResult {
  placeId: string;
  navn: string;
  adresse: string;
  lat?: number;
  lng?: number;
  rating?: number;
  apenNa?: boolean;
  typer?: string[];
}

export interface PlaceDetails {
  placeId: string;
  navn: string;
  adresse: string;
  lat: number;
  lng: number;
  rating?: number;
  telefon?: string;
  nettside?: string;
  apningstider?: string[];
  apenNa?: boolean;
  bilder?: string[];
  googleMapsUrl?: string;
}

// ============================================
// API-responser
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
