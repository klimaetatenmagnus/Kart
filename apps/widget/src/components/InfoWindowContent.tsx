import { PktIcon } from '@oslokommune/punkt-react'
import type { PlaceDetails, BildeCacheDTO } from '@klimaoslo-kart/shared'

interface InfoWindowContentProps {
  placeDetails: PlaceDetails
  bildeCache?: BildeCacheDTO
}

export function InfoWindowContent({ placeDetails, bildeCache }: InfoWindowContentProps) {
  // Bruk cachet bilde fra Cloud Storage hvis tilgjengelig, ellers fallback til Google Places
  const bildeUrl = bildeCache?.url || placeDetails.bilder?.[0]

  return (
    <article className="pkt-info-window">
      <header className="pkt-info-window__header">
        <h3>{placeDetails.navn}</h3>
      </header>

      {bildeUrl && (
        <img
          src={bildeUrl}
          alt={placeDetails.navn}
          className="pkt-info-window__image"
          loading="lazy"
        />
      )}

      <dl className="pkt-info-window__details">
        <div className="pkt-info-window__detail-row">
          <dt>
            <PktIcon name="location-pin" className="pkt-info-window__icon" />
            Adresse
          </dt>
          <dd>{placeDetails.adresse}</dd>
        </div>

        {placeDetails.apningstider && placeDetails.apningstider.length > 0 && (
          <div className="pkt-info-window__detail-row">
            <dt>
              <PktIcon name="clock" className="pkt-info-window__icon" />
              Åpningstider
            </dt>
            <dd>
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
            <dt>
              <PktIcon name="mobile-phone" className="pkt-info-window__icon" />
              Telefon
            </dt>
            <dd>
              <a href={`tel:${placeDetails.telefon}`}>{placeDetails.telefon}</a>
            </dd>
          </div>
        )}

        {placeDetails.nettside && (
          <div className="pkt-info-window__detail-row">
            <dt>
              <PktIcon name="link" className="pkt-info-window__icon" />
              Nettside
            </dt>
            <dd>
              <a href={placeDetails.nettside} target="_blank" rel="noopener noreferrer">
                Besøk nettside
              </a>
            </dd>
          </div>
        )}

        {placeDetails.googleMapsUrl && (
          <div className="pkt-info-window__detail-row">
            <dt>
              <PktIcon name="map-cursor" className="pkt-info-window__icon" />
              Veibeskrivelse
            </dt>
            <dd>
              <a href={placeDetails.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                Åpne i Google Maps
              </a>
            </dd>
          </div>
        )}
      </dl>
    </article>
  )
}
