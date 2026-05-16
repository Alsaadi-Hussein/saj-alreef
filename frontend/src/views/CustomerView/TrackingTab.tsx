import { useState } from 'react'
import { api } from '../../lib/api'

const STEPS = [
  { icon: '🛒', label: 'تم الطلب',      time: '7:05 PM' },
  { icon: '🍳', label: 'قيد التحضير',  time: '7:10 PM' },
  { icon: '✅', label: 'جاهز',          time: '— : —'   },
  { icon: '🍽️', label: 'تم التقديم',   time: '— : —'   },
]

const CALLS = [
  { type: 'نادل',    emoji: '👨‍🍽️' },
  { type: 'ماء',     emoji: '💧'   },
  { type: 'مناديل', emoji: '🧻'   },
]

export default function TrackingTab() {
  const [step, setStep]       = useState(1)        // 0 = placed (always done), 1 = current
  const [done, setDone]       = useState(false)
  const [feedback, setFeedback] = useState('')
  const [callSent, setCallSent] = useState<string | null>(null)

  function advanceStep() {
    if (done) return
    const next = step + 1
    if (next >= STEPS.length) {
      setDone(true)
      setStep(next)
    } else {
      setStep(next)
    }
  }

  async function sendCall(type: string, emoji: string) {
    setCallSent(type)
    await api.sendAlert('5', type, emoji)
    setTimeout(() => setCallSent(null), 3000)
  }

  function stepState(i: number): 'done' | 'current' | 'pending' {
    if (i < step) return 'done'
    if (i === step && !done) return 'current'
    if (done && i === STEPS.length - 1) return 'done'
    return 'pending'
  }

  return (
    <div className="p-3.5">
      {/* Live tracking header */}
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-gold mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-err animate-blink" />
        Live Order Tracking
      </div>

      {/* Steps */}
      <div className="bg-c2 border border-c3 rounded-xl p-3 mb-3">
        {STEPS.map((s, i) => {
          const state = stepState(i)
          return (
            <div key={i}>
              <div className={`flex items-center gap-2.5 py-1.5 transition-opacity duration-300 ${state === 'pending' ? 'opacity-35' : 'opacity-100'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] flex-shrink-0
                  ${state === 'done' ? 'bg-ok' : state === 'current' ? 'bg-warn animate-blink' : 'bg-c3'}`}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <div className={`text-[12px] font-medium ${state === 'pending' ? 'text-white/60' : 'text-white'}`}>{s.label}</div>
                  <div className={`text-[10px] ${state === 'pending' ? 'text-c4' : 'text-white/30'}`}>
                    {state === 'done' || i === 0 ? s.time : (state === 'current' ? s.time : '— : —')}
                  </div>
                </div>
                {state === 'done' && <span className="badge badge-ok">✓</span>}
                {state === 'current' && <span className="badge badge-warn">⏳ الآن</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-px h-3.5 mr-3.5 -my-0.5 transition-colors duration-300 ${i < step ? 'bg-gold-dark' : 'bg-c4'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Advance button */}
      <button
        onClick={advanceStep}
        disabled={done}
        className="w-full mb-3 py-2.5 rounded-[9px] text-[12px] font-medium bg-gold text-black
          hover:bg-gold-light active:scale-95 transition-all duration-200 animate-pulse-gold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {done ? '✓ اكتملت جميع المراحل' : step === STEPS.length - 1 ? '▶ تم التقديم (أخير)' : '▶ محاكاة تقدّم الطلب'}
      </button>

      {/* Smart Call */}
      <div className="text-[12px] font-medium text-gold mb-2.5">🔔 نداء ذكي Smart Call</div>
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        {CALLS.map(c => (
          <button
            key={c.type}
            onClick={() => sendCall(c.type, c.emoji)}
            className={`bg-c2 border rounded-[10px] p-2.5 cursor-pointer transition-all duration-200 text-center
              ${callSent === c.type ? 'border-gold bg-gold/10' : 'border-c3 hover:border-gold/50'}`}
          >
            <div className="text-xl mb-1">{c.emoji}</div>
            <div className="text-[11px] text-white/60">{c.type}</div>
          </button>
        ))}
      </div>

      {callSent && (
        <div className="text-center text-[11px] text-gold px-2.5 py-2 bg-gold/8 border border-gold/20 rounded-[9px] animate-fade-in">
          ✓ تم إرسال طلب {callSent} للنادل!
        </div>
      )}
    </div>
  )
}
