'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ServerMessage } from './types'

type Listener = (msg: ServerMessage) => void

const listeners = new Set<Listener>()
let ws: WebSocket | null = null
let wsConnected = false
let wsRetries = 0
let pingInterval: ReturnType<typeof setInterval> | null = null

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  ws = new WebSocket(`${proto}//${host}`)

  ws.onopen = () => {
    wsConnected = true
    wsRetries = 0

    if (pingInterval) clearInterval(pingInterval)
    const sendPing = () => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' })) }
    sendPing()
    pingInterval = setInterval(sendPing, 5000)
  }

  ws.onclose = () => {
    wsConnected = false
    ws = null
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
    wsRetries++
    const delay = Math.min(1000 * Math.pow(2, wsRetries), 10000)
    setTimeout(connect, delay)
  }

  ws.onerror = () => {}

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data) as ServerMessage
      if (msg.type === 'pong') return
      listeners.forEach((fn) => fn(msg))
    } catch { /* ignore */ }
  }
}

export function send(data: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    connect()
    const interval = setInterval(() => {
      setConnected(wsConnected)
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const sendMsg = useCallback((data: unknown) => send(data), [])

  return { send: sendMsg, connected }
}
