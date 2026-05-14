import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { Board, Cell, ClientMessage, PlacedShip, ServerMessage } from '../lib/types'
import { SHIPS, TAM } from '../lib/constants'
import { createEmptyBoard, checkAllSunk, validateShips } from './gameLogic'

interface AugmentedWebSocket extends WebSocket {
  id: number
  room: string | null
  playerNum: number
  alive: boolean
}

interface RoomData {
  code: string
  players: AugmentedWebSocket[]
  boards: [Board | null, Board | null]
  ships: [PlacedShip[] | null, PlacedShip[] | null]
  ready: [boolean, boolean]
  turn: number
  phase: 'waiting' | 'placement' | 'battle' | 'gameover'
  attacks: [string[], string[]]
  winner: number
  restartVotes: [boolean, boolean]
}

const rooms: Record<string, RoomData> = {}
let nextId = 1

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code: string
  do {
    code = ''
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  } while (rooms[code])
  return code
}

function broadcast(room: RoomData, msg: ServerMessage): void {
  const data = JSON.stringify(msg)
  room.players.forEach((p) => {
    if (p.readyState === WebSocket.OPEN) p.send(data)
  })
}

function handleCreateRoom(ws: AugmentedWebSocket): void {
  if (ws.room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Ya estás en una sala' } satisfies ServerMessage))
    return
  }
  const code = generateRoomCode()
  rooms[code] = {
    code,
    players: [ws],
    boards: [null, null],
    ships: [null, null],
    ready: [false, false],
    turn: 0,
    phase: 'waiting',
    attacks: [[], []],
    winner: 0,
    restartVotes: [false, false],
  }
  ws.room = code
  ws.playerNum = 1
  ws.send(JSON.stringify({ type: 'room_created', code, playerNum: 1 } satisfies ServerMessage))
}

function handleJoinRoom(ws: AugmentedWebSocket, code: string): void {
  if (ws.room) return
  const room = rooms[code]
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Sala no encontrada' } satisfies ServerMessage))
    return
  }
  if (room.players.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Sala llena' } satisfies ServerMessage))
    return
  }
  if (room.phase !== 'waiting') {
    ws.send(JSON.stringify({ type: 'error', message: 'La partida ya empezó' } satisfies ServerMessage))
    return
  }
  room.players.push(ws)
  ws.room = code
  ws.playerNum = 2
  ws.send(JSON.stringify({ type: 'room_joined', code, playerNum: 2 } satisfies ServerMessage))
  broadcast(room, { type: 'opponent_joined', playerNum: 2 })
  room.phase = 'placement'
  broadcast(room, {
    type: 'phase_change',
    phase: 'placement',
    message: '¡Ambos jugadores conectados! Colocad vuestros barcos.',
  })
}

function handlePlaceShips(ws: AugmentedWebSocket, ships: PlacedShip[]): void {
  if (!ws.room) return
  const room = rooms[ws.room]
  if (!room || room.phase !== 'placement') return

  const validated = validateShips(ships)
  if (!validated) {
    ws.send(JSON.stringify({ type: 'error', message: 'Colocación inválida' } satisfies ServerMessage))
    return
  }

  const board = createEmptyBoard()
  for (const s of ships)
    for (const cell of s.cells)
      board[cell.r][cell.c] = { shipId: s.id, index: cell.index }

  const idx = ws.playerNum - 1
  room.boards[idx] = board
  room.ships[idx] = ships
  ws.send(JSON.stringify({ type: 'ships_placed' } satisfies ServerMessage))
}

function handleSetReady(ws: AugmentedWebSocket): void {
  if (!ws.room) return
  const room = rooms[ws.room]
  if (!room || room.phase !== 'placement') return

  const idx = ws.playerNum - 1
  if (!room.ships[idx]) {
    ws.send(JSON.stringify({ type: 'error', message: 'Coloca tus barcos primero' } satisfies ServerMessage))
    return
  }
  room.ready[idx] = true
  broadcast(room, { type: 'player_ready', playerNum: ws.playerNum })
  if (room.ready[0] && room.ready[1]) {
    room.phase = 'battle'
    room.turn = Math.random() < 0.5 ? 1 : 2
    broadcast(room, {
      type: 'battle_start',
      firstTurn: room.turn,
      message: `¡Comienza la batalla! Turno del Jugador ${room.turn}.`,
    })
  }
}

function handleAttack(ws: AugmentedWebSocket, r: number, c: number): void {
  if (!ws.room) return
  const room = rooms[ws.room]
  if (!room || room.phase !== 'battle' || room.turn !== ws.playerNum) return

  const target = ws.playerNum === 1 ? 2 : 1
  const targetIdx = target - 1
  const board = room.boards[targetIdx]
  if (!board || r < 0 || r >= TAM || c < 0 || c >= TAM || board[r][c] === undefined) {
    ws.send(JSON.stringify({ type: 'error', message: 'Coordenadas inválidas' } satisfies ServerMessage))
    return
  }

  const attackedKey = `${r},${c}`
  if (room.attacks[0].includes(attackedKey) || room.attacks[1].includes(attackedKey)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Ya atacaste esa celda' } satisfies ServerMessage))
    return
  }

  const cell = board[r][c]
  const hit = cell !== null
  const attIdx = ws.playerNum - 1
  room.attacks[attIdx].push(attackedKey)

  let sunk: string | null = null
  let sunkCells: Cell[] | null = null
  let shipId: string | null = null

  if (hit) {
    shipId = cell!.shipId
    const targetShips = room.ships[targetIdx]
    if (targetShips) {
      const ship = targetShips.find((s) => s.id === shipId)
      if (ship && ship.cells.every((c) => room.attacks[attIdx].includes(`${c.r},${c.c}`))) {
        sunk = ship.name
        sunkCells = ship.cells.map((cc) => ({ r: cc.r, c: cc.c, index: cc.index }))
      }
    }
  }

  broadcast(room, {
    type: 'attack_result',
    attacker: ws.playerNum,
    r,
    c,
    hit,
    sunk,
    sunkCells,
    shipId,
  })

  if (sunk && room.ships[targetIdx]) {
    const allSunk = checkAllSunk(room.ships[targetIdx]!, room.attacks[attIdx])
    if (allSunk) {
      room.phase = 'gameover'
      room.winner = ws.playerNum
      broadcast(room, {
        type: 'game_over',
        winner: ws.playerNum,
        message: `¡Jugador ${ws.playerNum} ha hundido toda la flota enemiga!`,
      })
      return
    }
  }

  room.turn = hit ? ws.playerNum : target
  broadcast(room, {
    type: 'turn_change',
    turn: room.turn,
    message: hit
      ? `¡Impacto! ${ws.playerNum === 1 ? 'Jugador 1' : 'Jugador 2'} repite.`
      : `Turno del Jugador ${room.turn}.`,
  })
}

function handleRestart(ws: AugmentedWebSocket): void {
  if (!ws.room) return
  const room = rooms[ws.room]
  if (!room) return

  room.restartVotes[ws.playerNum - 1] = true
  broadcast(room, { type: 'restart_vote', playerNum: ws.playerNum })

  if (room.restartVotes[0] && room.restartVotes[1]) {
    room.boards = [null, null]
    room.ships = [null, null]
    room.ready = [false, false]
    room.turn = 0
    room.phase = 'placement'
    room.attacks = [[], []]
    room.winner = 0
    room.restartVotes = [false, false]
    broadcast(room, { type: 'restart', message: '¡Nueva partida! Colocad vuestros barcos.' })
  }
}

function handleDisconnect(ws: AugmentedWebSocket): void {
  if (!ws.room) return
  const room = rooms[ws.room]
  if (!room) return

  const other = room.players.find((p) => p !== ws && p.readyState === WebSocket.OPEN)
  if (other) other.send(JSON.stringify({ type: 'opponent_disconnected' } satisfies ServerMessage))
  delete rooms[ws.room]
}

function handleMessage(ws: AugmentedWebSocket, raw: string): void {
  let msg: ClientMessage
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }

  switch (msg.type) {
    case 'create_room':
      handleCreateRoom(ws)
      break
    case 'join_room':
      handleJoinRoom(ws, msg.code)
      break
    case 'place_ships':
      handlePlaceShips(ws, msg.ships)
      break
    case 'set_ready':
      handleSetReady(ws)
      break
    case 'attack':
      handleAttack(ws, msg.r, msg.c)
      break
    case 'restart_request':
      handleRestart(ws)
      break
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' } satisfies ServerMessage))
      break
  }
}

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (rawWs: WebSocket) => {
    const ws = rawWs as AugmentedWebSocket
    ws.id = nextId++
    ws.room = null
    ws.playerNum = 0
    ws.alive = true

    ws.on('pong', () => {
      ws.alive = true
    })

        ws.on('message', (data) => {
            const str = data.toString()
            console.log('WS RECV:', str)
            handleMessage(ws, str)
        })

    ws.on('close', () => handleDisconnect(ws))
    ws.on('error', (err) => { console.error('WS ERROR:', err.message) })

    ws.send(JSON.stringify({ type: 'connected', id: ws.id } satisfies ServerMessage))
  })

  setInterval(() => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as AugmentedWebSocket
      if (!ws.alive) {
        ws.terminate()
        return
      }
      ws.alive = false
      try {
        ws.ping()
      } catch {
        /* ignore */
      }
    })
  }, 30000)
}
