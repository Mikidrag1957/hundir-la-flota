'use client'

interface ResultModalProps {
  visible: boolean
  won: boolean
  message: string
  onRematch: () => void
  rematchDisabled: boolean
  rematchText: string
  onMenu: () => void
}

export default function ResultModal({
  visible,
  won,
  message,
  onRematch,
  rematchDisabled,
  rematchText,
  onMenu,
}: ResultModalProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-navy-3 rounded-2xl p-6 text-center border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,.5)] max-w-[340px] w-[88%]">
        <span className="text-4xl block">{won ? '🏆' : '💀'}</span>
        <h2 className="text-2xl my-1.5">{won ? '¡Victoria!' : 'Derrota'}</h2>
        <p className="text-[#7a8a9a] mb-3.5 leading-relaxed text-sm">{message}</p>
        <div className="flex gap-1.5 justify-center flex-wrap">
          <button
            className="px-6 py-2 rounded-lg font-semibold text-sm cursor-pointer bg-gradient-to-b from-[#1e90ff] to-[#0066cc] text-white disabled:opacity-30 disabled:cursor-default"
            onClick={onRematch}
            disabled={rematchDisabled}
          >
            {rematchText}
          </button>
          <button
            className="px-6 py-2 rounded-lg font-semibold text-sm cursor-pointer bg-white/[0.06] text-[#e0e8f0] border border-white/[0.08]"
            onClick={onMenu}
          >
            Menú
          </button>
        </div>
      </div>
    </div>
  )
}
