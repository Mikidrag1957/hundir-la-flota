import { Board, Cell, PlacedShip, ShipDef } from '../lib/types'
import { SHIPS, TAM } from '../lib/constants'

export function canPlace(
  board: Board,
  row: number,
  col: number,
  size: number,
  orientation: 'h' | 'v',
): boolean {
  for (let i = 0; i < size; i++) {
    const r = orientation === 'h' ? row : row + i
    const c = orientation === 'h' ? col + i : col
    if (r < 0 || r >= TAM || c < 0 || c >= TAM) return false
    if (board[r][c] !== null) return false
  }
  return true
}

export function placeShip(
  board: Board,
  row: number,
  col: number,
  size: number,
  orientation: 'h' | 'v',
  shipId: string,
): Cell[] {
  const cells: Cell[] = []
  for (let i = 0; i < size; i++) {
    const r = orientation === 'h' ? row : row + i
    const c = orientation === 'h' ? col + i : col
    board[r][c] = { shipId, index: i }
    cells.push({ r, c, index: i })
  }
  return cells
}

export function validateShips(ships: unknown[]): Record<string, boolean> | null {
  const board: Board = Array.from({ length: TAM }, () => Array(TAM).fill(null))
  const placed: Record<string, boolean> = {}

  for (const s of ships) {
    const ship = s as Record<string, unknown>
    if (!ship.id || typeof ship.id !== 'string') return null
    const shipDef = SHIPS.find((sh: ShipDef) => sh.id === ship.id)
    if (!shipDef) return null
    if (placed[ship.id]) return null
    if (ship.orientation !== 'h' && ship.orientation !== 'v') return null
    if (typeof ship.row !== 'number' || typeof ship.col !== 'number') return null

    const orientation = ship.orientation as 'h' | 'v'
    if (!canPlace(board, ship.row, ship.col, shipDef.size, orientation)) return null

    ship.cells = placeShip(board, ship.row, ship.col, shipDef.size, orientation, ship.id)
    placed[ship.id] = true
  }

  return placed
}

export function createEmptyBoard(): Board {
  return Array.from({ length: TAM }, () => Array(TAM).fill(null))
}

export function randomPlacement(): { board: Board; ships: PlacedShip[] } {
  const board = createEmptyBoard()
  const ships: PlacedShip[] = []
  for (const s of SHIPS) {
    let attempts = 0
    while (attempts < 1000) {
      const orientation: 'h' | 'v' = Math.random() < 0.5 ? 'h' : 'v'
      const row = Math.floor(Math.random() * TAM)
      const col = Math.floor(Math.random() * TAM)
      if (canPlace(board, row, col, s.size, orientation)) {
        const cells = placeShip(board, row, col, s.size, orientation, s.id)
        ships.push({
          ...s,
          cells,
          row,
          col,
          orientation,
        })
        break
      }
      attempts++
    }
  }
  return { board, ships }
}

export function checkAllSunk(ships: PlacedShip[], attacks: string[]): boolean {
  return ships.every((ship) =>
    ship.cells.every((c) => attacks.includes(`${c.r},${c.c}`)),
  )
}
