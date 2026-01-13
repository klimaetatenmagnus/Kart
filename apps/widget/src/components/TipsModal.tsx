import { useState, useEffect, useRef } from 'react'
import { PktTextinput, PktCombobox, PktButton, PktAlert } from '@oslokommune/punkt-react'
import type { Kategori } from '@klimaoslo-kart/shared'

const API_URL = import.meta.env.VITE_API_URL || ''

interface AutocompleteSuggestion {
  placeId: string
  beskrivelse: string
  hovedtekst: string
  sekundartekst: string
}

interface SelectedPlace {
  placeId: string
  navn: string
  adresse: string
}

interface TipsModalProps {
  kartinstansId: string
  kategorier: Kategori[]
  onClose: () => void
}

export function TipsModal({ kartinstansId, kategorier, onClose }: TipsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null)
  const [kategori, setKategori] = useState(kategorier[0]?.id || '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const response = await fetch(
          `${API_URL}/api/public/places/autocomplete?input=${encodeURIComponent(searchQuery)}`
        )
        if (!response.ok) throw new Error('Autocomplete feilet')
        const data = await response.json()
        setSuggestions(data.data || [])
        setShowSuggestions(true)
      } catch (err) {
        console.error('Error fetching autocomplete:', err)
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Select a suggestion and fetch details
  const selectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    setShowSuggestions(false)
    setSearchQuery(suggestion.hovedtekst)
    setLoadingSuggestions(true)

    try {
      const response = await fetch(
        `${API_URL}/api/public/places/details?placeId=${suggestion.placeId}`
      )
      if (!response.ok) throw new Error('Kunne ikke hente stedsdetaljer')
      const data = await response.json()

      if (data.data) {
        setSelectedPlace({
          placeId: data.data.placeId,
          navn: data.data.navn,
          adresse: data.data.adresse,
        })
      }
    } catch (err) {
      console.error('Error fetching place details:', err)
      setErrorMessage('Kunne ikke hente stedsdetaljer')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const clearSelectedPlace = () => {
    setSelectedPlace(null)
    setSearchQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlace) {
      setErrorMessage('Du må velge et sted fra listen')
      return
    }

    setStatus('sending')

    try {
      const response = await fetch(`${API_URL}/api/public/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kartinstansId,
          placeId: selectedPlace.placeId,
          butikknavn: selectedPlace.navn,
          adresse: selectedPlace.adresse,
          kategori,
        }),
      })

      if (!response.ok) throw new Error('Kunne ikke sende tips')

      setStatus('success')
      setTimeout(onClose, 2000)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Ukjent feil')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-tip" onClick={(e) => e.stopPropagation()}>
        <button className="close-tip" onClick={onClose} aria-label="Lukk">
          &times;
        </button>
        <h2>Tips oss om et sted</h2>

        {status === 'success' ? (
          <PktAlert skin="success">Takk for tipset!</PktAlert>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="tips-search-container" ref={searchContainerRef}>
              {selectedPlace ? (
                <div className="tips-selected-place">
                  <div className="tips-selected-info">
                    <strong>{selectedPlace.navn}</strong>
                    <span>{selectedPlace.adresse}</span>
                  </div>
                  <button
                    type="button"
                    className="tips-change-place"
                    onClick={clearSelectedPlace}
                  >
                    Endre
                  </button>
                </div>
              ) : (
                <>
                  <PktTextinput
                    id="sted-sok"
                    name="sted-sok"
                    label="Søk etter sted"
                    placeholder="Skriv inn navn på stedet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    fullwidth
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {loadingSuggestions && (
                        <div className="autocomplete-loading">Laster...</div>
                      )}
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.placeId}
                          className="autocomplete-item"
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          <span className="autocomplete-main">{suggestion.hovedtekst}</span>
                          <span className="autocomplete-secondary">{suggestion.sekundartekst}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && !loadingSuggestions && suggestions.length === 0 && (
                    <p className="tips-no-results">Fant ingen steder. Prøv et annet søkeord.</p>
                  )}
                </>
              )}
            </div>

            {kategorier.length > 0 && (
              <PktCombobox
                id="kategori"
                name="kategori"
                label="Kategori"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                fullwidth
              >
                {kategorier.map((kat) => (
                  <option key={kat.id} value={kat.id}>
                    {kat.navn}
                  </option>
                ))}
              </PktCombobox>
            )}

            {status === 'error' && (
              <PktAlert skin="error">{errorMessage}</PktAlert>
            )}

            <PktButton
              type="submit"
              skin="primary"
              disabled={status === 'sending' || !selectedPlace}
              fullWidth
            >
              {status === 'sending' ? 'Sender...' : 'Send inn'}
            </PktButton>
          </form>
        )}
      </div>
    </div>
  )
}
