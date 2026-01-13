import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PktButton, PktTextinput, PktSelect, PktCheckbox, PktAlert, PktIcon } from '@oslokommune/punkt-react'
import type { KartinstansDTO, KartinstansInput, Kategori, PlaceSearchResult, StedDTO } from '@klimaoslo-kart/shared'
import { apiFetch } from '../services/api'

// Hjelpefunksjon for dyp sammenligning av objekter
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false
  if (obj1 === null || obj2 === null) return false

  const keys1 = Object.keys(obj1 as object)
  const keys2 = Object.keys(obj2 as object)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) return false
  }

  return true
}

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

// Punkt designsystem standardfarger for kategorier
// textColor: mørk (#2A2859) for lyse bakgrunner, hvit (#FFFFFF) for mørke bakgrunner
const PUNKT_COLORS = [
  { id: 'blue', navn: 'Blå', hex: '#6FE9FF', textColor: '#2A2859' },
  { id: 'dark-blue', navn: 'Mørk blå', hex: '#2A2859', textColor: '#FFFFFF' },
  { id: 'warm-blue', navn: 'Varm blå', hex: '#1F42AA', textColor: '#FFFFFF' },
  { id: 'green', navn: 'Grønn', hex: '#43F8B6', textColor: '#2A2859' },
  { id: 'dark-green', navn: 'Mørk grønn', hex: '#034B45', textColor: '#FFFFFF' },
  { id: 'light-green', navn: 'Lys grønn', hex: '#C7F6C9', textColor: '#2A2859' },
  { id: 'yellow', navn: 'Gul', hex: '#F9C66B', textColor: '#2A2859' },
  { id: 'red', navn: 'Rød', hex: '#FF8274', textColor: '#2A2859' },
  { id: 'purple', navn: 'Lilla', hex: '#E0ADFF', textColor: '#2A2859' },
  { id: 'beige', navn: 'Beige', hex: '#D0BFAE', textColor: '#2A2859' },
  { id: 'light-beige', navn: 'Lys beige', hex: '#F8F0DD', textColor: '#2A2859' },
]

// Hjelpefunksjon for å finne riktig tekstfarge basert på bakgrunnsfarge
const getTextColorForBackground = (bgColor: string): string => {
  const color = PUNKT_COLORS.find(c => c.hex.toLowerCase() === bgColor.toLowerCase())
  return color?.textColor || '#2A2859' // Standard mørk tekst hvis farge ikke finnes
}

interface PlaceWithCategory extends PlaceSearchResult {
  selectedKategoriId?: string;
}

interface EmbedOptions {
  skjulSokefelt: boolean;
  skjulKategorifilter: boolean;
  skjulSidebar: boolean;
}

interface AutocompleteSuggestion {
  placeId: string;
  beskrivelse: string;
  hovedtekst: string;
  sekundartekst: string;
}

export function KartinstansEditor() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  // slug kan være "ny" fra /kart/ny ruten, eller en faktisk slug fra /kart/:slug
  const isEditing = Boolean(slug) && slug !== 'ny'

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stedssok state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceWithCategory[]>([])
  const [searching, setSearching] = useState(false)
  const [existingSteder, setExistingSteder] = useState<StedDTO[]>([])
  const [addingPlace, setAddingPlace] = useState<string | null>(null)
  const [editingCategoryStedId, setEditingCategoryStedId] = useState<string | null>(null)
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null)

  // Pending places for new kartinstans (stored locally until saved)
  const [pendingPlaces, setPendingPlaces] = useState<PlaceWithCategory[]>([])

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Embed-kode state
  const [embedOptions, setEmbedOptions] = useState<EmbedOptions>({
    skjulSokefelt: false,
    skjulKategorifilter: false,
    skjulSidebar: false,
  })
  const [embedCopied, setEmbedCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Reset saving state when slug changes (e.g., after creating new kartinstans)
  useEffect(() => {
    setSaving(false)
    setSaveSuccess(false)
  }, [slug])

  // Inline title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Standard Oslo-koordinater (brukes for alle kart)
  const OSLO_DEFAULT_CONFIG = {
    senterLat: 59.9139,
    senterLng: 10.7522,
    zoom: 12,
    visApenNaFilter: true,
    visSokefelt: true,
    visSidebar: true,
  }

  const [formData, setFormData] = useState<KartinstansInput>({
    navn: '',
    beskrivelse: '',
    config: OSLO_DEFAULT_CONFIG,
    kategorier: [],
  })

  // Original data for change tracking
  const [originalFormData, setOriginalFormData] = useState<KartinstansInput | null>(null)
  const [originalSteder, setOriginalSteder] = useState<StedDTO[]>([])

  // Calculate changes for editing mode
  const changes = useMemo(() => {
    if (!originalFormData) return { count: 0, hasChanges: false }

    let changeCount = 0

    // Check navn changes
    if (formData.navn !== originalFormData.navn) changeCount++

    // Check beskrivelse changes
    if (formData.beskrivelse !== originalFormData.beskrivelse) changeCount++

    // Check kategorier changes
    if (!deepEqual(formData.kategorier, originalFormData.kategorier)) {
      // Count individual category changes
      const origKatIds = new Set(originalFormData.kategorier.map(k => k.id))
      const currKatIds = new Set(formData.kategorier.map(k => k.id))

      // Added categories
      formData.kategorier.forEach(k => {
        if (!origKatIds.has(k.id)) changeCount++
      })

      // Removed categories
      originalFormData.kategorier.forEach(k => {
        if (!currKatIds.has(k.id)) changeCount++
      })

      // Modified categories
      formData.kategorier.forEach(curr => {
        const orig = originalFormData.kategorier.find(k => k.id === curr.id)
        if (orig && !deepEqual(orig, curr)) changeCount++
      })
    }

    // Check steder changes
    const origStedIds = new Set(originalSteder.map(s => s.id))
    const currStedIds = new Set(existingSteder.map(s => s.id))

    // Added steder
    existingSteder.forEach(s => {
      if (!origStedIds.has(s.id)) changeCount++
    })

    // Removed steder
    originalSteder.forEach(s => {
      if (!currStedIds.has(s.id)) changeCount++
    })

    // Modified steder (category changes)
    existingSteder.forEach(curr => {
      const orig = originalSteder.find(s => s.id === curr.id)
      if (orig && orig.kategoriId !== curr.kategoriId) changeCount++
    })

    return { count: changeCount, hasChanges: changeCount > 0 }
  }, [formData, originalFormData, existingSteder, originalSteder])

  // Check if new kartinstans has any changes (for showing save buttons)
  const hasNewKartChanges = useMemo(() => {
    if (isEditing) return false
    return formData.navn.trim() !== '' ||
           formData.kategorier.length > 0 ||
           pendingPlaces.length > 0
  }, [isEditing, formData.navn, formData.kategorier, pendingPlaces])

  useEffect(() => {
    if (isEditing && slug) {
      fetchKartinstans(slug)
      fetchExistingSteder(slug, true) // true = initial load for change tracking
    }
  }, [slug, isEditing])

  const fetchExistingSteder = async (kartSlug: string, isInitialLoad = false) => {
    try {
      const response = await apiFetch(`/api/kartinstanser/${kartSlug}/steder`)
      if (!response.ok) throw new Error('Kunne ikke hente steder')
      const data = await response.json()
      const steder = data.data || []
      setExistingSteder(steder)
      // Store original steder for change tracking on initial load
      if (isInitialLoad) {
        setOriginalSteder(JSON.parse(JSON.stringify(steder)))
      }
    } catch (err) {
      console.error('Error fetching steder:', err)
    }
  }

  const searchPlaces = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await apiFetch(`/api/places/search?query=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error('Sok feilet')
      const data = await response.json()

      const resultsWithCategory = (data.data || []).map((place: PlaceSearchResult) => ({
        ...place,
        selectedKategoriId: '', // Standard: ingen kategori
      }))

      setSearchResults(resultsWithCategory)
    } catch (err) {
      console.error('Error searching places:', err)
      setError('Kunne ikke soke etter steder')
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setShowSuggestions(false)
      searchPlaces()
    }
  }

  // Fetch autocomplete suggestions med debounce
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
        const response = await apiFetch(`/api/places/autocomplete?input=${encodeURIComponent(searchQuery)}`)
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
    }, 300) // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  // Lukk suggestions og category dropdown nar man klikker utenfor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setEditingCategoryStedId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Velg et forslag og hent detaljer
  const selectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    setShowSuggestions(false)
    setSearchQuery(suggestion.hovedtekst)
    setSearching(true)

    try {
      // Hent full stedsinfo fra places/details
      const response = await apiFetch(`/api/places/details?placeId=${suggestion.placeId}`)
      if (!response.ok) throw new Error('Kunne ikke hente stedsdetaljer')
      const data = await response.json()

      if (data.data) {
        const place: PlaceWithCategory = {
          placeId: data.data.placeId || suggestion.placeId,
          navn: data.data.navn,
          adresse: data.data.adresse,
          lat: data.data.lat,
          lng: data.data.lng,
          rating: data.data.rating,
          selectedKategoriId: '', // Standard: ingen kategori
        }
        setSearchResults([place])
      }
    } catch (err) {
      console.error('Error fetching place details:', err)
      setError('Kunne ikke hente stedsdetaljer')
    } finally {
      setSearching(false)
    }
  }

  const updateSearchResultCategory = (placeId: string, kategoriId: string) => {
    setSearchResults(prev =>
      prev.map(place =>
        place.placeId === placeId
          ? { ...place, selectedKategoriId: kategoriId }
          : place
      )
    )
  }

  const isPlaceAlreadyAdded = (placeId: string) => {
    // Check both existing steder and pending places
    return existingSteder.some(sted => sted.placeId === placeId) ||
           pendingPlaces.some(place => place.placeId === placeId)
  }

  const addPlace = async (place: PlaceWithCategory) => {
    // For new kartinstans, store locally
    if (!isEditing) {
      setPendingPlaces(prev => [...prev, place])
      setSearchResults(prev => prev.filter(p => p.placeId !== place.placeId))
      return
    }

    if (!slug) return

    setAddingPlace(place.placeId)
    try {
      const body: { placeId: string; kategoriId?: string } = {
        placeId: place.placeId,
      }
      // Bare inkluder kategoriId hvis den er satt
      if (place.selectedKategoriId) {
        body.kategoriId = place.selectedKategoriId
      }

      const response = await apiFetch(`/api/kartinstanser/${slug}/steder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Kunne ikke legge til sted')

      await fetchExistingSteder(slug)
      setSearchResults(prev => prev.filter(p => p.placeId !== place.placeId))
    } catch (err) {
      console.error('Error adding place:', err)
      setError('Kunne ikke legge til sted')
    } finally {
      setAddingPlace(null)
    }
  }

  // Remove a pending place (for new kartinstans)
  const removePendingPlace = (placeId: string) => {
    setPendingPlaces(prev => prev.filter(p => p.placeId !== placeId))
  }

  // Update category for a pending place
  const updatePendingPlaceCategory = (placeId: string, kategoriId: string) => {
    setPendingPlaces(prev =>
      prev.map(place =>
        place.placeId === placeId
          ? { ...place, selectedKategoriId: kategoriId }
          : place
      )
    )
  }

  const deletePlace = async (stedId: string) => {
    if (!slug) return

    if (!window.confirm('Er du sikker pa at du vil fjerne dette stedet?')) return

    try {
      const response = await apiFetch(`/api/kartinstanser/${slug}/steder/${stedId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Kunne ikke slette sted')

      setExistingSteder(prev => prev.filter(s => s.id !== stedId))
    } catch (err) {
      console.error('Error deleting place:', err)
      setError('Kunne ikke slette sted')
    }
  }

  const updateStedCategory = async (stedId: string, newKategoriId: string) => {
    if (!slug) return

    setUpdatingCategory(stedId)
    try {
      const response = await apiFetch(`/api/kartinstanser/${slug}/steder/${stedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategoriId: newKategoriId || null }), // null for å fjerne kategori
      })

      if (!response.ok) throw new Error('Kunne ikke oppdatere kategori')

      // Oppdater lokal state
      setExistingSteder(prev =>
        prev.map(sted =>
          sted.id === stedId
            ? { ...sted, kategoriId: newKategoriId || undefined }
            : sted
        )
      )
      setEditingCategoryStedId(null)
    } catch (err) {
      console.error('Error updating category:', err)
      setError('Kunne ikke oppdatere kategori')
    } finally {
      setUpdatingCategory(null)
    }
  }

  const getKategoriById = (kategoriId: string) => {
    return formData.kategorier.find(k => k.id === kategoriId)
  }

  // Embed-kode generering - Widget URL
  const getWidgetBaseUrl = () => {
    const widgetUrl = import.meta.env.VITE_WIDGET_URL
    if (widgetUrl) return widgetUrl

    const hostname = window.location.hostname
    // I dev-modus på Cloud Run: bytt ut 'admin' med 'widget' i URL
    if (hostname.includes('klimaoslo-kart-admin')) {
      return window.location.origin.replace('klimaoslo-kart-admin', 'klimaoslo-kart-widget')
    }
    // Localhost
    if (hostname === 'localhost') {
      return 'http://localhost:3001'
    }
    // Produksjon
    return 'https://kart.klimaoslo.no'
  }

  const generateEmbedUrl = () => {
    if (!slug) return ''
    const baseUrl = getWidgetBaseUrl()
    const params = new URLSearchParams()

    if (embedOptions.skjulSokefelt) params.append('sokefelt', '0')
    if (embedOptions.skjulKategorifilter) params.append('filter', '0')
    if (embedOptions.skjulSidebar) params.append('sidebar', '0')

    const queryString = params.toString()
    return `${baseUrl}/${slug}${queryString ? `?${queryString}` : ''}`
  }

  const generateEmbedCode = () => {
    const url = generateEmbedUrl()
    if (!url) return ''

    return `<iframe
  src="${url}"
  width="100%"
  height="600"
  frameborder="0"
  title="Kart: ${formData.navn}"
  loading="lazy"
></iframe>`
  }

  const copyToClipboard = async (text: string, type: 'embed' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'embed') {
        setEmbedCopied(true)
        setTimeout(() => setEmbedCopied(false), 2000)
      } else {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      }
    } catch (err) {
      console.error('Kunne ikke kopiere til utklippstavle:', err)
    }
  }

  const fetchKartinstans = async (kartSlug: string) => {
    try {
      const response = await apiFetch(`/api/kartinstanser/${kartSlug}`)
      if (!response.ok) throw new Error('Kunne ikke hente kartinstans')
      const data = await response.json()
      const kart: KartinstansDTO = data.data
      const kartData: KartinstansInput = {
        navn: kart.navn,
        beskrivelse: kart.beskrivelse,
        config: kart.config,
        kategorier: kart.kategorier,
      }
      setFormData(kartData)
      // Store original data for change tracking
      setOriginalFormData(JSON.parse(JSON.stringify(kartData)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (saving) return // Prevent double-click

    // For editing: don't save if no changes
    if (isEditing && !changes.hasChanges) {
      return
    }

    // For new kartinstans: require name
    if (!isEditing && !formData.navn.trim()) {
      setError('Du må gi kartet et navn')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = isEditing ? `/api/kartinstanser/${slug}` : '/api/kartinstanser'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunne ikke lagre kartinstans')
      }

      // For new kartinstans, add pending places and navigate
      if (!isEditing) {
        const data = await response.json()
        const newSlug = data.data.id

        // Add all pending places to the new kartinstans
        for (const place of pendingPlaces) {
          try {
            const body: { placeId: string; kategoriId?: string } = {
              placeId: place.placeId,
            }
            if (place.selectedKategoriId) {
              body.kategoriId = place.selectedKategoriId
            }

            await apiFetch(`/api/kartinstanser/${newSlug}/steder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          } catch (placeErr) {
            console.error('Error adding pending place:', placeErr)
            // Continue with other places even if one fails
          }
        }

        navigate(`/kart/${newSlug}`)
        return
      }

      // Update original data to match current state (resets change tracking)
      setOriginalFormData(JSON.parse(JSON.stringify(formData)))
      setOriginalSteder(JSON.parse(JSON.stringify(existingSteder)))

      // Show success message
      setSaving(false)
      setSaveSuccess(true)

      // Hide success message and panel after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Ukjent feil')
      setSaving(false)
    }
  }

  const addKategori = () => {
    const newKategori: Kategori = {
      id: `kategori-${Date.now()}`,
      navn: '',
      farge: '#6FE9FF',
      hoverFarge: '#9AF0FF',
    }
    setFormData({
      ...formData,
      kategorier: [...formData.kategorier, newKategori],
    })
  }

  const updateKategori = (index: number, updates: Partial<Kategori>) => {
    const updatedKategorier = [...formData.kategorier]
    updatedKategorier[index] = { ...updatedKategorier[index], ...updates }
    setFormData({ ...formData, kategorier: updatedKategorier })
  }

  const removeKategori = (index: number) => {
    const updatedKategorier = formData.kategorier.filter((_, i) => i !== index)
    setFormData({ ...formData, kategorier: updatedKategorier })
  }

  // Revert all changes
  const revertChanges = () => {
    if (originalFormData) {
      setFormData(JSON.parse(JSON.stringify(originalFormData)))
    }
    if (originalSteder.length > 0) {
      setExistingSteder(JSON.parse(JSON.stringify(originalSteder)))
    }
  }

  // Open preview in new tab
  const openPreview = () => {
    const url = generateEmbedUrl()
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Title editing handlers
  const startEditingTitle = () => {
    setTempTitle(formData.navn)
    setIsEditingTitle(true)
    // Focus input after render
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const confirmTitleEdit = () => {
    if (tempTitle.trim()) {
      setFormData({ ...formData, navn: tempTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  const cancelTitleEdit = () => {
    setIsEditingTitle(false)
    setTempTitle('')
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmTitleEdit()
    } else if (e.key === 'Escape') {
      cancelTitleEdit()
    }
  }

  if (loading) {
    return <div className="loading">Laster kartinstans...</div>
  }

  return (
    <div className="kartinstans-editor">
      <div className="editor-header">
        <div className="editable-title">
          {isEditingTitle ? (
            <div className="title-edit-wrapper">
              <input
                ref={titleInputRef}
                type="text"
                className="title-input pkt-txt-30-medium"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={confirmTitleEdit}
                placeholder="Kartnavn"
              />
              <PktButton
                type="button"
                skin="tertiary"
                size="small"
                variant="icon-only"
                iconName="check"
                onClick={confirmTitleEdit}
                aria-label="Bekreft"
              />
            </div>
          ) : (
            <div className="title-display-wrapper">
              <h2 className="pkt-txt-30-medium">
                {formData.navn || 'Nytt kart'}
              </h2>
              <PktButton
                type="button"
                skin="tertiary"
                size="small"
                variant="icon-only"
                iconName="edit"
                onClick={startEditingTitle}
                aria-label="Rediger kartnavn"
              />
            </div>
          )}
        </div>

        {isEditing && slug && (
          <PktButton
            type="button"
            skin="primary"
            size="medium"
            variant="icon-left"
            iconName="new-window"
            onClick={openPreview}
          >
            <span>Forhåndsvis kart</span>
          </PktButton>
        )}
      </div>

      {error && (
        <PktAlert skin="error" style={{ marginBottom: 'var(--pkt-spacing-16)' }}>
          {error}
        </PktAlert>
      )}

      <form onSubmit={handleSubmit}>

        <section className="form-section">
          <div className="section-header">
            <h3 className="pkt-txt-24-medium section-title">
              <PktIcon name="map" className="section-icon" />
              Steder {isEditing ? `(${existingSteder.length})` : pendingPlaces.length > 0 ? `(${pendingPlaces.length})` : ''}
            </h3>
          </div>

              <div className="steder-search" ref={searchContainerRef}>
              <div className="search-input-wrapper">
                <div className="search-autocomplete-container">
                  <div className="admin-search-field">
                    <SearchIcon className="admin-search-icon" />
                    <div className="pkt-sr-only-label-wrapper">
                      <PktTextinput
                        label="Søk etter steder"
                        id="search-steder"
                        name="search-steder"
                        placeholder="Søk etter steder (f.eks. 'Badstuer i Oslo')"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      />
                    </div>
                    {searchQuery && (
                      <button
                        type="button"
                        className="search-clear-button"
                        onClick={() => {
                          setSearchQuery('')
                          setSuggestions([])
                          setShowSuggestions(false)
                          setSearchResults([])
                        }}
                        aria-label="Tøm søkefelt"
                      >
                        <PktIcon name="close" className="search-clear-icon" />
                      </button>
                    )}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {loadingSuggestions && (
                        <div className="autocomplete-loading">Laster forslag...</div>
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
                </div>
                <PktButton
                  type="button"
                  onClick={() => { setShowSuggestions(false); searchPlaces(); }}
                  disabled={searching || !searchQuery.trim()}
                  skin="primary"
                >
                  {searching ? 'Søker...' : 'Søk'}
                </PktButton>
              </div>
              <p className="search-hint">Begynn å skrive for forslag, eller trykk Enter/Søk for å søke bredt. Søket er begrenset til Oslo.</p>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4 className="pkt-txt-18-medium">Søkeresultater ({searchResults.length})</h4>
                <div className="search-results-list">
                  {searchResults.map((place) => {
                    const alreadyAdded = isPlaceAlreadyAdded(place.placeId)
                    return (
                      <div key={place.placeId} className={`search-result-item ${alreadyAdded ? 'already-added' : ''}`}>
                        <div className="result-info">
                          <div className="result-name">{place.navn}</div>
                          <div className="result-address">{place.adresse}</div>
                        </div>
                        {alreadyAdded ? (
                          <div className="already-added-badge">Allerede lagt til</div>
                        ) : (
                          <div className="result-actions">
                            {formData.kategorier.length > 0 && (
                              <div className="pkt-sr-only-label-wrapper">
                                <PktSelect
                                  label="Velg kategori"
                                  id={`kategori-${place.placeId}`}
                                  name={`kategori-${place.placeId}`}
                                  value={place.selectedKategoriId || ''}
                                  onChange={(e) => updateSearchResultCategory(place.placeId, e.target.value)}
                                >
                                  <option value="">Ingen kategori</option>
                                  {formData.kategorier.map((kat) => (
                                    <option key={kat.id} value={kat.id}>
                                      {kat.navn}
                                    </option>
                                  ))}
                                </PktSelect>
                              </div>
                            )}
                            <PktButton
                              type="button"
                              onClick={() => addPlace(place)}
                              disabled={addingPlace === place.placeId}
                              skin="secondary"
                              size="small"
                            >
                              {addingPlace === place.placeId ? 'Legger til...' : '+ Legg til'}
                            </PktButton>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {existingSteder.length > 0 && (
              <div className="existing-steder">
                <h4 className="pkt-txt-18-medium">Steder i kartet</h4>
                <table className="steder-table">
                  <thead>
                    <tr>
                      <th>Navn</th>
                      {formData.kategorier.length > 0 && <th>Kategori</th>}
                      <th>Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingSteder.map((sted) => {
                      const kategori = sted.kategoriId ? getKategoriById(sted.kategoriId) : null
                      return (
                        <tr key={sted.id}>
                          <td>
                            <div className="sted-name">{sted.cachedData?.navn || sted.placeId}</div>
                            <div className="sted-address">{sted.cachedData?.adresse}</div>
                          </td>
                          {formData.kategorier.length > 0 && (
                            <td>
                              <div
                                className="kategori-cell"
                                ref={editingCategoryStedId === sted.id ? categoryDropdownRef : null}
                              >
                                <button
                                  type="button"
                                  className="kategori-badge-button"
                                  onClick={() => setEditingCategoryStedId(
                                    editingCategoryStedId === sted.id ? null : sted.id
                                  )}
                                  disabled={updatingCategory === sted.id}
                                  style={{
                                    backgroundColor: kategori?.farge || '#e0e0e0',
                                    color: kategori ? getTextColorForBackground(kategori.farge) : '#333'
                                  }}
                                >
                                  {updatingCategory === sted.id ? (
                                    'Oppdaterer...'
                                  ) : (
                                    <>
                                      {kategori?.navn || 'Ingen kategori'}
                                      <svg
                                        className="kategori-chevron"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </>
                                  )}
                                </button>
                                {editingCategoryStedId === sted.id && (
                                  <div className="kategori-dropdown">
                                    <button
                                      type="button"
                                      className={`kategori-dropdown-item ${!sted.kategoriId ? 'active' : ''}`}
                                      onClick={() => {
                                        if (sted.kategoriId) {
                                          updateStedCategory(sted.id, '')
                                        } else {
                                          setEditingCategoryStedId(null)
                                        }
                                      }}
                                    >
                                      <span
                                        className="kategori-dropdown-color"
                                        style={{ backgroundColor: '#e0e0e0' }}
                                      />
                                      Ingen kategori
                                      {!sted.kategoriId && (
                                        <svg
                                          className="kategori-check"
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </button>
                                    {formData.kategorier.map((kat) => (
                                      <button
                                        key={kat.id}
                                        type="button"
                                        className={`kategori-dropdown-item ${kat.id === sted.kategoriId ? 'active' : ''}`}
                                        onClick={() => {
                                          if (kat.id !== sted.kategoriId) {
                                            updateStedCategory(sted.id, kat.id)
                                          } else {
                                            setEditingCategoryStedId(null)
                                          }
                                        }}
                                      >
                                        <span
                                          className="kategori-dropdown-color"
                                          style={{ backgroundColor: kat.farge }}
                                        />
                                        {kat.navn}
                                        {kat.id === sted.kategoriId && (
                                          <svg
                                            className="kategori-check"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td>
                            <PktButton
                              type="button"
                              onClick={() => deletePlace(sted.id)}
                              skin="tertiary"
                              size="small"
                            >
                              Fjern
                            </PktButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

              {/* Show pending places for new kartinstans */}
              {!isEditing && pendingPlaces.length > 0 && (
                <div className="existing-steder">
                  <h4 className="pkt-txt-18-medium">Steder som blir lagt til</h4>
                  <table className="steder-table">
                    <thead>
                      <tr>
                        <th>Navn</th>
                        {formData.kategorier.length > 0 && <th>Kategori</th>}
                        <th>Handlinger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPlaces.map((place) => {
                        return (
                          <tr key={place.placeId}>
                            <td>
                              <div className="sted-name">{place.navn}</div>
                              <div className="sted-address">{place.adresse}</div>
                            </td>
                            {formData.kategorier.length > 0 && (
                              <td>
                                <div className="pkt-sr-only-label-wrapper">
                                  <PktSelect
                                    label="Velg kategori"
                                    id={`pending-kategori-${place.placeId}`}
                                    name={`pending-kategori-${place.placeId}`}
                                    value={place.selectedKategoriId || ''}
                                    onChange={(e) => updatePendingPlaceCategory(place.placeId, e.target.value)}
                                  >
                                    <option value="">Ingen kategori</option>
                                    {formData.kategorier.map((kat) => (
                                      <option key={kat.id} value={kat.id}>
                                        {kat.navn}
                                      </option>
                                    ))}
                                  </PktSelect>
                                </div>
                              </td>
                            )}
                            <td>
                              <PktButton
                                type="button"
                                onClick={() => removePendingPlace(place.placeId)}
                                skin="tertiary"
                                size="small"
                              >
                                Fjern
                              </PktButton>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty state hints */}
              {isEditing && existingSteder.length === 0 && searchResults.length === 0 && (
                <p className="empty-hint">Ingen steder lagt til ennå. Bruk søket over for å finne og legge til steder.</p>
              )}
              {!isEditing && pendingPlaces.length === 0 && searchResults.length === 0 && (
                <p className="empty-hint">Søk etter steder og legg dem til i kartet.</p>
              )}
        </section>

        <section className="form-section">
          <div className="section-header">
            <h3 className="pkt-txt-24-medium section-title">
              <PktIcon name="layers" className="section-icon" />
              Kategorier
            </h3>
            <PktButton type="button" onClick={addKategori} skin="secondary" size="small">
              + Ny kategori
            </PktButton>
          </div>

          <p className="section-description">Kategorier er valgfrie. Hvis du legger til kategorier, vil bare steder med kategori vises i kartet.</p>

          {formData.kategorier.length === 0 ? (
            <p className="empty-hint">Ingen kategorier lagt til ennå.</p>
          ) : (
            <div className="kategorier-list">
              {formData.kategorier.map((kategori, index) => (
                <div key={kategori.id} className="kategori-row">
                  <div className="kategori-color-picker">
                    <span
                      className="color-preview"
                      style={{ backgroundColor: kategori.farge }}
                    />
                    <PktSelect
                      label="Farge"
                      id={`kategori-farge-${index}`}
                      name={`kategori-farge-${index}`}
                      value={kategori.farge}
                      onChange={(e) => updateKategori(index, { farge: e.target.value })}
                    >
                      {PUNKT_COLORS.map((color) => (
                        <option key={color.id} value={color.hex}>
                          {color.navn}
                        </option>
                      ))}
                    </PktSelect>
                  </div>
                  <div className="pkt-sr-only-label-wrapper kategori-name-input">
                    <PktTextinput
                      label="Kategorinavn"
                      id={`kategori-navn-${index}`}
                      name={`kategori-navn-${index}`}
                      value={kategori.navn}
                      onChange={(e) => updateKategori(index, { navn: e.target.value })}
                      placeholder="Kategorinavn"
                      required
                    />
                  </div>
                  <PktButton
                    type="button"
                    onClick={() => removeKategori(index)}
                    skin="tertiary"
                    size="small"
                  >
                    Slett
                  </PktButton>
                </div>
              ))}
            </div>
          )}
        </section>

        {isEditing && slug && (
          <section className="form-section embed-section">
            <div className="section-header">
              <h3 className="pkt-txt-24-medium section-title">
                <PktIcon name="code" className="section-icon" />
                Embed-kode
              </h3>
            </div>

            <p className="embed-intro">
              Kopier koden under og lim inn i WordPress for å vise kartet på klimaoslo.no
            </p>

            <div className="embed-code-container">
              <label>iframe-kode for WordPress:</label>
              <div className="embed-code-wrapper">
                <pre className="embed-code">{generateEmbedCode()}</pre>
                <PktButton
                  type="button"
                  onClick={() => copyToClipboard(generateEmbedCode(), 'embed')}
                  skin={embedCopied ? 'primary' : 'secondary'}
                >
                  {embedCopied ? 'Kopiert!' : 'Kopier kode'}
                </PktButton>
              </div>
            </div>

            <div className="embed-link-container">
              <label>Direkte lenke:</label>
              <div className="embed-link-wrapper">
                <input
                  type="text"
                  readOnly
                  value={generateEmbedUrl()}
                  className="embed-link-input"
                />
                <PktButton
                  type="button"
                  onClick={() => copyToClipboard(generateEmbedUrl(), 'link')}
                  skin={linkCopied ? 'primary' : 'secondary'}
                >
                  {linkCopied ? 'Kopiert!' : 'Kopier'}
                </PktButton>
              </div>
            </div>

            <div className="avanserte-innstillinger">
              <h3 className="pkt-txt-24-medium section-title">
                <PktIcon name="cogwheel" className="section-icon" />
                Avanserte innstillinger
              </h3>

              <div className="embed-option-row">
                <PktCheckbox
                  id="skjul-sokefelt"
                  label="Skjul søkefelt"
                  checked={embedOptions.skjulSokefelt}
                  onChange={(e) =>
                    setEmbedOptions({ ...embedOptions, skjulSokefelt: e.target.checked })
                  }
                />
              </div>

              <div className="embed-option-row">
                <PktCheckbox
                  id="skjul-kategorifilter"
                  label="Skjul kategorifilter"
                  checked={embedOptions.skjulKategorifilter}
                  onChange={(e) =>
                    setEmbedOptions({ ...embedOptions, skjulKategorifilter: e.target.checked })
                  }
                />
              </div>

              <div className="embed-option-row">
                <PktCheckbox
                  id="skjul-sidebar"
                  label="Skjul sidebar/liste"
                  checked={embedOptions.skjulSidebar}
                  onChange={(e) =>
                    setEmbedOptions({ ...embedOptions, skjulSidebar: e.target.checked })
                  }
                />
              </div>
            </div>
          </section>
        )}

      </form>

      {/* Buttons for new kartinstans - show when there are changes */}
      {!isEditing && hasNewKartChanges && (
        <div className="new-kart-actions">
          <PktButton
            type="button"
            skin="secondary"
            onClick={() => navigate('/')}
          >
            Avbryt
          </PktButton>
          <div className="save-button-wrapper">
            <PktButton
              type="button"
              skin="primary"
              disabled={saving || !formData.navn.trim()}
              onClick={handleSubmit}
            >
              {saving ? 'Lagrer...' : 'Lagre kart'}
            </PktButton>
            {!formData.navn.trim() && (
              <p className="save-hint">Gi kartet et navn for å lagre</p>
            )}
          </div>
        </div>
      )}

      {/* Floating action panel - only for editing existing maps */}
      {isEditing && (changes.hasChanges || saving || saveSuccess) && (
        <div className={`floating-action-panel ${saveSuccess ? 'success' : ''}`}>
          <div className="floating-action-content">
            {saveSuccess ? (
              <span className="save-success-message">
                <svg className="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Endringer lagret!
              </span>
            ) : (
              <>
                <span className="changes-count">
                  {changes.count} {changes.count === 1 ? 'endring' : 'endringer'}
                </span>
                <div className="floating-action-buttons">
                  <PktButton
                    type="button"
                    skin="tertiary"
                    size="small"
                    onClick={revertChanges}
                  >
                    Angre endringer
                  </PktButton>
                  <PktButton
                    type="button"
                    skin="secondary"
                    size="small"
                    onClick={openPreview}
                  >
                    Forhåndsvis
                  </PktButton>
                  <PktButton
                    type="button"
                    skin="primary"
                    size="small"
                    disabled={saving || !changes.hasChanges}
                    onClick={handleSubmit}
                  >
                    {saving ? 'Lagrer...' : 'Lagre endringer'}
                  </PktButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
