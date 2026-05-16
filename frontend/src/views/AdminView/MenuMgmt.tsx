import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { MenuItem } from '../../types/index'

const CATEGORIES = [
  { id: 'm',  label: 'رئيسية'   },
  { id: 's',  label: 'مقبلات'   },
  { id: 'd',  label: 'مشروبات' },
  { id: 'sw', label: 'حلويات'  },
]

const cats: Record<string, string> = { m: 'رئيسية', s: 'مقبلات', d: 'مشروبات', sw: 'حلويات' }

interface EditState { name: string; price: string; desc: string; emoji: string; hot: boolean }

const EMPTY_NEW = { name: '', price: '', desc: '', emoji: '🍽️', category: 'm' as const, hot: false }

export default function MenuMgmt() {
  const [items,    setItems]   = useState<MenuItem[]>([])
  const [loading,  setLoading] = useState(true)
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editState, setEd]     = useState<EditState>({ name: '', price: '', desc: '', emoji: '', hot: false })
  const [showAdd,  setShowAdd] = useState(false)
  const [newItem,  setNew]     = useState(EMPTY_NEW)
  const [saving,   setSaving]  = useState(false)
  const [deleting, setDel]     = useState<number | null>(null)
  const [error,    setError]   = useState('')

  useEffect(() => {
    api.getMenu().then(data => { setItems(data); setLoading(false) })
  }, [])

  function startEdit(item: MenuItem) {
    setEditId(item.id)
    setEd({ name: item.name, price: String(item.price), desc: item.desc ?? '', emoji: item.emoji, hot: item.hot ?? false })
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true); setError('')
    try {
      const updated = await api.updateMenuItem(editId, {
        name: editState.name, price: Number(editState.price),
        description: editState.desc, emoji: editState.emoji, hot: editState.hot,
      })
      setItems(prev => prev.map(i => i.id === editId ? updated : i))
      setEditId(null)
    } catch { setError('فشل الحفظ — تحقق من الاتصال') }
    setSaving(false)
  }

  async function doDelete(id: number) {
    setDel(id)
    try {
      await api.deleteMenuItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { setError('فشل الحذف') }
    setDel(null)
  }

  async function addItem() {
    if (!newItem.name.trim() || !newItem.price) return
    setSaving(true); setError('')
    try {
      const added = await api.addMenuItem({
        name: newItem.name, price: Number(newItem.price), category: newItem.category,
        emoji: newItem.emoji, description: newItem.desc, hot: newItem.hot,
      })
      setItems(prev => [...prev, added])
      setNew(EMPTY_NEW)
      setShowAdd(false)
    } catch { setError('فشل الإضافة — تحقق من الاتصال') }
    setSaving(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <button
          onClick={() => { setShowAdd(v => !v); setError('') }}
          className="bg-gold text-black text-[12px] font-medium px-4 py-2 rounded-[9px] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          {showAdd ? '✕ إلغاء' : '+ إضافة وجبة'}
        </button>
        <h1 className="text-[20px] font-semibold text-white">إدارة القائمة</h1>
      </div>

      {error && (
        <div className="rounded-[9px] px-4 py-2.5 mb-4 border border-err/40 text-err text-[12px] text-right" style={{ background: 'rgba(226,75,74,0.08)' }}>
          {error}
        </div>
      )}

      {/* Add new item form */}
      {showAdd && (
        <div className="rounded-xl p-4 border border-gold/30 mb-5" style={{ background: 'rgba(220,169,92,0.05)' }}>
          <div className="text-[13px] font-medium text-gold text-right mb-3">وجبة جديدة</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={newItem.name} onChange={e => setNew(n => ({ ...n, name: e.target.value }))}
              placeholder="اسم الوجبة *" dir="rtl"
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-right placeholder:text-white/25 focus:outline-none focus:border-gold/50"
            />
            <input
              value={newItem.price} onChange={e => setNew(n => ({ ...n, price: e.target.value }))}
              placeholder="السعر بالدينار *" type="number" min={0}
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <select
              value={newItem.category}
              onChange={e => setNew(n => ({ ...n, category: e.target.value as typeof EMPTY_NEW['category'] }))}
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50 cursor-pointer" dir="rtl"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input
              value={newItem.emoji} onChange={e => setNew(n => ({ ...n, emoji: e.target.value }))}
              placeholder="إيموجي" maxLength={4}
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-center focus:outline-none focus:border-gold/50"
            />
            <label className="flex items-center gap-2 justify-center cursor-pointer rounded-[9px] bg-c2 border border-c3 px-3 py-2">
              <input type="checkbox" checked={newItem.hot} onChange={e => setNew(n => ({ ...n, hot: e.target.checked }))} className="accent-gold" />
              <span className="text-[12px] text-white/70">🔥 الأشهر</span>
            </label>
          </div>
          <input
            value={newItem.desc} onChange={e => setNew(n => ({ ...n, desc: e.target.value }))}
            placeholder="الوصف (اختياري)" dir="rtl"
            className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-right placeholder:text-white/25 focus:outline-none focus:border-gold/50 mb-3"
          />
          <button
            onClick={addItem} disabled={saving || !newItem.name.trim() || !newItem.price}
            className="w-full py-2.5 rounded-[9px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            style={{ background: '#DCA95C' }}
          >
            {saving ? 'جارٍ الإضافة...' : '✓ إضافة للقائمة'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-white/40">جارٍ التحميل...</div>
      ) : (
        <div className="grid gap-2.5">
          {items.map((item) => (
            <div key={item.id}>
              {editId === item.id ? (
                <div className="rounded-xl p-4 border border-gold/40" style={{ background: '#131313' }}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      value={editState.name} onChange={e => setEd(s => ({ ...s, name: e.target.value }))}
                      placeholder="اسم الوجبة" dir="rtl"
                      className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-right focus:outline-none focus:border-gold/50"
                    />
                    <input
                      value={editState.price} onChange={e => setEd(s => ({ ...s, price: e.target.value }))}
                      placeholder="السعر" type="number" min={0}
                      className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <input
                      value={editState.emoji} onChange={e => setEd(s => ({ ...s, emoji: e.target.value }))}
                      placeholder="إيموجي" maxLength={4}
                      className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-center focus:outline-none focus:border-gold/50"
                    />
                    <label className="flex items-center gap-2 justify-center cursor-pointer col-span-2 rounded-[9px] bg-c2 border border-c3 px-3 py-2">
                      <input type="checkbox" checked={editState.hot} onChange={e => setEd(s => ({ ...s, hot: e.target.checked }))} className="accent-gold" />
                      <span className="text-[12px] text-white/70">🔥 الأشهر</span>
                    </label>
                  </div>
                  <input
                    value={editState.desc} onChange={e => setEd(s => ({ ...s, desc: e.target.value }))}
                    placeholder="الوصف" dir="rtl"
                    className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-right focus:outline-none focus:border-gold/50 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditId(null)}
                      className="flex-1 py-2 rounded-[9px] text-[12px] bg-c2 border border-c3 text-white/60 hover:bg-c3 cursor-pointer transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={saveEdit} disabled={saving}
                      className="flex-1 py-2 rounded-[9px] text-[12px] font-medium text-black cursor-pointer hover:opacity-90 transition-all disabled:opacity-40"
                      style={{ background: '#DCA95C' }}
                    >
                      {saving ? '...' : '✓ حفظ التعديلات'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-c3 hover:border-c4 transition-colors" style={{ background: '#111111' }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => doDelete(item.id)} disabled={deleting === item.id}
                      className="text-[12px] text-white/40 hover:text-err transition-colors cursor-pointer border border-c3 rounded-[7px] px-2.5 py-1 hover:border-err/50 disabled:opacity-30"
                    >
                      {deleting === item.id ? '...' : 'حذف'}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="text-[12px] text-gold/70 hover:text-gold transition-colors cursor-pointer border border-c3 rounded-[7px] px-2.5 py-1 hover:border-gold/50"
                    >
                      تعديل
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.hot && <span className="badge badge-warn text-[10px]">🔥 الأشهر</span>}
                      <span className="text-[13px] font-medium text-white">{item.name}</span>
                      <span className="text-[20px]">{item.emoji}</span>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-0.5">
                      <span className="badge badge-gold text-[11px]">{item.price.toLocaleString()} د.ع</span>
                      <span className="text-[11px] text-white/40">{cats[item.category]}</span>
                    </div>
                    {item.desc && <div className="text-[10px] text-white/30 mt-0.5 text-right">{item.desc}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
