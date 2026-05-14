'use client'

import { useCallback, useRef, useEffect } from 'react'
import { TAM, LETTERS } from '../../lib/constants'
import type { Board, PlacedShip, Orientation } from '../../lib/types'
import { shipSVG } from './ShipSvg'

interface GridProps {
  id: string
  board: Board
  ships?: PlacedShip[]
  hits: Set<string>
  misses: Set<string>
  sunkShips?: PlacedShip[]
  interactive?: boolean
  placementMode?: boolean
  onCellClick?: (r: number, c: number) => void
  onCellHover?: (r: number, c: number | null) => void
  previewCells?: { r: number; c: number; valid: boolean }[]
  showShips?: boolean
  revealedShips?: PlacedShip[]
}

function renderShipOverlay(
  gridEl: HTMLElement | null,
  wrapEl: HTMLElement | null,
  ships: PlacedShip[] | undefined,
  hits: Set<string>,
  reveal: boolean,
) {
  if (!gridEl || !wrapEl || !ships) return
  wrapEl.querySelectorAll('.ship-art, .enemy-ship-reveal').forEach((e) => e.remove())

  for (const ship of ships) {
    if (!ship.cells?.length) continue

    if (reveal) {
      const allHit = ship.cells.every((c) => hits.has(`${c.r},${c.c}`))
      if (!allHit && !ship.cells.some((c) => hits.has(`${c.r},${c.c}`))) continue
    }

    const els = ship.cells
      .map((c) => gridEl.querySelector<HTMLElement>(`.cell[data-r="${c.r}"][data-c="${c.c}"]`))
      .filter(Boolean) as HTMLElement[]

    if (!els.length) continue

    const fR = els[0].getBoundingClientRect()
    const lR = els[els.length - 1].getBoundingClientRect()
    const wR = wrapEl.getBoundingClientRect()

    const div = document.createElement('div')
    div.className = reveal ? 'enemy-ship-reveal' : 'ship-art'
    div.style.cssText = `
      position: absolute; pointer-events: none; z-index: 2; overflow: visible;
      left: ${fR.left - wR.left}px;
      top: ${fR.top - wR.top}px;
      width: ${ship.orientation === 'h' ? lR.right - fR.left : fR.width}px;
      height: ${ship.orientation === 'h' ? fR.height : lR.bottom - fR.top}px;
    `

    const svg = shipSVG(ship.id, ship.size, ship.orientation)
    div.innerHTML = svg
    const svgEl = div.querySelector('svg')
    if (svgEl) {
      svgEl.setAttribute('width', '100%')
      svgEl.setAttribute('height', '100%')
      svgEl.setAttribute('preserveAspectRatio', 'none')
    }

    if (reveal && ship.cells.every((c) => hits.has(`${c.r},${c.c}`))) {
      div.style.opacity = '0.4'
    }

    wrapEl.appendChild(div)
  }
}

export default function Grid({
  id,
  board,
  ships,
  hits,
  misses,
  sunkShips,
  interactive,
  placementMode,
  onCellClick,
  onCellHover,
  previewCells = [],
  showShips,
  revealedShips,
}: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const getCellClass = useCallback(
    (r: number, c: number) => {
      const key = `${r},${c}`
      const classes: string[] = ['cell']
      const val = board[r]?.[c]

      if (showShips && val) classes.push('cell-ship')

      if (hits.has(key)) classes.push('cell-hit')
      else if (misses.has(key)) classes.push('cell-miss')

      if (sunkShips?.some((s) => s.cells.some((cc) => cc.r === r && cc.c === c))) {
        classes.push('cell-sunk')
      }

      const preview = previewCells.find((p) => p.r === r && p.c === c)
      if (preview) classes.push(preview.valid ? 'cell-pv-ok' : 'cell-pv-bad')

      if (!interactive || placementMode || !onCellClick) classes.push('cursor-default')

      return classes.join(' ')
    },
    [board, hits, misses, sunkShips, previewCells, interactive, placementMode, onCellClick, showShips],
  )

  useEffect(() => {
    if (wrapRef.current && gridRef.current) {
      if (ships && showShips) {
        renderShipOverlay(gridRef.current, wrapRef.current, ships, hits, false)
      }
      if (revealedShips) {
        renderShipOverlay(gridRef.current, wrapRef.current, revealedShips, hits, true)
      }
    }
  })

  return (
    <div className="grid-wrap relative bg-navy-2 rounded-[10px] p-[2px] shadow-[0_4px_16px_rgba(0,0,0,.3)] border border-white/[0.03]" ref={wrapRef}>
      <div
        ref={gridRef}
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `18px repeat(${TAM}, 32px)`,
          gridTemplateRows: `18px repeat(${TAM}, 32px)`,
          gap: '2px',
        }}
      >
        {Array.from({ length: TAM + 1 }, (_, r) =>
          Array.from({ length: TAM + 1 }, (_, c) => {
            if (r === 0 && c === 0)
              return <div key="tl" className="flex items-center justify-center text-[0.55rem] font-semibold text-[#7a8a9a]" />
            if (r === 0)
              return (
                <div key={`l${c}`} className="flex items-center justify-center text-[0.55rem] font-semibold text-[#7a8a9a]">
                  {LETTERS[c - 1]}
                </div>
              )
            if (c === 0)
              return (
                <div key={`l${r}`} className="flex items-center justify-center text-[0.55rem] font-semibold text-[#7a8a9a]">
                  {r}
                </div>
              )

            const row = r - 1
            const col = c - 1
            const key = `${row},${col}`

            return (
              <div
                key={key}
                className={getCellClass(row, col)}
                data-r={row}
                data-c={col}
                style={{
                  background: '#1a3a6a',
                  borderRadius: '2px',
                  cursor: interactive ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'background 0.1s, transform 0.06s',
                  contain: 'layout style',
                }}
                onClick={() => {
                  if (interactive && onCellClick && !placementMode) onCellClick(row, col)
                }}
                onMouseOver={() => {
                  if (placementMode && onCellHover) onCellHover(row, col)
                }}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
