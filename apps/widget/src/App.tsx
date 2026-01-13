import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { PktButton } from '@oslokommune/punkt-react'
import { MapView, MapViewHandle } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { CategoryFilter } from './components/CategoryFilter'
import { BottomSheet } from './components/BottomSheet'
import { TipsModal } from './components/TipsModal'
import { useKartinstans } from './hooks/useKartinstans'
import { useSteder } from './hooks/useSteder'
import type { StedDTO, PlaceDetails } from '@klimaoslo-kart/shared'

// Parse URL-parametre for embed-innstillinger
function useEmbedOptions() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      skjulSokefelt: params.get('sokefelt') === '0',
      skjulKategorifilter: params.get('filter') === '0',
      skjulSidebar: params.get('sidebar') === '0',
    }
  }, [])
}

function App() {
  // Hent slug fra URL (f.eks. /badstuer)
  const slug = window.location.pathname.replace('/', '') || 'default'

  // Hent embed-innstillinger fra URL-parametre
  const embedOptions = useEmbedOptions()

  const { kartinstans, loading: kartLoading, error: kartError } = useKartinstans(slug)
  const { steder, loading: stederLoading } = useSteder(slug)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [openNowFilter, setOpenNowFilter] = useState(false)
  const [selectedSted, setSelectedSted] = useState<StedDTO | null>(null)
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceDetails | null>(null)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600)
  const [mapReady, setMapReady] = useState(false)
  const [selectedArea, setSelectedArea] = useState<{
    name: string
    bounds: google.maps.LatLngBounds
  } | null>(null)

  const mapRef = useRef<MapViewHandle>(null)

  // Initialiser valgte kategorier når kartinstans lastes
  useEffect(() => {
    if (kartinstans?.kategorier) {
      setSelectedCategories(new Set(kartinstans.kategorier.map((k) => k.id)))
    }
  }, [kartinstans])

  // Lytt på vindusstørrelse for responsivt design
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Filtrer steder basert på kategorier (søk brukes kun for autocomplete-forslag)
  const filteredSteder = steder.filter((sted) => {
    // Hvis det ikke er noen kategorier definert, vis alle steder
    if (!kartinstans?.kategorier || kartinstans.kategorier.length === 0) {
      return true
    }
    // Hvis det er kategorier definert, vis bare steder med kategori som er valgt
    // Steder uten kategori vises ikke når det finnes kategorier
    if (!sted.kategoriId) {
      return false
    }
    return selectedCategories.has(sted.kategoriId)
  })

  // Filtrer steder for sidebar basert på valgt område
  const sidebarSteder = selectedArea
    ? filteredSteder.filter((sted) => {
        const position = new google.maps.LatLng(sted.cachedData.lat, sted.cachedData.lng)
        return selectedArea.bounds.contains(position)
      })
    : filteredSteder

  const handleStedSelect = (sted: StedDTO, placeDetails?: PlaceDetails) => {
    setSelectedSted(sted)
    if (placeDetails) {
      setSelectedPlaceDetails(placeDetails)
    }
  }

  const handleCloseDetails = () => {
    setSelectedSted(null)
    setSelectedPlaceDetails(null)
  }

  // Håndter valg av område fra søk - zoom kartet til området og filtrer sidebar
  const handleAreaSelect = useCallback((placeId: string, areaName: string) => {
    if (!mapRef.current || !mapReady) return

    const placesService = mapRef.current.getPlacesService()
    if (!placesService) return

    // Hent koordinater og viewport for området
    placesService.getDetails(
      { placeId, fields: ['geometry', 'name'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          mapRef.current?.panTo(lat, lng, 14)

          // Lagre områdets bounds for filtrering
          if (place.geometry.viewport) {
            setSelectedArea({
              name: place.name || areaName,
              bounds: place.geometry.viewport,
            })
          }
        }
      }
    )
  }, [mapReady])

  // Fjern områdefilter
  const clearAreaFilter = useCallback(() => {
    setSelectedArea(null)
    setSearchQuery('')
  }, [])

  // Håndter valg av sted fra søk - zoom til stedet
  const handlePlaceSelectFromSearch = useCallback((sted: StedDTO) => {
    if (!mapRef.current) return
    mapRef.current.panTo(sted.cachedData.lat, sted.cachedData.lng, 16)
    mapRef.current.selectMarker(sted.id)
  }, [])

  // Håndter klikk på sted i sidebar - zoom og åpne InfoWindow
  const handleSidebarStedClick = useCallback((sted: StedDTO) => {
    if (!mapRef.current) return
    mapRef.current.panTo(sted.cachedData.lat, sted.cachedData.lng, 16)
    mapRef.current.selectMarker(sted.id)
  }, [])

  // Memoizer onMapReady for å unngå unødvendige re-renders av MapView
  const handleMapReady = useCallback(() => {
    setMapReady(true)
  }, [])

  if (kartLoading || stederLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Laster kart...</p>
      </div>
    )
  }

  if (kartError) {
    return (
      <div className="error-container">
        <p>Kunne ikke laste kartet: {kartError}</p>
      </div>
    )
  }

  if (!kartinstans) {
    return (
      <div className="error-container">
        <p>Fant ikke kartinstansen.</p>
      </div>
    )
  }

  return (
    <div className="kart-container">
      {/* Kontroller - respekterer både kartinstans-config og embed-innstillinger */}
      {(kartinstans.config.visSokefelt && !embedOptions.skjulSokefelt) ||
       (!embedOptions.skjulKategorifilter && kartinstans.kategorier.length > 0) ? (
        <div className="controls">
          {kartinstans.config.visSokefelt && !embedOptions.skjulSokefelt && (
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              steder={steder}
              onAreaSelect={handleAreaSelect}
              onPlaceSelect={handlePlaceSelectFromSearch}
              mapReady={mapReady}
            />
          )}
          {!embedOptions.skjulKategorifilter && kartinstans.kategorier.length > 0 && (
            <CategoryFilter
              kategorier={kartinstans.kategorier}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
          )}
        </div>
      ) : null}

      <div className="main-content">
        {kartinstans.config.visSidebar && !isMobile && !embedOptions.skjulSidebar && (
          <div className="sidebar-container">
            {selectedArea && (
              <div className="area-filter-indicator">
                <span className="area-filter-name">{selectedArea.name}</span>
                <button
                  className="area-filter-clear"
                  onClick={clearAreaFilter}
                  aria-label="Fjern områdefilter"
                  title="Fjern filter"
                >
                  ✕
                </button>
              </div>
            )}
            <Sidebar
              steder={sidebarSteder}
              kategorier={kartinstans.kategorier}
              onStedClick={handleSidebarStedClick}
              selectedStedId={selectedSted?.id}
            />
          </div>
        )}

        <div className="map-wrapper">
          <MapView
            ref={mapRef}
            kartinstans={kartinstans}
            steder={filteredSteder}
            onStedSelect={handleStedSelect}
            onStedDeselect={handleCloseDetails}
            selectedStedId={selectedSted?.id}
            openNowFilter={openNowFilter}
            onOpenNowChange={setOpenNowFilter}
            onMapReady={handleMapReady}
          />
          <PktButton
            className="tips-button"
            skin="primary"
            size="medium"
            variant="icon-left"
            iconName="bullseye"
            onClick={() => setShowTipsModal(true)}
          >
            <span>Tips oss om et sted!</span>
          </PktButton>
        </div>
      </div>

      {/* Desktop: InfoWindow håndteres i MapView */}
      {/* Mobil: Bottom sheet */}
      {isMobile && selectedSted && selectedPlaceDetails && (
        <BottomSheet
          placeDetails={selectedPlaceDetails}
          onClose={handleCloseDetails}
        />
      )}

      {showTipsModal && (
        <TipsModal
          kartinstansId={kartinstans.id}
          kategorier={kartinstans.kategorier}
          onClose={() => setShowTipsModal(false)}
        />
      )}
    </div>
  )
}

export default App
