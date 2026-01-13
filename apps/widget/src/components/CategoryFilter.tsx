import { PktCheckbox } from '@oslokommune/punkt-react'
import type { Kategori } from '@klimaoslo-kart/shared'

interface CategoryFilterProps {
  kategorier: Kategori[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
}

export function CategoryFilter({ kategorier, selected, onChange }: CategoryFilterProps) {
  const toggleCategory = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onChange(newSelected)
  }

  return (
    <div className="category-filter">
      {kategorier.map((kategori) => (
        <div key={kategori.id} className="category-filter-item">
          <span
            className="category-dot"
            style={{ backgroundColor: kategori.farge }}
            aria-hidden="true"
          />
          <PktCheckbox
            id={`kategori-${kategori.id}`}
            name={`kategori-${kategori.id}`}
            label={kategori.navn}
            checked={selected.has(kategori.id)}
            onChange={() => toggleCategory(kategori.id)}
          />
        </div>
      ))}
    </div>
  )
}
