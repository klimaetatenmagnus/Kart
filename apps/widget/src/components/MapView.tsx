import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { Loader } from '@googlemaps/js-api-loader'
import { PktCheckbox } from '@oslokommune/punkt-react'
import { InfoWindowContent } from './InfoWindowContent'
import { Legend } from './Legend'
import type { KartinstansDTO, StedDTO, PlaceDetails } from '@klimaoslo-kart/shared'
import { getStedKategorier } from '@klimaoslo-kart/shared'

// Punkt designsystem mørkeblå farge - brukes for steder uten kategori
const PUNKT_DARK_BLUE = '#2A2859'

// API URL for backend
const API_URL = import.meta.env.VITE_API_URL || ''

export interface MapViewHandle {
  panTo: (lat: number, lng: number, zoom?: number) => void
  getPlacesService: () => google.maps.places.PlacesService | null
  selectMarker: (stedId: string) => void
}

interface MapViewProps {
  kartinstans: KartinstansDTO
  steder: StedDTO[]
  selectedCategories: Set<string>
  onStedSelect: (sted: StedDTO, placeDetails?: PlaceDetails) => void
  onStedDeselect?: () => void
  selectedStedId?: string
  openNowFilter: boolean
  onOpenNowChange: (value: boolean) => void
  openNowLoading?: boolean
  onMapReady?: () => void
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({
  kartinstans,
  steder,
  selectedCategories,
  onStedSelect,
  onStedDeselect,
  selectedStedId: _selectedStedId, // For fremtidig bruk (markere valgt sted)
  openNowFilter,
  onOpenNowChange,
  openNowLoading = false,
  onMapReady,
}, ref) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const infoWindowRootRef = useRef<Root | null>(null)
  const onMapReadyRef = useRef(onMapReady)
  const onStedDeselectRef = useRef(onStedDeselect)
  const mapInitializedRef = useRef(false)

  // Hold refs oppdatert
  onMapReadyRef.current = onMapReady
  onStedDeselectRef.current = onStedDeselect

  // Eksponer metoder til parent via ref
  useImperativeHandle(ref, () => ({
    panTo: (lat: number, lng: number, zoom?: number) => {
      if (map) {
        map.panTo({ lat, lng })
        if (zoom !== undefined) {
          map.setZoom(zoom)
        }
      }
    },
    getPlacesService: () => placesService,
    selectMarker: (stedId: string) => {
      const marker = markersRef.current.get(stedId)
      if (marker) {
        google.maps.event.trigger(marker, 'click')
      }
    },
  }), [map, placesService])

  // Initialiser kartet (kun én gang)
  useEffect(() => {
    if (mapInitializedRef.current) return
    mapInitializedRef.current = true

    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places'],
    })

    loader.load().then(() => {
      if (!mapRef.current) return

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: {
          lat: kartinstans.config.senterLat,
          lng: kartinstans.config.senterLng,
        },
        zoom: kartinstans.config.zoom,
        zoomControl: true,
        mapTypeControl: false,
        fullscreenControl: false,
      })

      setMap(mapInstance)
      setPlacesService(new google.maps.places.PlacesService(mapInstance))
      infoWindowRef.current = new google.maps.InfoWindow()

      // Lytt på lukking av InfoWindow for å fjerne highlighting
      infoWindowRef.current.addListener('closeclick', () => {
        onStedDeselectRef.current?.()
      })

      onMapReadyRef.current?.()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Oppdater markorer nar steder endres
  useEffect(() => {
    if (!map || !placesService) return

    // Fjern eksisterende markorer
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current.clear()

    // Opprett nye markorer
    steder.forEach((sted) => {
      // Finn første kategori som er både tildelt stedet OG valgt i filteret
      // Dette sikrer at fargen matcher den synlige kategorien
      const stedKategorier = getStedKategorier(sted)
      const forsteValgtKategoriId = stedKategorier.find(katId => selectedCategories.has(katId))
      const kategori = forsteValgtKategoriId
        ? kartinstans.kategorier.find((k) => k.id === forsteValgtKategoriId)
        : null

      // Bruk kategori-farge hvis den finnes, ellers mørkeblå fra Punkt
      const markerColor = kategori?.farge || PUNKT_DARK_BLUE

      const marker = new google.maps.Marker({
        position: { lat: sted.cachedData.lat, lng: sted.cachedData.lng },
        map,
        title: sted.cachedData.navn,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          scale: 10,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      })

      marker.addListener('click', async () => {
        // Vis InfoWindow med cached data umiddelbart
        const showInfoWindow = (placeDetails: PlaceDetails) => {
          if (window.innerWidth >= 600 && infoWindowRef.current) {
            // Opprett container for React-rendering
            const container = document.createElement('div')

            // Unmount tidligere React root hvis den finnes
            if (infoWindowRootRef.current) {
              infoWindowRootRef.current.unmount()
            }

            // Opprett ny React root og render komponenten
            infoWindowRootRef.current = createRoot(container)
            infoWindowRootRef.current.render(
              <InfoWindowContent placeDetails={placeDetails} bildeCache={sted.bildeCache} />
            )

            // Sett innholdet i Google Maps InfoWindow
            infoWindowRef.current.setContent(container)
            infoWindowRef.current.open(map, marker)
          }
        }

        // Lag fallback PlaceDetails fra cached data
        const cachedDetails: PlaceDetails = {
          placeId: sted.placeId,
          navn: sted.cachedData.navn,
          adresse: sted.cachedData.adresse,
          lat: sted.cachedData.lat,
          lng: sted.cachedData.lng,
          rating: sted.cachedData.rating,
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${sted.placeId}`,
        }

        // Vis cached data med en gang
        onStedSelect(sted, cachedDetails)
        showInfoWindow(cachedDetails)

        // Hent detaljer fra backend API (bruker sikker backend API-nøkkel)
        try {
          const response = await fetch(`${API_URL}/api/public/places/details?placeId=${sted.placeId}`)
          const data = await response.json()

          if (data.success && data.data) {
            const place = data.data
            const placeDetails: PlaceDetails = {
              placeId: sted.placeId,
              navn: place.navn || sted.cachedData.navn,
              adresse: place.adresse || sted.cachedData.adresse,
              lat: sted.cachedData.lat,
              lng: sted.cachedData.lng,
              rating: place.rating,
              telefon: place.telefon,
              nettside: place.nettside,
              apningstider: place.apningstider,
              apenNa: place.apenNa,
              googleMapsUrl: place.googleMapsUrl || cachedDetails.googleMapsUrl,
              bilder: place.bilder,
            }

            // Oppdater med fullstendig data
            onStedSelect(sted, placeDetails)
            showInfoWindow(placeDetails)
          } else {
            console.warn('Backend API feilet for', sted.placeId, '- bruker cached data')
          }
        } catch (err) {
          console.warn('Kunne ikke hente detaljer for', sted.placeId, '- bruker cached data:', err)
        }
      })

      markersRef.current.set(sted.id, marker)
    })
  }, [map, placesService, steder, kartinstans.kategorier, selectedCategories, onStedSelect])

  return (
    <div className="map-container">
      <div ref={mapRef} className="map" />
      {kartinstans.config.visApenNaFilter && (
        <div className="open-now-control">
          <PktCheckbox
            id="open-now-filter"
            label="Åpen nå"
            checked={openNowFilter}
            onChange={(e) => onOpenNowChange(e.target.checked)}
            disabled={openNowLoading}
          />
        </div>
      )}
      {kartinstans.kategorier.length > 0 && (
        <Legend kategorier={kartinstans.kategorier} />
      )}
    </div>
  )
})
