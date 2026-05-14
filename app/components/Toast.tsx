'use client'

import { useEffect, useState } from 'react'

let showToastFn: (msg: string) => void = () => {}

export function showToast(msg: string) {
  showToastFn(msg)
}

export default function Toast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    showToastFn = (m: string) => {
      setMsg(m)
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-toast-in">
      <div className="bg-navy-3 text-[#e0e8f0] px-5 py-2.5 rounded-xl text-sm border border-white/5 shadow-xl whitespace-nowrap">
        {msg}
      </div>
    </div>
  )
}
