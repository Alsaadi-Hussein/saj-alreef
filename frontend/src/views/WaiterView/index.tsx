import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { Alert, Reservation, Table } from '../../types'

type Row = Record<string, string | number>

const TBL_COLOR:  Record<string, string> = { g: '#4CAF50', e: '#DCA95C', f: '#E24B4A' }
const TBL_BG:     Record<string, string> = { g: 'rgba(76,175,80,0.12)',  e: 'rgba(220,169,92,0.12)', f: 'rgba(226,75,74,0.12)' }
const TBL_BORDER: Record<string, string> = { g: 'rgba(76,175,80,0.30)',  e: 'rgba(220,169,92,0.30)', f: 'rgba(226,75,74,0.30)' }
const TBL_LABEL:  Record<string, string> = { g: 'فارغة', e: 'مشغولة', f: 'طلب حساب' }

const FLOOR_ACTIVE: Record<number, { bg: string; color: string }> = {
  1: { bg: '#DCA95C', color: '#000' },
  2: { bg: '#378ADD', color: '#fff' },
  3: { bg: '#E87EA1', color: '#fff' },
}

const WAITER_CSS = `
@keyframes waiterPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(226,75,74,0.5) }
  50%       { box-shadow: 0 0 0 6px rgba(226,75,74,0) }
}
.waiter-pulse { animation: waiterPulse 1.5s ease-in-out infinite }
`

export default function WaiterView() {
  const [alerts,      setAlerts]      = useState<Alert[]>([])
  const [resv,        setResv]        = useState<Reservation[]>([])
  const [tables,      setTables]      = useState<Table[]>([])
  const [activeFloor, setActiveFloor] = useState(1)

  useEffect(() => {
    api.getAlerts().then(setAlerts)
    api.getReservations().then(setResv)
    api.getTables().then(setTables)

    const channel = supabase
      .channel('waiter-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload: { new: Row }) => {
        const r = payload.new
        setAlerts(prev => [{ id: r.id as number, table: r.table_ref as string, type: r.type as string, emoji: r.emoji as string, time: r.time as string }, ...prev])
      })
      // @ts-ignore — Supabase v2 overload doesn't narrow correctly after chaining
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'alerts' }, (payload: { old: Row }) => {
        setAlerts(prev => prev.filter(a => a.id !== payload.old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        api.getTables().then(setTables)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function dismiss(id: number) {
    await api.dismissAlert(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const floorTables = tables.filter(t => t.floor === activeFloor)
  const resvTables  = new Set(resv.map(r => r.table))

  return (
    <div
      className="flex-1 overflow-hidden"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr' }}
    >
      <style>{WAITER_CSS}</style>

      {/* ── LEFT COLUMN — Alerts + Reservations ──────────────── */}
      <div
        style={{
          overflowY: 'auto',
          padding: 16,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#343434 transparent',
        }}
      >
        {/* Alerts header */}
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-gold mb-3">
          <div className="relative w-3 h-3 flex-shrink-0">
            <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-err" />
            <div className="absolute w-3 h-3 rounded-full bg-err opacity-20 animate-ping" style={{ animationDuration: '1.5s' }} />
          </div>
          Smart Call Alerts 🔔
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-7 text-white/25 text-[13px]">لا توجد تنبيهات نشطة ✓</div>
        ) : (
          alerts.map((a, i) => (
            <div
              key={a.id}
              className="bg-c2 border border-err rounded-[11px] p-3 mb-2 flex justify-between items-center animate-slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[18px]"
                  style={{ background: 'rgba(226,75,74,0.12)' }}
                >
                  {a.emoji}
                </div>
                <div>
                  <div className="text-[12px] font-medium text-white">طاولة {a.table} — {a.type}</div>
                  <div className="text-[10px] text-white/40">{a.time}</div>
                </div>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                className="text-gold bg-transparent border border-c4 rounded-[8px] px-2.5 py-1 text-[11px] cursor-pointer hover:border-gold transition-colors"
              >
                تم ✓
              </button>
            </div>
          ))
        )}

        {/* Reservations schedule */}
        <div className="text-[13px] font-medium text-gold mt-5 mb-3">📅 جدول الحجوزات</div>
        {resv.length === 0 ? (
          <div className="text-center py-4 text-white/25 text-[12px]">لا توجد حجوزات</div>
        ) : (
          resv.map((r, i) => (
            <div
              key={r.id}
              className="rounded-[10px] p-3 mb-2 flex justify-between items-center animate-slide-up"
              style={{
                background: '#1A1A1A',
                border: `1px solid ${r.confirmed ? 'rgba(220,169,92,0.4)' : '#242424'}`,
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <span className={`badge ${r.confirmed ? 'badge-gold' : ''}`}>
                {r.confirmed ? 'مؤكد' : 'انتظار'}
              </span>
              <div className="text-right">
                <div className="text-[12px] font-medium text-white">{r.time} — {r.table}</div>
                <div className="text-[11px] text-white/50 mt-0.5">{r.name}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── RIGHT COLUMN — Table map ──────────────────────────── */}
      <div
        style={{
          overflowY: 'auto',
          padding: 16,
          scrollbarWidth: 'thin',
          scrollbarColor: '#343434 transparent',
        }}
      >
        <div className="text-[13px] font-medium text-gold mb-3">خريطة الطاولات</div>

        {/* Floor filter */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map(f => {
            const fa = FLOOR_ACTIVE[f]
            return (
              <button
                key={f}
                onClick={() => setActiveFloor(f)}
                className="px-4 py-1.5 rounded-[9px] text-[12px] font-medium transition-colors cursor-pointer border"
                style={
                  activeFloor === f
                    ? { background: fa.bg, color: fa.color, borderColor: 'transparent' }
                    : { background: '#1a1a1a', borderColor: '#2a2a2a', color: 'rgba(255,255,255,0.6)' }
                }
              >
                طابق {f}
              </button>
            )
          })}
        </div>

        {/* Tables grid */}
        {floorTables.length === 0 ? (
          <div className="text-center py-10 text-white/25 text-[13px]">لا توجد طاولات في هذا الطابق</div>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {floorTables.map(t => (
              <div
                key={t.n}
                className={`rounded-[11px] p-3 text-center border${t.s === 'f' ? ' waiter-pulse' : ''}`}
                style={{ background: TBL_BG[t.s] ?? TBL_BG.g, borderColor: TBL_BORDER[t.s] ?? TBL_BORDER.g }}
              >
                <div className="text-[15px] font-bold" style={{ color: TBL_COLOR[t.s] ?? TBL_COLOR.g }}>
                  T{t.n}
                </div>
                <div className="text-[10px] mt-1 font-medium" style={{ color: TBL_COLOR[t.s] ?? TBL_COLOR.g }}>
                  {TBL_LABEL[t.s] ?? 'فارغة'}
                </div>
                {t.capacity > 0 && (
                  <div className="text-[9px] text-white/30 mt-0.5">{t.capacity}👤</div>
                )}
                {resvTables.has(`T${t.n}`) && (
                  <div className="text-[9px] mt-0.5">📅</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4 justify-end">
          {(['g', 'e', 'f'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5 text-[11px] text-white/50">
              {TBL_LABEL[s]}
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: TBL_COLOR[s] }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
