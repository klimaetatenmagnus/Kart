import type { StedDTO, Kategori, PlaceDetails } from '@klimaoslo-kart/shared'
import { getStedKategorier, getForsteKategoriId } from '@klimaoslo-kart/shared'

interface SidebarProps {
  steder: StedDTO[]
  kategorier: Kategori[]
  onStedClick: (sted: StedDTO, placeDetails?: PlaceDetails) => void
  selectedStedId?: string
}

// Fjern "Norway" fra adresser for renere visning
function formatAddress(address: string): string {
  return address
    .replace(/,?\s*Norway\s*$/i, '')
    .replace(/,?\s*Norge\s*$/i, '')
    .trim()
}

export function Sidebar({ steder, kategorier, onStedClick, selectedStedId }: SidebarProps) {
  // Sorter steder etter kategori og deretter navn
  // Steder uten kategori sorteres sist
  // Bruker første kategori for sortering (fler-kategori støtte)
  const sortedSteder = [...steder].sort((a, b) => {
    const catIdA = getForsteKategoriId(a)
    const catIdB = getForsteKategoriId(b)
    const catA = catIdA ? kategorier.findIndex((k) => k.id === catIdA) : 999
    const catB = catIdB ? kategorier.findIndex((k) => k.id === catIdB) : 999
    if (catA !== catB) return catA - catB
    return a.cachedData.navn.localeCompare(b.cachedData.navn)
  })

  return (
    <div className="sidebar">
      <ul className="store-list">
        {sortedSteder.map((sted) => {
          // Hent alle kategorier for stedet (maks 4)
          const stedKategorier = getStedKategorier(sted).slice(0, 4)
          const harFlereKategorier = stedKategorier.length > 2

          return (
            <li
              key={sted.id}
              className={`store-item ${selectedStedId === sted.id ? 'selected' : ''} ${harFlereKategorier ? 'multi-category' : ''}`}
              onClick={() => onStedClick(sted)}
            >
              <div className={`category-dots ${harFlereKategorier ? 'grid-2x2' : ''}`}>
                {stedKategorier.map((katId) => {
                  const kategori = kategorier.find((k) => k.id === katId)
                  return kategori ? (
                    <span
                      key={katId}
                      className="category-dot"
                      style={{ backgroundColor: kategori.farge }}
                      title={kategori.navn}
                    />
                  ) : null
                })}
              </div>
              <div className="store-info">
                <span className="pkt-txt-16-medium">{sted.cachedData.navn}</span>
                <span className="pkt-txt-14">{formatAddress(sted.cachedData.adresse)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
