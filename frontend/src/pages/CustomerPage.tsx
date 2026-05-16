import { useState } from 'react'
import CustomerView from '../views/CustomerView'

export default function CustomerPage() {
  const params = new URLSearchParams(window.location.search)
  const [tableNum] = useState(parseInt(params.get('table') || '1'))

  return (
    <div
      className="min-h-screen flex flex-col items-center overflow-hidden relative"
      style={{ background: '#080808' }}
      dir="rtl"
    >
      {/* Atmospheric background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(220,169,92,0.09) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px]"
          style={{ background: 'radial-gradient(ellipse, rgba(220,169,92,0.04) 0%, transparent 70%)' }}
        />
        {/* Noise grain */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Top status bar */}
      <div className="w-full flex justify-between items-center px-5 pt-4 pb-1 relative z-10 max-w-[400px]">
        <div className="flex items-center gap-1.5">
          <div className="relative w-1.5 h-1.5">
            <div className="absolute w-1.5 h-1.5 rounded-full bg-ok" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-ok animate-ping" style={{ animationDuration: '1.8s' }} />
          </div>
          <span className="text-[9px] text-white/25 tracking-[2px] font-sans uppercase">Live • Table {tableNum}</span>
        </div>
        <div className="text-[9px] text-white/20 tracking-[3px] font-sans">SAJ AL-REEF</div>
      </div>

      {/* Phone — key forces remount (and fresh session) when table changes */}
      <div className="relative z-10 w-full flex justify-center flex-1">
        <CustomerView key={tableNum} tableNum={tableNum} />
      </div>

      {/* Bottom signature */}
      <div className="relative z-10 pb-4 text-center">
        <div className="text-[9px] text-white/10 tracking-[3px] font-sans">SCAN TO ORDER</div>
      </div>
    </div>
  )
}
