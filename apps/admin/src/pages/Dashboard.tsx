import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PktButton, PktAlert, PktIcon } from '@oslokommune/punkt-react'
import type { KartinstansDTO } from '@klimaoslo-kart/shared'
import { apiFetch } from '../services/api'

// Widget URL - bruk miljøvariabel eller utled fra admin URL
const getWidgetUrl = () => {
  const widgetUrl = import.meta.env.VITE_WIDGET_URL
  if (widgetUrl) return widgetUrl

  // I dev-modus på Cloud Run: bytt ut 'admin' med 'widget' i URL
  const hostname = window.location.hostname
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

export function Dashboard() {
  const [kartinstanser, setKartinstanser] = useState<KartinstansDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchKartinstanser()
  }, [])

  const fetchKartinstanser = async () => {
    try {
      const response = await apiFetch('/api/kartinstanser')
      if (!response.ok) throw new Error('Kunne ikke hente kartinstanser')
      const data = await response.json()
      setKartinstanser(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (kartId: string) => {
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/kartinstanser/${kartId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Kunne ikke slette kartet')
      setKartinstanser((prev) => prev.filter((k) => k.id !== kartId))
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette kartet')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="loading">Laster kartinstanser...</div>
  }

  if (error) {
    return (
      <PktAlert skin="error">
        Feil: {error}
      </PktAlert>
    )
  }

  // Hjelpefunksjon for å formatere brukernavn
  const formatUserName = (email: string | undefined) => {
    if (!email) return 'Ukjent'
    // Fjern @oslo.kommune.no og formater navn
    const namePart = email.split('@')[0]
    return namePart
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  // Hjelpefunksjon for å formatere dato (håndterer både ISO-strenger og Firestore timestamps)
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
    return date.toLocaleDateString('nb-NO')
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="pkt-txt-30-medium">Dine kart</h2>
        <Link to="/kart/ny">
          <PktButton skin="primary">
            + Nytt kart
          </PktButton>
        </Link>
      </div>

      {kartinstanser.length === 0 ? (
        <div className="empty-state">
          <p>Du har ingen kart ennå.</p>
          <Link to="/kart/ny">
            <PktButton skin="primary">
              Opprett ditt første kart
            </PktButton>
          </Link>
        </div>
      ) : (
        <div className="kartinstanser-grid">
          {kartinstanser.map((kart) => (
            <div key={kart.id} className="kartinstans-card">
              <h3 className="pkt-txt-24-medium">{kart.navn}</h3>
              <div className="card-meta">
                <span>{kart.kategorier.length} kategorier</span>
              </div>
              <div className="card-user-info">
                <div className="user-info-row">
                  <span className="user-info-label">Opprettet av:</span>
                  <span className="user-info-value">{formatUserName(kart.opprettetAv)}</span>
                </div>
                <div className="user-info-row">
                  <span className="user-info-label">Sist endret:</span>
                  <span className="user-info-value">
                    {formatDate(kart.sisteEndret)}
                    {kart.sisteEndretAv && ` av ${formatUserName(kart.sisteEndretAv)}`}
                  </span>
                </div>
              </div>
              <div className="card-actions">
                <Link to={`/kart/${kart.id}`}>
                  <PktButton skin="primary" size="small">
                    Rediger
                  </PktButton>
                </Link>
                <a
                  href={`${getWidgetUrl()}/${kart.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PktButton skin="tertiary" size="small">
                    Forhåndsvis
                  </PktButton>
                </a>
              </div>
              <button
                className="delete-button"
                onClick={() => setDeleteConfirm(kart.id)}
              >
                <PktIcon name="trash-can" className="delete-icon" />
                Slett kart
              </button>
              {deleteConfirm === kart.id && (
                <div className="delete-confirm-overlay">
                  <div className="delete-confirm-dialog">
                    <p>Er du sikker på at du vil slette kartet «{kart.navn}»?</p>
                    <p className="delete-warning">Denne handlingen kan ikke angres.</p>
                    <div className="delete-confirm-actions">
                      <PktButton
                        skin="secondary"
                        size="small"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                      >
                        Avbryt
                      </PktButton>
                      <PktButton
                        skin="primary"
                        size="small"
                        onClick={() => handleDelete(kart.id)}
                        disabled={deleting}
                      >
                        {deleting ? 'Sletter...' : 'Slett'}
                      </PktButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
