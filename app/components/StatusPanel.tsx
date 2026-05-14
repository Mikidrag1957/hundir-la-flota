'use client'

import { SHIPS } from '../../lib/constants'
import type { PlacedShip, Orientation, Phase } from '../../lib/types'

interface StatusPanelProps {
  phase: Phase
  myShips: PlacedShip[]
  selectedShipIdx: number
  orientation: Orientation
  statusText: string
  canReady: boolean
  isReady: boolean
  onRotate: () => void
  onRandom: () => void
  onReady: () => void
  onLeave: () => void
  onSelectShip: (idx: number) => void
}

export default function StatusPanel({
  phase,
  myShips,
  selectedShipIdx,
  orientation,
  statusText,
  canReady,
  isReady,
  onRotate,
  onRandom,
  onReady,
  onLeave,
  onSelectShip,
}: StatusPanelProps) {
  const colorMap: Record<string, string> = {}
  SHIPS.forEach((s) => (colorMap[s.id] = s.color))

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[150px] max-w-[190px] flex-shrink-0">
      <div className="bg-navy-3 rounded-[10px] p-2 w-full text-center border border-white/[0.04] min-h-[48px] flex items-center justify-center">
        <div className="text-[0.72rem] leading-tight">{statusText}</div>
      </div>

      {phase === 'placement' && (
        <>
          <div className="w-full bg-navy-3 rounded-[10px] p-2 border border-white/[0.04]">
            <h3 className="text-[0.62rem] uppercase tracking-wider text-[#7a8a9a] mb-1">Barcos</h3>
            <div className="flex flex-col gap-0.5">
              {myShips.map((ship, idx) => {
                const placed = ship.cells && ship.cells.length > 0
                return (
                  <div
                    key={ship.id}
                    className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[0.68rem] cursor-pointer transition-colors active:bg-white/[0.06] ${
                      idx === selectedShipIdx && phase === 'placement'
                        ? 'bg-[rgba(30,144,255,0.15)] border border-[rgba(30,144,255,0.2)]'
                        : ''
                    } ${placed ? 'opacity-30' : ''}`}
                    onClick={() => {
                      if (!placed) onSelectShip(idx)
                    }}
                  >
                    <div className="flex gap-px">
                      {Array.from({ length: ship.size }, (_, i) => (
                        <span key={i} style={{ width: 8, height: 8, borderRadius: 1, background: colorMap[ship.id] || '#666' }} />
                      ))}
                    </div>
                    <span>{ship.name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-1 w-full">
            <button
              className="g-btn-sec"
              onClick={onRotate}
            >
              Rotar ({orientation === 'h' ? 'H' : 'V'})
            </button>
            <button
              className="g-btn-sec"
              onClick={onRandom}
            >
              Aleat
            </button>
          </div>

          <button
            className="g-btn-pri w-full"
            disabled={!canReady}
            onClick={onReady}
          >
            {isReady ? 'Esperando...' : 'Listo'}
          </button>
        </>
      )}

      <button
        onClick={onLeave}
        className="g-btn-dgr w-full"
      >
        Salir
      </button>
    </div>
  )
}
