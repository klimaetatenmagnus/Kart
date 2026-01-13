import type { Kategori } from '@klimaoslo-kart/shared'

interface LegendProps {
  kategorier: Kategori[]
}

/**
 * Legend-komponent for kartvisning
 * Viser alle kategorier med fargekodede prikker
 * Bygget med Punkt designsystem-styling
 */
export function Legend({ kategorier }: LegendProps) {
  if (kategorier.length === 0) {
    return null
  }

  return (
    <div className="map-legend" role="region" aria-label="Kartlegende">
      <h4 className="map-legend__title pkt-txt-14-medium">Kategorier</h4>
      <ul className="map-legend__list">
        {kategorier.map((kategori) => (
          <li key={kategori.id} className="map-legend__item">
            <span
              className="map-legend__dot"
              style={{ backgroundColor: kategori.farge }}
              aria-hidden="true"
            />
            <span className="map-legend__label pkt-txt-14">{kategori.navn}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
