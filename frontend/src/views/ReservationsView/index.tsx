import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { Reservation, Table } from '../../types/index'

const SECTIONS = ['VIP', 'عائلي', 'منفرد', 'مفتوح']

function getFloor(tableRef: string): number {
  const n = parseInt(tableRef.replace('T', ''))
  if (n <= 40) return 1
  if (n <= 70) return 2
  return 3
}

const TBL_COLOR:  Record<string, string> = { g: '#4CAF50', e: '#DCA95C', f: '#E24B4A' }
const TBL_BG:     Record<string, string> = { g: '#1A1A1A', e: 'rgba(220,169,92,0.18)', f: 'rgba(226,75,74,0.18)' }
const TBL_BORDER: Record<string, string> = { g: '#242424', e: 'rgba(220,169,92,0.45)', f: 'rgba(226,75,74,0.45)' }
const TBL_LABEL:  Record<string, string> = { g: 'حر', e: 'مشغول', f: 'ينهون' }

const TODAY_LABEL = new Date().toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long' })
const TODAY_ISO   = new Date().toISOString().split('T')[0]

export default function ReservationsView() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables,       setTables]       = useState<Table[]>([])
  const [mapFloor,     setMapFloor]     = useState(1)
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', date: '', time: '', guests: 2, section: '', notes: '',
  })
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [submitError,  setSubmitError]  = useState(false)

  useEffect(() => {
    api.getReservations().then(setReservations)
    api.getTables().then(setTables)

    const ch = supabase.channel('reservations-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        api.getReservations().then(setReservations)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        api.getTables().then(setTables)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function set(k: string, v: string | number) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.phone.trim()) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      await api.createReservation({ ...form })
      const updated = await api.getReservations()
      setReservations(updated)
      setSubmitted(true)
      setForm({ firstName: '', lastName: '', phone: '', date: '', time: '', guests: 2, section: '', notes: '' })
      setTimeout(() => setSubmitted(false), 2000)
    } catch {
      setSubmitError(true)
    }
    setSubmitting(false)
  }

  async function cancel(id: number) {
    await api.cancelReservation(id)
    setReservations(prev => prev.filter(r => r.id !== id))
  }

  const todayReservations = reservations.filter(r => r.time.startsWith(TODAY_ISO))
  const confirmedCount    = todayReservations.filter(r => r.confirmed).length
  const waitingCount      = todayReservations.filter(r => !r.confirmed).length

  const mapFloorTables = tables.filter(t => t.floor === mapFloor)
  const mapFloors = [...new Set(tables.map(t => t.floor))].sort()
  const floorsToShow = mapFloors.length > 0 ? mapFloors : [1, 2, 3]
  const resvTableSet = new Set(reservations.filter(r => r.confirmed).map(r => r.table))

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Reservation form */}
      <div className="flex flex-col overflow-y-auto p-6 border-l border-c3" style={{ width: 400, background: '#0D0D0D', scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
        {/* Avatar + header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-black font-bold text-[14px] flex-shrink-0">S</div>
          <div className="flex justify-between items-center flex-1">
            <div className="text-[11px] text-white/40 text-left">حجز جديد</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">اسم العائلة</label>
              <input
                value={form.lastName} onChange={e => set('lastName', e.target.value)}
                placeholder="الرشيد"
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white text-right placeholder:text-white/25 focus:outline-none focus:border-gold/50"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">الاسم الأول</label>
              <input
                value={form.firstName} onChange={e => set('firstName', e.target.value)}
                placeholder="أحمد" required
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white text-right placeholder:text-white/25 focus:outline-none focus:border-gold/50"
                dir="rtl"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-[11px] text-white/50 block mb-1.5 text-right">رقم الهاتف</label>
            <input
              value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+964 xxx xxx xxxx" required
              className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white text-right placeholder:text-white/25 focus:outline-none focus:border-gold/50"
              dir="rtl"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">الوقت</label>
              <input
                type="time" value={form.time} onChange={e => set('time', e.target.value)}
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">التاريخ</label>
              <input
                type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          {/* Guests + Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">القسم</label>
              <select
                value={form.section} onChange={e => set('section', e.target.value)}
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-gold/50 cursor-pointer"
                dir="rtl"
              >
                <option value="">اختر القسم</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">عدد الأشخاص</label>
              <select
                value={form.guests} onChange={e => set('guests', Number(e.target.value))}
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-gold/50 cursor-pointer"
                dir="rtl"
              >
                {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] text-white/50 block mb-1.5 text-right">ملاحظات خاصة</label>
            <textarea
              value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="أي طلبات خاصة..."
              rows={2}
              className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[12px] text-white text-right placeholder:text-white/25 focus:outline-none focus:border-gold/50 resize-none"
              dir="rtl"
            />
          </div>

          {submitError && (
            <div className="text-center text-[12px] text-err py-1">حدث خطأ، حاول مرة أخرى</div>
          )}
          <button
            type="submit" disabled={submitting}
            className="w-full py-3 rounded-[11px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            style={{ background: '#DCA95C' }}
          >
            {submitted ? '✓ تم الحجز!' : submitting ? 'جارٍ...' : '✓ تأكيد الحجز'}
          </button>
        </form>
      </div>

      {/* Right: Schedule + Floor map */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex gap-2">
            {waitingCount > 0 && <span className="badge badge-warn text-[11px]">{waitingCount} انتظار</span>}
            {confirmedCount > 0 && <span className="badge badge-ok text-[11px]">{confirmedCount} مؤكد</span>}
          </div>
          <h1 className="text-[20px] font-semibold text-white">نظام الحجوزات</h1>
        </div>
        <div className="text-[12px] text-white/40 text-right mb-1">إدارة حجوزات الطاولات</div>

        {/* Today schedule */}
        <div className="rounded-xl border border-c3 overflow-hidden mb-5" style={{ background: '#111111' }}>
          <div className="flex justify-between items-center px-4 py-3 border-b border-c3">
            <span className="text-[12px] text-white/50">{TODAY_LABEL}</span>
            <span className="text-[13px] font-medium text-white">جدول اليوم</span>
          </div>
          {todayReservations.length === 0 ? (
            <div className="text-center py-8 text-white/25 text-[13px]">لا توجد حجوزات اليوم</div>
          ) : (
            todayReservations.map((r, i) => (
              <div key={r.id} className={`flex items-center justify-between px-4 py-3 ${i < todayReservations.length - 1 ? 'border-b border-c3/50' : ''}`}>
                {/* Cancel + status */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cancel(r.id)}
                    className="w-6 h-6 rounded-full bg-err/15 text-err text-[11px] font-bold flex items-center justify-center cursor-pointer hover:bg-err/30 transition-colors border-none"
                  >
                    ×
                  </button>
                  <span className={`badge text-[10px] ${r.confirmed ? 'badge-ok' : 'badge-warn'}`}>
                    {r.confirmed ? '✓ مؤكد' : '✗ انتظار'}
                  </span>
                </div>
                {/* Info */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[12px] font-medium text-white">{r.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {r.guests ?? 2} أشخاص
                      {r.section ? ` · ${r.section}` : ''}
                    </div>
                  </div>
                  {/* Table + floor */}
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/35">طابق {getFloor(r.table)}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium text-black" style={{ background: '#DCA95C' }}>
                        {r.table}
                      </span>
                    </div>
                    <span className="text-[13px] font-semibold text-white">{r.time.includes(' ') ? r.time.split(' ')[1] : r.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floor map — real data from DB */}
        <div className="rounded-xl border border-c3 p-4" style={{ background: '#111111' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-1.5">
              {floorsToShow.map(f => (
                <button
                  key={f}
                  onClick={() => setMapFloor(f)}
                  className={`px-3 py-1 rounded-[7px] text-[11px] font-medium transition-colors cursor-pointer border ${
                    mapFloor === f ? 'text-black border-transparent' : 'bg-c3 border-c4 text-white/50 hover:text-white/80'
                  }`}
                  style={mapFloor === f ? { background: '#DCA95C' } : {}}
                >
                  طابق {f}
                </button>
              ))}
            </div>
            <div className="text-[13px] font-medium text-white">خريطة الطوابق</div>
          </div>

          {mapFloorTables.length === 0 ? (
            <div className="text-center py-6 text-white/25 text-[12px]">لا توجد طاولات</div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
              {mapFloorTables.map(t => {
                const isResv = resvTableSet.has(`T${t.n}`)
                return (
                  <div
                    key={t.n}
                    className="rounded-[9px] py-2 text-center border transition-all"
                    style={{
                      background: isResv && t.s === 'g' ? 'rgba(220,169,92,0.08)' : (TBL_BG[t.s] ?? TBL_BG.g),
                      borderColor: isResv && t.s === 'g' ? 'rgba(220,169,92,0.5)' : (TBL_BORDER[t.s] ?? TBL_BORDER.g),
                    }}
                  >
                    <div className="text-[11px] font-semibold" style={{ color: TBL_COLOR[t.s] ?? TBL_COLOR.g }}>T{t.n}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{TBL_LABEL[t.s] ?? 'حر'}</div>
                    {isResv && <div className="text-[9px] mt-0.5">📅</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-3 justify-end">
            {(['g', 'e', 'f'] as const).map(s => (
              <div key={s} className="flex items-center gap-1.5 text-[11px] text-white/50">
                {TBL_LABEL[s]}
                <span className="w-2 h-2 rounded-full" style={{ background: TBL_COLOR[s] }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
