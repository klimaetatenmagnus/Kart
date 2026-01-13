import { useState, useEffect } from 'react'
import { PktButton, PktAlert, PktTag } from '@oslokommune/punkt-react'
import type { TipsDTO, TipsStatus, KartinstansDTO } from '@klimaoslo-kart/shared'
import { apiFetch } from '../services/api'

export function TipsOversikt() {
  const [tips, setTips] = useState<TipsDTO[]>([])
  const [kartinstanser, setKartinstanser] = useState<KartinstansDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TipsStatus | 'alle'>('ny')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tipsResponse, kartResponse] = await Promise.all([
        apiFetch('/api/tips'),
        apiFetch('/api/kartinstanser'),
      ])
      if (!tipsResponse.ok) throw new Error('Kunne ikke hente tips')
      const tipsData = await tipsResponse.json()
      setTips(tipsData.data || [])

      if (kartResponse.ok) {
        const kartData = await kartResponse.json()
        setKartinstanser(kartData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }

  const getKartinstansNavn = (kartinstansId: string): string => {
    const kart = kartinstanser.find((k) => k.id === kartinstansId)
    return kart?.navn || kartinstansId
  }

  const getKartinstans = (kartinstansId: string): KartinstansDTO | undefined => {
    return kartinstanser.find((k) => k.id === kartinstansId)
  }

  const getKategoriNavn = (kartinstansId: string, kategoriId: string): string => {
    const kart = kartinstanser.find((k) => k.id === kartinstansId)
    const kategori = kart?.kategorier.find((kat) => kat.id === kategoriId)
    return kategori?.navn || kategoriId
  }

  const formatDate = (dateValue: unknown): string => {
    let date: Date
    if (typeof dateValue === 'string') {
      date = new Date(dateValue)
    } else if (dateValue && typeof dateValue === 'object' && '_seconds' in dateValue) {
      date = new Date((dateValue as { _seconds: number })._seconds * 1000)
    } else {
      return 'Ukjent dato'
    }
    if (isNaN(date.getTime())) return 'Ukjent dato'
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleStatusChange = async (tipId: string, newStatus: TipsStatus) => {
    try {
      const response = await apiFetch(`/api/tips/${tipId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Kunne ikke oppdatere tips')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    }
  }

  // Godkjenn tips og legg til sted i kartet
  const handleApprove = async (tip: TipsDTO) => {
    try {
      // Sjekk om tipset har en placeId (fra Google Places)
      const tipWithPlace = tip as TipsDTO & { placeId?: string }

      if (tipWithPlace.placeId) {
        // Legg til stedet i kartinstansen
        const body: { placeId: string; kategoriId?: string } = {
          placeId: tipWithPlace.placeId,
        }
        if (tip.kategori) {
          body.kategoriId = tip.kategori
        }

        const addResponse = await apiFetch(`/api/kartinstanser/${tip.kartinstansId}/steder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!addResponse.ok) {
          const errorData = await addResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Kunne ikke legge til sted')
        }
      }

      // Oppdater tips-status
      await handleStatusChange(tip.id, 'godkjent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil ved godkjenning')
    }
  }

  const filteredTips = tips.filter((tip) => {
    if (filter === 'alle') return true
    return tip.status === filter
  })

  const nyeTips = tips.filter((t) => t.status === 'ny').length

  if (loading) {
    return <div className="loading">Laster tips...</div>
  }

  return (
    <div className="tips-oversikt">
      <h2>Tips fra brukere</h2>
      {nyeTips > 0 && (
        <PktTag skin="red" className="mb-size-16">
          {nyeTips} {nyeTips === 1 ? 'nytt tips' : 'nye tips'}
        </PktTag>
      )}

      {error && (
        <PktAlert skin="error" style={{ marginBottom: 'var(--pkt-spacing-16)' }}>
          {error}
        </PktAlert>
      )}

      <div className="tips-filters">
        <PktButton
          skin={filter === 'ny' ? 'primary' : 'tertiary'}
          size="small"
          onClick={() => setFilter('ny')}
        >
          Nye ({tips.filter((t) => t.status === 'ny').length})
        </PktButton>
        <PktButton
          skin={filter === 'godkjent' ? 'primary' : 'tertiary'}
          size="small"
          onClick={() => setFilter('godkjent')}
        >
          Godkjent
        </PktButton>
        <PktButton
          skin={filter === 'avvist' ? 'primary' : 'tertiary'}
          size="small"
          onClick={() => setFilter('avvist')}
        >
          Avvist
        </PktButton>
        <PktButton
          skin={filter === 'alle' ? 'primary' : 'tertiary'}
          size="small"
          onClick={() => setFilter('alle')}
        >
          Alle
        </PktButton>
      </div>

      {filteredTips.length === 0 ? (
        <div className="empty-state">
          <p>Ingen tips å vise med dette filteret.</p>
        </div>
      ) : (
        <div className="tips-list">
          {filteredTips.map((tip) => {
            const kart = getKartinstans(tip.kartinstansId)
            const tipWithPlace = tip as TipsDTO & { placeId?: string }
            const hasPlaceId = Boolean(tipWithPlace.placeId)

            return (
              <div key={tip.id} className="tips-card">
                <div className="tips-header">
                  <PktTag
                    skin={
                      tip.status === 'ny'
                        ? 'yellow'
                        : tip.status === 'godkjent'
                        ? 'green'
                        : 'red'
                    }
                  >
                    {tip.status === 'ny' && 'NY'}
                    {tip.status === 'godkjent' && 'GODKJENT'}
                    {tip.status === 'avvist' && 'AVVIST'}
                  </PktTag>
                  <span className="tips-date">
                    {formatDate(tip.opprettet)}
                  </span>
                </div>
                <div className="tips-content">
                  <p>
                    <strong>Kart:</strong> {getKartinstansNavn(tip.kartinstansId)}
                  </p>
                  <p>
                    <strong>Sted:</strong> {tip.butikknavn}
                  </p>
                  <p>
                    <strong>Adresse:</strong> {tip.adresse}
                  </p>
                  {kart && kart.kategorier.length > 0 && (
                    <p>
                      <strong>Foreslått kategori:</strong> {getKategoriNavn(tip.kartinstansId, tip.kategori)}
                    </p>
                  )}
                </div>
                {tip.status === 'ny' && (
                  <div className="tips-actions">
                    <PktButton
                      skin="primary"
                      size="small"
                      onClick={() => handleApprove(tip)}
                    >
                      {hasPlaceId ? 'Godkjenn og legg til' : 'Godkjenn'}
                    </PktButton>
                    <PktButton
                      skin="secondary"
                      size="small"
                      onClick={() => handleStatusChange(tip.id, 'avvist')}
                    >
                      Avvis
                    </PktButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
