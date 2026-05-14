export interface ShipDef {
  name: string
  size: number
  id: string
  color: string
}

export interface Cell {
  r: number
  c: number
  index: number
}

export interface PlacedShip extends ShipDef {
  cells: Cell[]
  row: number
  col: number
  orientation: 'h' | 'v'
}

export type ShipCell = { shipId: string; index: number }

export type Board = (ShipCell | null)[][]

export type Phase = 'lobby' | 'waiting' | 'placement' | 'battle' | 'gameover'

export type Orientation = 'h' | 'v'

export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; code: string }
  | { type: 'place_ships'; ships: PlacedShip[] }
  | { type: 'set_ready' }
  | { type: 'attack'; r: number; c: number }
  | { type: 'restart_request' }
  | { type: 'ping' }

export type ServerMessage =
  | { type: 'connected'; id: number }
  | { type: 'error'; message: string }
  | { type: 'room_created'; code: string; playerNum: number }
  | { type: 'room_joined'; code: string; playerNum: number }
  | { type: 'opponent_joined'; playerNum: number }
  | { type: 'phase_change'; phase: string; message: string }
  | { type: 'ships_placed' }
  | { type: 'player_ready'; playerNum: number }
  | { type: 'battle_start'; firstTurn: number; message: string }
  | { type: 'attack_result'; attacker: number; r: number; c: number; hit: boolean; sunk: string | null; sunkCells: Cell[] | null; shipId: string | null }
  | { type: 'turn_change'; turn: number; message: string }
  | { type: 'game_over'; winner: number; message: string }
  | { type: 'opponent_disconnected' }
  | { type: 'restart_vote'; playerNum: number }
  | { type: 'restart'; message: string }
  | { type: 'pong' }

export interface GameState {
  phase: Phase
  playerNum: number
  myTurn: boolean
  gameOver: boolean
  myBoard: Board
  myShips: PlacedShip[]
  enemyHits: Set<string>
  enemyMisses: Set<string>
  myHits: Set<string>
  myMisses: Set<string>
  sunkEnemyShips: PlacedShip[]
  roomCode: string
}
