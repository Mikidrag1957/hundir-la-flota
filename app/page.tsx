'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useWebSocket, subscribe } from '../lib/useWebSocket'
import { SHIPS, TAM } from '../lib/constants'
import { createEmptyBoard, canPlace, placeShip, randomPlacement } from '../server/gameLogic'
import type { Board, PlacedShip, ServerMessage, ClientMessage, Phase, Orientation } from '../lib/types'
import Toast, { showToast } from './components/Toast'
import Lobby from './components/Lobby'
import Grid from './components/Grid'
import StatusPanel from './components/StatusPanel'
import ResultModal from './components/ResultModal'

function HomePage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [playerNum, setPlayerNum] = useState(0)
  const [myTurn, setMyTurn] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [myBoard, setMyBoard] = useState<Board>(createEmptyBoard())
  const [myShips, setMyShips] = useState<PlacedShip[]>(() =>
    SHIPS.map((s) => ({ ...s, cells: [], row: 0, col: 0, orientation: 'h' as const })),
  )
  const [enemyHits, setEnemyHits] = useState(new Set<string>())
  const [enemyMisses, setEnemyMisses] = useState(new Set<string>())
  const [myHits, setMyHits] = useState(new Set<string>())
  const [myMisses, setMyMisses] = useState(new Set<string>())
  const [sunkEnemyShips, setSunkEnemyShips] = useState<PlacedShip[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [statusText, setStatusText] = useState('Conectando...')
  const [selectedShipIdx, setSelectedShipIdx] = useState(0)
  const [orientation, setOrientation] = useState<Orientation>('h')
  const [previewCells, setPreviewCells] = useState<{ r: number; c: number; valid: boolean }[]>([])
  const [resultVisible, setResultVisible] = useState(false)
  const [resultWon, setResultWon] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const [rematchDisabled, setRematchDisabled] = useState(false)
  const [rematchText, setRematchText] = useState('Revancha')
  const [isReady, setIsReady] = useState(false)
  const [pendingJoin, setPendingJoin] = useState('')

  const boardRef = useRef(myBoard)
  boardRef.current = myBoard
  const shipsRef = useRef(myShips)
  shipsRef.current = myShips
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const myHitsRef = useRef(myHits)
  myHitsRef.current = myHits
  const enemyHitsRef = useRef(enemyHits)
  enemyHitsRef.current = enemyHits

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('room')
    if (c) setPendingJoin(c)
  }, [])

  const resetGameState = useCallback(() => {
    setMyBoard(createEmptyBoard())
    setMyShips(SHIPS.map((s) => ({ ...s, cells: [], row: 0, col: 0, orientation: 'h' as const })))
    setEnemyHits(new Set())
    setEnemyMisses(new Set())
    setMyHits(new Set())
    setMyMisses(new Set())
    setSunkEnemyShips([])
    setGameOver(false)
    setMyTurn(false)
    setSelectedShipIdx(0)
    setOrientation('h')
    setPreviewCells([])
    setIsReady(false)
  }, [])

  const { send, connected } = useWebSocket()

  useEffect(() => {
    if (connected && pendingJoin) {
      send({ type: 'join_room', code: pendingJoin })
      setPendingJoin('')
    }
  }, [connected, pendingJoin, send])

  const onServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'error':
          showToast(msg.message)
          break
        case 'room_created':
          setRoomCode(msg.code)
          setPlayerNum(msg.playerNum)
          break
        case 'room_joined':
          setRoomCode('')
          setPlayerNum(msg.playerNum)
          setPhase('placement')
          resetGameState()
          setStatusText('Coloca tus barcos.')
          break
        case 'opponent_joined':
          setRoomCode('')
          setPhase('placement')
          resetGameState()
          setStatusText('Coloca tus barcos.')
          break
        case 'phase_change':
          setStatusText(msg.message)
          break
        case 'player_ready':
          setStatusText('Rival listo.')
          break
        case 'battle_start':
          setPhase('battle')
          setMyTurn(msg.firstTurn === playerNum)
          setGameOver(false)
          setStatusText(msg.message)
          break
        case 'attack_result':
          handleAttackResult(msg)
          break
        case 'turn_change':
          setMyTurn(msg.turn === playerNum)
          setStatusText(msg.message)
          break
        case 'game_over':
          setGameOver(true)
          setPhase('gameover')
          setMyTurn(false)
          setTimeout(() => {
            setResultWon(msg.winner === playerNum)
            setResultMsg(msg.message)
            setResultVisible(true)
          }, 500)
          break
        case 'opponent_disconnected':
          showToast('El oponente se desconectó')
          setRoomCode('')
          setPhase('lobby')
          break
        case 'restart_vote':
          setStatusText('Rival quiere revancha...')
          break
        case 'restart':
          setPhase('placement')
          setResultVisible(false)
          resetGameState()
          setRematchDisabled(false)
          setRematchText('Revancha')
          setStatusText(msg.message)
          break
        case 'ships_placed':
        case 'connected':
        case 'pong':
          break
      }
    },
    [playerNum, resetGameState],
  )

  useEffect(() => {
    return subscribe(onServerMessage)
  }, [onServerMessage])

  const handleAttackResult = useCallback(
    (msg: ServerMessage & { type: 'attack_result' }) => {
      const { r, c, attacker, hit, sunk, sunkCells, shipId } = msg
      if (attacker === playerNum) {
        setMyHits((prev) => {
          const next = new Set(prev)
          if (hit) next.add(`${r},${c}`)
          return next
        })
        setMyMisses((prev) => {
          const next = new Set(prev)
          if (!hit) next.add(`${r},${c}`)
          return next
        })
        if (sunk && sunkCells) {
          const def = SHIPS.find((s) => s.name === sunk)
          if (def) {
            const sorted = [...sunkCells].sort((a, b) => a.r - b.r || a.c - b.c)
            const ori: Orientation = sorted.length > 1 && sorted[0].r === sorted[1].r ? 'h' : 'v'
            setSunkEnemyShips((prev) => [
              ...prev,
              { id: shipId || def.id, name: sunk, size: def.size, cells: sorted, orientation: ori, color: def.color, row: 0, col: 0 },
            ])
          }
        }
      } else {
        setEnemyHits((prev) => {
          const next = new Set(prev)
          if (hit) next.add(`${r},${c}`)
          return next
        })
        setEnemyMisses((prev) => {
          const next = new Set(prev)
          if (!hit) next.add(`${r},${c}`)
          return next
        })
      }
      if (sunk) {
        setStatusText(attacker === playerNum ? '¡Has hundido ' + sunk + '!' : 'El enemigo hundió tu ' + sunk)
      }
    },
    [playerNum],
  )

  const sendMsg = useCallback((data: ClientMessage) => send(data), [send])

  const onCellHover = useCallback(
    (r: number, c: number | null) => {
      if (phaseRef.current !== 'placement') return
      if (c === null || c < 0 || r < 0) {
        setPreviewCells([])
        return
      }
      const ship = shipsRef.current[selectedShipIdx]
      if (!ship || ship.cells.length > 0) {
        setPreviewCells([])
        return
      }
      const valid = canPlace(boardRef.current, r, c, ship.size, orientation)
      const cells: { r: number; c: number; valid: boolean }[] = []
      for (let i = 0; i < ship.size; i++) {
        const nr = orientation === 'h' ? r : r + i
        const nc = orientation === 'h' ? c + i : c
        if (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM) {
          cells.push({ r: nr, c: nc, valid })
        }
      }
      setPreviewCells(cells)
    },
    [selectedShipIdx, orientation],
  )

  const onPlayerGridClick = useCallback(
    (r: number, c: number) => {
      if (phaseRef.current !== 'placement') return
      const ship = shipsRef.current[selectedShipIdx]
      if (!ship || ship.cells.length > 0) return
      if (!canPlace(boardRef.current, r, c, ship.size, orientation)) return

      const newBoard = boardRef.current.map((row) => [...row])
      const cells = placeShip(newBoard, r, c, ship.size, orientation, ship.id)

      setMyBoard(newBoard)
      setMyShips((prev) => {
        const next = [...prev]
        next[selectedShipIdx] = { ...next[selectedShipIdx], cells, row: r, col: c, orientation }
        return next
      })
      setPreviewCells([])
      setSelectedShipIdx((prev) => (prev + 1) % SHIPS.length)

      const nextUnplaced = myShips.findIndex((s, i) =>
        i !== selectedShipIdx ? s.cells.length === 0 : cells.length === 0,
      )
      if (nextUnplaced === -1) {
        setStatusText('Todos listos. Presiona "Listo".')
      } else {
        const nextShip = myShips[nextUnplaced]
        setStatusText(`Coloca ${nextShip.name} (${nextShip.size})`)
      }
    },
    [selectedShipIdx, orientation, myShips],
  )

  const onEnemyClick = useCallback(
    (r: number, c: number) => {
      if (phaseRef.current !== 'battle' || gameOver) return
      const key = `${r},${c}`
      if (myHitsRef.current.has(key) || myMisses.has(key)) return
      send({ type: 'attack', r, c })
    },
    [gameOver, myMisses, send],
  )

  const canReady = myShips.every((s) => s.cells.length > 0)

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className="absolute w-[2px] h-[2px] bg-white/[0.05] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `flt ${15 + Math.random() * 20}s ${Math.random() * 15}s infinite linear`,
            }}
          />
        ))}
      </div>

      <Toast />

      <div className="container relative z-10 w-full max-w-[1060px] px-2 py-1.5 flex flex-col items-center gap-1 h-screen h-dvh overflow-y-auto">
        <header className="text-center py-1 shrink-0">
          <h1 className="text-2xl font-extrabold tracking-wider uppercase bg-gradient-to-b from-white to-gold bg-clip-text text-transparent">
            Hundir la Flota
          </h1>
          <p className="text-[#7a8a9a] text-[0.7rem] tracking-wider">Batalla naval multijugador</p>
        </header>

        {(phase === 'lobby' || roomCode !== '') && (
          <Lobby
            send={sendMsg}
            connected={connected}
            roomCode={roomCode}
          />
        )}

        {phase !== 'lobby' && !roomCode && (
          <div className="flex-1 flex items-start justify-center gap-1.5 w-full min-h-0">
            {/* Player board */}
            <div className="board-section flex flex-col items-center gap-1 shrink min-w-0">
              <h2 className="text-[0.72rem] font-semibold tracking-wide uppercase text-[#7a8a9a] flex items-center gap-1.5 whitespace-nowrap">
                <span>Mis Barcos</span>
                {phase === 'battle' && !gameOver && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wide ${
                    myTurn ? 'bg-[rgba(30,144,255,0.2)] text-[#1e90ff]' : 'bg-[rgba(255,68,68,0.15)] text-[#ff4444]'
                  }`}>
                    {myTurn ? 'Mi turno' : 'Espera'}
                  </span>
                )}
              </h2>
              <Grid
                id="playerGrid"
                board={myBoard}
                ships={myShips}
                hits={enemyHits}
                misses={enemyMisses}
                showShips={true}
                onCellClick={onPlayerGridClick}
                onCellHover={onCellHover}
                previewCells={previewCells}
                sunkShips={phase === 'gameover' ? myShips.filter(s => s.cells.every(c => enemyHits.has(`${c.r},${c.c}`))) : undefined}
              />
              <div className="text-[0.6rem] text-[#7a8a9a] py-0.5">
                Barcos: <strong className="text-[#e0e8f0]">5</strong> | Hundidos:{' '}
                <strong className="text-[#e0e8f0]">
                  {myShips.filter((s) => s.cells.length > 0 && s.cells.every((c) => enemyHitsRef.current.has(`${c.r},${c.c}`))).length}
                </strong>
              </div>
            </div>

            {/* Panel */}
            <StatusPanel
              phase={phase}
              myShips={myShips}
              selectedShipIdx={selectedShipIdx}
              orientation={orientation}
              statusText={statusText}
              canReady={canReady && !isReady}
              isReady={isReady}
              onRotate={() => {
                setOrientation((o) => (o === 'h' ? 'v' : 'h'))
                setPreviewCells([])
              }}
              onRandom={() => {
                const p = randomPlacement()
                setMyBoard(p.board)
                setMyShips(p.ships)
                setSelectedShipIdx(0)
                setPreviewCells([])
                if (p.ships.every((s) => s.cells.length > 0)) {
                  setStatusText('Todos listos. Presiona "Listo".')
                }
              }}
              onReady={() => {
                if (!canReady) return
                setIsReady(true)
                send({ type: 'place_ships', ships: myShips })
                send({ type: 'set_ready' })
                setStatusText('Esperando al rival...')
              }}
              onLeave={() => {
                setPhase('lobby')
                setRoomCode('')
                resetGameState()
                setResultVisible(false)
                window.location.reload()
              }}
              onSelectShip={(idx) => {
                setSelectedShipIdx(idx)
                setPreviewCells([])
              }}
            />

            {/* Enemy board */}
            <div className="board-section flex flex-col items-center gap-1 shrink min-w-0">
              <h2 className="text-[0.72rem] font-semibold tracking-wide uppercase text-[#7a8a9a] flex items-center gap-1.5 whitespace-nowrap">
                <span>Flota Enemiga</span>
                {phase === 'battle' && !gameOver && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wide ${
                    myTurn ? 'bg-[rgba(255,68,68,0.15)] text-[#ff4444]' : 'bg-[rgba(30,144,255,0.2)] text-[#1e90ff]'
                  }`}>
                    {myTurn ? 'Espera' : 'Su turno'}
                  </span>
                )}
              </h2>
              <Grid
                id="enemyGrid"
                board={createEmptyBoard()}
                hits={myHits}
                misses={myMisses}
                sunkShips={sunkEnemyShips}
                onCellClick={onEnemyClick}
                revealedShips={
                  phase === 'gameover' || phase === 'battle' ? sunkEnemyShips : undefined
                }
              />
              <div className="text-[0.6rem] text-[#7a8a9a] py-0.5">
                Barcos: <strong className="text-[#e0e8f0]">5</strong> | Hundidos:{' '}
                <strong className="text-[#e0e8f0]">
                  {SHIPS.filter((s) => {
                    const ship = myShips.find((x) => x.id === s.id)
                    return ship && ship.cells.length > 0 && ship.cells.every((c) => myHitsRef.current.has(`${c.r},${c.c}`))
                  }).length}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      <ResultModal
        visible={resultVisible}
        won={resultWon}
        message={resultMsg}
        onRematch={() => {
          send({ type: 'restart_request' })
          setRematchDisabled(true)
          setRematchText('Esperando...')
          setStatusText('Esperando revancha...')
        }}
        rematchDisabled={rematchDisabled}
        rematchText={rematchText}
        onMenu={() => {
          setResultVisible(false)
          setPhase('lobby')
          setRoomCode('')
          resetGameState()
          window.location.reload()
        }}
      />
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center text-[#7a8a9a] p-4">Cargando...</div>}>
      <HomePage />
    </Suspense>
  )
}
