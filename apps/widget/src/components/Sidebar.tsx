import type { StedDTO, Kategori, PlaceDetails } from '@klimaoslo-kart/shared'

// Punkt designsystem mørkeblå farge - brukes for steder uten kategori
const PUNKT_DARK_BLUE = '#2A2859'

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
  const sortedSteder = [...steder].sort((a, b) => {
    const catA = a.kategoriId ? kategorier.findIndex((k) => k.id === a.kategoriId) : 999
    const catB = b.kategoriId ? kategorier.findIndex((k) => k.id === b.kategoriId) : 999
    if (catA !== catB) return catA - catB
    return a.cachedData.navn.localeCompare(b.cachedData.navn)
  })

  return (
    <div className="sidebar">
      <ul className="store-list">
        {sortedSteder.map((sted) => {
          const kategori = sted.kategoriId
            ? kategorier.find((k) => k.id === sted.kategoriId)
            : null
          // Bruk kategori-farge hvis den finnes, ellers mørkeblå fra Punkt
          const dotColor = kategori?.farge || PUNKT_DARK_BLUE
          return (
            <li
              key={sted.id}
              className={`store-item ${selectedStedId === sted.id ? 'selected' : ''}`}
              onClick={() => onStedClick(sted)}
            >
              <span
                className="category-dot"
                style={{ backgroundColor: dotColor }}
              />
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
