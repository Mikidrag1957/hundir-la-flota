'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_PATH } from './constants'
import type { ServerMessage } from './types'

type Listener = (msg: ServerMessage) => void

let globalWs: WebSocket | null = null
let globalConnected = false
let globalListeners: Set<Listener> = new Set()
let globalInitDone = false

function initGlobalWs() {
  if (globalInitDone) return
  globalInitDone = true

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const ws = new WebSocket(`${proto}//${host}${WS_PATH}`)
  globalWs = ws

  ws.onopen = () => {
    globalConnected = true
  }
  ws.onclose = () => {
    globalConnected = false
  }
  ws.onerror = () => {}
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data) as ServerMessage
      globalListeners.forEach((fn) => fn(msg))
    } catch {
      /* ignore */
    }
  }
}

interface UseWebSocketReturn {
  send: (data: unknown) => void
  connected: boolean
}

export function useWebSocket(): UseWebSocketReturn {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    initGlobalWs()
  }, [])

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1)
    const interval = setInterval(listener, 500)
    return () => clearInterval(interval)
  }, [])

  const send = useCallback((data: unknown) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(data))
    }
  }, [])

  return { send, connected: globalConnected }
}

export function subscribeToMessages(fn: Listener): () => void {
  initGlobalWs()
  globalListeners.add(fn)
  return () => {
    globalListeners.delete(fn)
  }
}
