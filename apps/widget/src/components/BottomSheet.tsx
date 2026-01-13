import { PktButton, PktIcon } from '@oslokommune/punkt-react'
import type { PlaceDetails } from '@klimaoslo-kart/shared'

interface BottomSheetProps {
  placeDetails: PlaceDetails
  onClose: () => void
}

export function BottomSheet({ placeDetails, onClose }: BottomSheetProps) {
  return (
    <div className="bottom-sheet show">
      <PktButton
        skin="tertiary"
        size="small"
        variant="icon-only"
        iconName="close"
        onClick={onClose}
        aria-label="Lukk"
        className="close-btn"
      />
      <div className="bottom-sheet-content">
        <h3 className="pkt-txt-18-medium">{placeDetails.navn}</h3>

        {placeDetails.bilder?.[0] && (
          <img
            src={placeDetails.bilder[0]}
            alt={placeDetails.navn}
            className="place-image"
          />
        )}

        <div className="bottom-sheet-detail">
          <PktIcon name="location-pin" className="bottom-sheet-icon" />
          <div>
            <span className="pkt-txt-14-medium">Adresse</span>
            <span className="pkt-txt-14">{placeDetails.adresse}</span>
          </div>
        </div>

        {placeDetails.apningstider && (
          <div className="bottom-sheet-detail">
            <PktIcon name="clock" className="bottom-sheet-icon" />
            <div className="opening-hours">
              <span className="pkt-txt-14-medium">Åpningstider</span>
              <ul>
                {placeDetails.apningstider.map((time, i) => (
                  <li key={i} className="pkt-txt-14">{time}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {placeDetails.telefon && (
          <div className="bottom-sheet-detail">
            <PktIcon name="mobile-phone" className="bottom-sheet-icon" />
            <div>
              <span className="pkt-txt-14-medium">Telefon</span>
              <a href={`tel:${placeDetails.telefon}`} className="pkt-txt-14">{placeDetails.telefon}</a>
            </div>
          </div>
        )}

        {placeDetails.nettside && (
          <div className="bottom-sheet-detail">
            <PktIcon name="link" className="bottom-sheet-icon" />
            <div>
              <span className="pkt-txt-14-medium">Nettside</span>
              <a href={placeDetails.nettside} target="_blank" rel="noopener noreferrer" className="pkt-txt-14">
                Besøk nettside
              </a>
            </div>
          </div>
        )}

        {placeDetails.googleMapsUrl && (
          <div className="bottom-sheet-detail">
            <PktIcon name="map-cursor" className="bottom-sheet-icon" />
            <div>
              <span className="pkt-txt-14-medium">Veibeskrivelse</span>
              <a href={placeDetails.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="pkt-txt-14">
                Åpne i Google Maps
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
