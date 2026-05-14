'use client'

export function shipSVG(id: string, sz: number, ori: 'h' | 'v') {
  const w = ori === 'h' ? sz * 30 : 30
  const h = ori === 'h' ? 30 : sz * 30
  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><g>`]
  const len = w - 4

  if (id === 'carrier') {
    parts.push(`<rect x="2" y="5" width="${len}" height="20" rx="4" fill="#6a7a8a" stroke="#4a5a6a" stroke-width=".5"/>`)
    parts.push(`<rect x="5" y="8" width="${len - 6}" height="3" rx="1" fill="#445" opacity=".35"/>`)
    parts.push(`<rect x="5" y="13" width="${len - 6}" height="3" rx="1" fill="#445" opacity=".35"/>`)
    parts.push(`<rect x="5" y="18" width="${len - 6}" height="3" rx="1" fill="#445" opacity=".35"/>`)
    parts.push(`<rect x="${len - 13}" y="2" width="11" height="6" rx="1" fill="#4a5a6a"/>`)
    parts.push(`<rect x="${len - 12}" y="1" width="3" height="2" fill="#5a6a7a"/>`)
    parts.push(`<polygon points="6,14 9,12 9,16" fill="#ffd700" opacity=".6"/>`)
  } else if (id === 'battleship') {
    parts.push(`<rect x="2" y="7" width="${len}" height="16" rx="3" fill="#5a6a7a" stroke="#3a4a5a" stroke-width=".5"/>`)
    if (sz === 4) {
      parts.push(`<circle cx="8" cy="15" r="3.5" fill="#4a5a6a"/><rect x="6" y="10" width="4" height="2" rx="1" fill="#5a6a7a"/>`)
      parts.push(`<circle cx="${w - 8}" cy="15" r="3.5" fill="#4a5a6a"/><rect x="${w - 10}" y="10" width="4" height="2" rx="1" fill="#5a6a7a"/>`)
    } else {
      parts.push(`<circle cx="${w / 2}" cy="15" r="3.5" fill="#4a5a6a"/><rect x="${w / 2 - 2}" y="10" width="4" height="2" rx="1" fill="#5a6a7a"/>`)
    }
  } else if (id === 'cruiser') {
    parts.push(`<rect x="2" y="8" width="${len}" height="14" rx="3" fill="#6a7a8a" stroke="#4a5a6a" stroke-width=".5"/>`)
    parts.push(`<circle cx="${w / 2}" cy="15" r="3" fill="#4a5a6a"/><rect x="${w / 2 - 2}" y="11" width="4" height="2" rx="1" fill="#5a6a7a"/>`)
    parts.push(`<rect x="${w / 2 - 1}" y="5" width="2" height="4" fill="#5a6a7a"/>`)
  } else if (id === 'submarine') {
    parts.push(`<ellipse cx="${w / 2}" cy="15" rx="${len / 2}" ry="7" fill="#3a4a5a" stroke="#2a3a4a" stroke-width=".5"/>`)
    parts.push(`<rect x="${w / 2 - 3}" y="5" width="6" height="5" rx="2" fill="#4a5a6a"/>`)
    parts.push(`<rect x="${w / 2}" y="3" width="1" height="3" fill="#5a6a7a"/>`)
  } else if (id === 'destroyer') {
    parts.push(`<rect x="2" y="9" width="${len}" height="12" rx="3" fill="#6a7a6a" stroke="#4a5a4a" stroke-width=".5"/>`)
    parts.push(`<circle cx="${w / 2}" cy="15" r="2.5" fill="#4a5a4a"/><rect x="${w / 2 - 1.5}" y="11" width="3" height="2" rx="1" fill="#5a6a5a"/>`)
    parts.push(`<rect x="${w / 2 - 1}" y="8" width="2" height="3" fill="#5a6a5a"/>`)
  }

  parts.push('</g></svg>')
  return parts.join('')
}

interface ShipSvgProps {
  id: string
  size: number
  orientation: 'h' | 'v'
  className?: string
}

export default function ShipSvg({ id, size, orientation, className }: ShipSvgProps) {
  const svg = shipSVG(id, size, orientation)
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
