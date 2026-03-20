import { useState, useEffect, useRef, useCallback } from 'react'
import { PktIcon } from '@oslokommune/punkt-react'
import { trackSearch } from '../utils/analytics'
import type { StedDTO } from '@klimaoslo-kart/shared'

// Søkeikon SVG (fra Punkt ikonbibliotek)
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M14 24c5.523 0 10-4.477 10-10S19.523 4 14 4 4 8.477 4 14s4.477 10 10 10Zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
      />
      <path
        fill="currentColor"
        d="m21.414 20 6.293 6.293-1.414 1.414L20 21.414l1.414-1.414Z"
      />
    </svg>
  )
}

interface AreaSuggestion {
  type: 'area'
  placeId: string
  description: string
  mainText: string
}

interface PlaceSuggestion {
  type: 'place'
  sted: StedDTO
}

type Suggestion = AreaSuggestion | PlaceSuggestion

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  steder: StedDTO[]
  onAreaSelect: (placeId: string, description: string) => void
  onPlaceSelect: (sted: StedDTO) => void
  mapReady: boolean
  kartSlug: string
}

// Oslo bounding box for å begrense søk
const OSLO_BOUNDS = {
  north: 60.13,
  south: 59.81,
  east: 10.95,
  west: 10.58,
}

export function SearchBar({ value, onChange, steder, onAreaSelect, onPlaceSelect, mapReady, kartSlug }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [areaSuggestions, setAreaSuggestions] = useState<AreaSuggestion[]>([])
  const [isLoadingAreas, setIsLoadingAreas] = useState(false)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialiser AutocompleteService når Google Maps er lastet
  useEffect(() => {
    if (mapReady && window.google?.maps?.places && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
    }
  }, [mapReady])

  // Lukk dropdown når man klikker utenfor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Søk etter områder med debounce
  const searchAreas = useCallback((query: string) => {
    if (!autocompleteServiceRef.current || query.length < 2) {
      setAreaSuggestions([])
      return
    }

    setIsLoadingAreas(true)

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        locationBias: new google.maps.LatLngBounds(
          { lat: OSLO_BOUNDS.south, lng: OSLO_BOUNDS.west },
          { lat: OSLO_BOUNDS.north, lng: OSLO_BOUNDS.east }
        ),
        types: ['neighborhood', 'sublocality', 'postal_code', 'locality', 'sublocality_level_1'],
        componentRestrictions: { country: 'no' },
      },
      (predictions, status) => {
        setIsLoadingAreas(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Filtrer til Oslo-området
          const osloAreas = predictions
            .filter((p) =>
              p.description.toLowerCase().includes('oslo') ||
              p.structured_formatting.secondary_text?.toLowerCase().includes('oslo')
            )
            .slice(0, 5)
            .map((p) => ({
              type: 'area' as const,
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting.main_text,
            }))
          setAreaSuggestions(osloAreas)
        } else {
          setAreaSuggestions([])
        }
      }
    )
  }, [])

  // Håndter input-endring med debounce for områdesøk
  const handleInputChange = (newValue: string) => {
    onChange(newValue)
    setIsOpen(true)

    // Debounce områdesøk
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      searchAreas(newValue)
    }, 300)
  }

  // Filtrer steder basert på søketekst
  const matchingPlaces: PlaceSuggestion[] = value.length >= 2
    ? steder
        .filter((sted) =>
          sted.cachedData.navn.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5)
        .map((sted) => ({ type: 'place', sted }))
    : []

  // Kombiner forslag
  const suggestions: Suggestion[] = [...matchingPlaces, ...areaSuggestions]
  const showDropdown = isOpen && (value.length >= 2) && (suggestions.length > 0 || isLoadingAreas)

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'area') {
      onChange(suggestion.mainText)
      onAreaSelect(suggestion.placeId, suggestion.description)
      trackSearch(suggestion.mainText, 'område', kartSlug)
    } else {
      onChange(suggestion.sted.cachedData.navn)
      onPlaceSelect(suggestion.sted)
      trackSearch(suggestion.sted.cachedData.navn, 'sted', kartSlug)
    }
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <SearchIcon className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Søk sted eller område..."
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Søk etter sted eller område"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div className="search-dropdown" role="listbox">
          {matchingPlaces.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="search-section-icon">🏪</span>
                STEDER I KARTET
              </div>
              {matchingPlaces.map((suggestion) => (
                <button
                  key={suggestion.sted.id}
                  className="search-suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                  role="option"
                >
                  <span className="suggestion-name">{suggestion.sted.cachedData.navn}</span>
                  <span className="suggestion-address">{suggestion.sted.cachedData.adresse}</span>
                </button>
              ))}
            </div>
          )}

          {(areaSuggestions.length > 0 || isLoadingAreas) && (
            <div className="search-section">
              <div className="search-section-header">
                <PktIcon name="map" className="search-section-icon" />
                OMRÅDER
              </div>
              {isLoadingAreas && areaSuggestions.length === 0 && (
                <div className="search-loading">Søker...</div>
              )}
              {areaSuggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  className="search-suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                  role="option"
                >
                  <span className="suggestion-name">{suggestion.mainText}</span>
                  <span className="suggestion-address">{suggestion.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
