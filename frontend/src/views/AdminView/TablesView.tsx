import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { Table } from '../../types/index'

const STATUS_LABEL: Record<string, string> = { g: 'فارغة', e: 'يأكلون', f: 'ينهون' }
const STATUS_COLOR: Record<string, string> = { g: '#4CAF50', e: '#DCA95C', f: '#E24B4A' }
const STATUS_BG:    Record<string, string> = { g: 'rgba(76,175,80,0.1)', e: 'rgba(220,169,92,0.1)', f: 'rgba(226,75,74,0.1)' }

const EMPTY_FORM = { n: '', floor: '1', label: '', capacity: '4' }

export default function TablesView() {
  const [tables,  setTables]  = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [editN,   setEditN]   = useState<number | null>(null)
  const [editMeta, setEditMeta] = useState({ floor: '1', label: '', capacity: '4' })
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.getTables().then(t => { setTables(t); setLoading(false) })
    const ch = supabase.channel('tablesview-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        api.getTables().then(setTables)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function cycleStatus(n: number) {
    const updated = await api.updateTable(n)
    setTables(prev => prev.map(t => t.n === n ? updated : t))
  }

  async function addTable() {
    const n = parseInt(form.n)
    if (!n || isNaN(n)) { setError('أدخل رقم طاولة صحيح'); return }
    if (tables.some(t => t.n === n)) { setError(`الطاولة ${n} موجودة مسبقاً`); return }
    setSaving(true)
    setError('')
    try {
      const added = await api.addTable(n, parseInt(form.floor) || 1, form.label.trim(), parseInt(form.capacity) || 4)
      setTables(prev => [...prev, added].sort((a, b) => a.n - b.n))
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } catch { setError('فشل الحفظ، حاول مجدداً') }
    setSaving(false)
  }

  function startEdit(t: Table) {
    setEditN(t.n)
    setEditMeta({ floor: String(t.floor), label: t.label, capacity: String(t.capacity) })
  }

  async function saveEdit() {
    if (editN === null) return
    setSaving(true)
    try {
      const updated = await api.updateTableMeta(editN, {
        floor: parseInt(editMeta.floor) || 1,
        label: editMeta.label.trim(),
        capacity: parseInt(editMeta.capacity) || 4,
      })
      setTables(prev => prev.map(t => t.n === editN ? updated : t))
      setEditN(null)
    } catch {}
    setSaving(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-white/40 text-[14px]">جارٍ التحميل...</div>
  )

  const byFloor = tables.reduce<Record<number, Table[]>>((acc, t) => {
    ;(acc[t.floor] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <button
          onClick={() => { setShowAdd(v => !v); setError('') }}
          className="bg-gold text-black text-[12px] font-medium px-4 py-2 rounded-[9px] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          {showAdd ? '✕ إلغاء' : '+ طاولة جديدة'}
        </button>
        <h1 className="text-[20px] font-semibold text-white">إدارة الطاولات</h1>
      </div>

      <div className="flex items-center gap-4 mb-5 text-[11px]">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[k] }} />
            <span className="text-white/50">{v}</span>
          </div>
        ))}
        <span className="text-white/30 mr-auto">{tables.length} طاولة · انقر على الحالة للتغيير</span>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-2.5 mb-4 border border-err/40 text-err text-[12px] text-right" style={{ background: 'rgba(226,75,74,0.08)' }}>
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl p-4 border border-gold/30 mb-5" style={{ background: 'rgba(220,169,92,0.05)' }}>
          <div className="text-[13px] font-medium text-gold text-right mb-3">إضافة طاولة جديدة</div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <input value={form.n} onChange={e => setForm(f => ({ ...f, n: e.target.value }))}
              placeholder="رقم *" type="number" min={1}
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50" />
            <input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
              placeholder="الطابق" type="number" min={1}
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50" />
            <input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              placeholder="السعة" type="number" min={1}
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50" />
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="التصنيف (اختياري)" dir="rtl"
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50" />
          </div>
          <button onClick={addTable} disabled={saving}
            className="w-full py-2.5 rounded-[9px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            style={{ background: '#DCA95C' }}>
            {saving ? '...' : '✓ إضافة'}
          </button>
        </div>
      )}

      {/* Tables by floor */}
      {Object.entries(byFloor).sort(([a], [b]) => Number(a) - Number(b)).map(([floor, floorTables]) => (
        <div key={floor} className="mb-6">
          <div className="text-[11px] text-white/35 tracking-widest mb-3 text-right">الطابق {floor}</div>
          <div className="grid grid-cols-3 gap-3">
            {floorTables.map(t => (
              <div key={t.n}>
                {editN === t.n ? (
                  <div className="rounded-xl p-3 border border-gold/40" style={{ background: '#131313' }}>
                    <div className="text-[11px] text-gold text-right mb-2">تعديل طاولة {t.n}</div>
                    <input value={editMeta.floor} onChange={e => setEditMeta(m => ({ ...m, floor: e.target.value }))}
                      placeholder="الطابق" type="number" min={1}
                      className="w-full bg-c2 border border-c3 rounded-[7px] px-2 py-1.5 text-[11px] text-white mb-2 focus:outline-none focus:border-gold/50" />
                    <input value={editMeta.capacity} onChange={e => setEditMeta(m => ({ ...m, capacity: e.target.value }))}
                      placeholder="السعة" type="number" min={1}
                      className="w-full bg-c2 border border-c3 rounded-[7px] px-2 py-1.5 text-[11px] text-white mb-2 focus:outline-none focus:border-gold/50" />
                    <input value={editMeta.label} onChange={e => setEditMeta(m => ({ ...m, label: e.target.value }))}
                      placeholder="VIP / outdoor..." dir="rtl"
                      className="w-full bg-c2 border border-c3 rounded-[7px] px-2 py-1.5 text-[11px] text-white mb-3 focus:outline-none focus:border-gold/50" />
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditN(null)} className="flex-1 py-1.5 rounded-[7px] text-[11px] bg-c2 border border-c3 text-white/60 cursor-pointer">إلغاء</button>
                      <button onClick={saveEdit} disabled={saving} className="flex-1 py-1.5 rounded-[7px] text-[11px] font-medium text-black cursor-pointer disabled:opacity-60" style={{ background: '#DCA95C' }}>
                        {saving ? '...' : '✓ حفظ'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl p-3 border text-right"
                    style={{ background: STATUS_BG[t.s] ?? '#111111', borderColor: (STATUS_COLOR[t.s] ?? '#DCA95C') + '40' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-[10px] text-white/30 hover:text-gold border border-c3/50 rounded-[5px] px-1.5 py-0.5 cursor-pointer transition-colors"
                      >
                        تعديل
                      </button>
                      <div className="text-[20px] font-semibold text-white">{t.n}</div>
                    </div>

                    <button
                      onClick={() => cycleStatus(t.n)}
                      className="w-full text-center py-1 rounded-[6px] text-[11px] font-medium cursor-pointer transition-all hover:opacity-80"
                      style={{ background: STATUS_COLOR[t.s] + '20', color: STATUS_COLOR[t.s] }}
                    >
                      {STATUS_LABEL[t.s]}
                    </button>

                    <div className="mt-2 space-y-0.5">
                      {t.label && <div className="text-[10px] text-gold/60">{t.label}</div>}
                      <div className="text-[10px] text-white/30">{t.capacity} أشخاص</div>
                      {t.currentSessionId && (
                        <div className="text-[9px] text-ok/60 truncate">{t.currentSessionId}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div className="text-center py-20 text-white/25 text-[14px]">لا توجد طاولات — أضف الأولى</div>
      )}
    </div>
  )
}
