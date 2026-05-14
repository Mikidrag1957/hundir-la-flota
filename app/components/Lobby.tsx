'use client'

import { useState } from 'react'
import type { ClientMessage } from '../../lib/types'

interface LobbyProps {
  send: (data: ClientMessage) => void
  connected: boolean
  roomCode: string
}

export default function Lobby({ send, connected, roomCode }: LobbyProps) {
  const [code, setCode] = useState('')

  if (roomCode) {
    const url = `${window.location.origin}/?room=${roomCode}`
    return (
      <div className="flex flex-col items-center gap-3 bg-navy-3 rounded-2xl p-7 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,.4)] max-w-[380px] w-[92%] mx-auto my-auto">
        <p className="text-[#7a8a9a] text-xs">Comparte este código con tu amigo:</p>
        <div className="text-5xl font-extrabold tracking-[10px] text-gold my-1.5">{roomCode}</div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent('¡Juguemos a Hundir la Flota! Código: ' + roomCode + ' - ' + url)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-lg text-sm font-semibold no-underline mt-1.5 active:opacity-80 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          Invitar por WhatsApp
        </a>
        <a
          href={`mailto:?subject=Juguemos a Hundir la Flota&body=${encodeURIComponent('¡Te invito a jugar! Usa el código: ' + roomCode + '\n\n' + url)}`}
          className="text-[#7a8a9a] text-xs underline mt-1 hover:text-white transition-colors"
        >
          Copiar enlace
        </a>
        <p className="text-[#7a8a9a] text-[0.7rem] mt-2">Esperando jugador...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3.5 bg-navy-3 rounded-2xl p-7 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,.4)] max-w-[380px] w-[92%] mx-auto my-auto">
      {!connected ? (
        <div className="flex items-center gap-2 text-[#7a8a9a] text-sm">
          <div className="w-4 h-4 border-2 border-white/[0.08] border-t-gold rounded-full animate-spin" />
          Conectando al servidor...
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold tracking-wide">Batalla Naval</h2>
          <button
            onClick={() => send({ type: 'create_room' })}
            className="w-full py-3 px-5 rounded-xl font-semibold text-sm tracking-wide uppercase cursor-pointer transition-all active:scale-[.97] bg-gradient-to-b from-[#1e90ff] to-[#0066cc] text-white"
          >
            Crear partida
          </button>
          <div className="w-full text-center text-[#7a8a9a] text-xs flex items-center gap-2.5">
            <span className="flex-1 h-px bg-white/[0.06]" />
            o
            <span className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <input
            type="text"
            placeholder="CÓDIGO"
            maxLength={4}
            autoComplete="off"
            inputMode="text"
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length >= 4) send({ type: 'join_room', code })
            }}
            className="w-full py-2.5 px-3 rounded-lg bg-navy border border-white/[0.08] text-[#e0e8f0] text-sm text-center tracking-widest uppercase outline-none focus:border-gold"
          />
          <button
            onClick={() => {
              if (code.length >= 4) send({ type: 'join_room', code })
            }}
            className="w-full py-3 px-5 rounded-xl font-semibold text-sm tracking-wide uppercase cursor-pointer transition-all active:scale-[.97] bg-white/[0.06] text-[#e0e8f0] border border-white/[0.08]"
          >
            Unirse
          </button>
        </>
      )}
    </div>
  )
}
