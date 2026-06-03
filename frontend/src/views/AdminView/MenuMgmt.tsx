import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { menuData } from '../../data/menuData'
import type { MenuItem } from '../../types/index'

// Real menu sections (granular) so an item can be placed in a specific part
// of the menu — these are the exact sections customers see.
const SECTIONS = menuData.map(c => ({ id: c.id, label: c.label }))

// Legacy coarse codes from older seed data, kept so existing items edit cleanly.
const LEGACY_LABELS: Record<string, string> = { m: 'رئيسية (قديم)', s: 'مقبلات (قديم)', d: 'مشروبات (قديم)', sw: 'حلويات (قديم)' }

function catLabel(id: string): string {
  return SECTIONS.find(s => s.id === id)?.label ?? LEGACY_LABELS[id] ?? id
}

interface EditState { name: string; price: string; desc: string; emoji: string; hot: boolean; image: string; category: string }

const EMPTY_NEW = { name: '', price: '', desc: '', emoji: '🍽️', category: SECTIONS[0]?.id ?? 'saj', hot: false, image: '' }

// Section <select> options, including the current value if it isn't a known section.
function SectionOptions({ current }: { current: string }) {
  const known = SECTIONS.some(s => s.id === current)
  return (
    <>
      {!known && current && <option value={current}>{catLabel(current)}</option>}
      {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
    </>
  )
}

// Resize + compress an uploaded image to a small JPEG data URL so it fits
// comfortably in the database (~30–70 KB) and loads fast on the menu.
function fileToCompressedDataUrl(file: File, max = 480, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        let { width, height } = img
        if (width >= height && width > max) { height = Math.round((height * max) / width); width = max }
        else if (height > max)              { width = Math.round((width * max) / height); height = max }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── Image picker control (used by both add + edit forms) ──────
function ImagePicker({ value, onChange, onError }: { value: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) { onError('الملف يجب أن يكون صورة'); return }
    setBusy(true)
    try { onChange(await fileToCompressedDataUrl(file)) }
    catch { onError('تعذّر معالجة الصورة، جرّب صورة أخرى') }
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-3" dir="rtl">
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => handle(e.target.files?.[0])}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="w-[60px] h-[60px] rounded-[9px] overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
        style={{ background: '#1a1a1a', border: '1px dashed rgba(220,169,92,0.4)' }}
        title="اختر صورة"
      >
        {value
          ? <img src={value} alt="معاينة" className="w-full h-full object-cover" />
          : <span className="text-[18px] text-gold/40">＋</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="text-[12px] text-gold/80 hover:text-gold border border-gold/30 hover:border-gold/60 rounded-[7px] px-3 py-1.5 cursor-pointer transition-colors disabled:opacity-50"
        >
          {busy ? 'جارٍ المعالجة...' : value ? '⟳ تغيير الصورة' : '⬆ رفع صورة'}
        </button>
        {value && (
          <button
            type="button" onClick={() => onChange('')}
            className="text-[11px] text-white/40 hover:text-err cursor-pointer transition-colors text-right"
          >
            ✕ إزالة الصورة
          </button>
        )}
      </div>
    </div>
  )
}

export default function MenuMgmt() {
  const [items,    setItems]   = useState<MenuItem[]>([])
  const [loading,  setLoading] = useState(true)
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editState, setEd]     = useState<EditState>({ name: '', price: '', desc: '', emoji: '', hot: false, image: '', category: '' })
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
    setEd({ name: item.name, price: String(item.price), desc: item.desc ?? '', emoji: item.emoji, hot: item.hot ?? false, image: item.image ?? '', category: item.category })
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true); setError('')
    try {
      // The image (if any) is stored in the emoji column; otherwise the emoji char.
      const updated = await api.updateMenuItem(editId, {
        name: editState.name, price: Number(editState.price),
        description: editState.desc, emoji: editState.image || editState.emoji || '🍽️', hot: editState.hot,
        category: editState.category,
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
        emoji: newItem.image || newItem.emoji || '🍽️', description: newItem.desc, hot: newItem.hot,
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
          <div className="mb-3">
            <div className="text-[11px] text-white/50 text-right mb-1.5">القسم (أين تظهر الوجبة في القائمة)</div>
            <select
              value={newItem.category}
              onChange={e => setNew(n => ({ ...n, category: e.target.value }))}
              className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50 cursor-pointer" dir="rtl"
            >
              <SectionOptions current={newItem.category} />
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
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
          {/* Photo upload */}
          <div className="rounded-[9px] bg-c2 border border-c3 px-3 py-2.5 mb-3">
            <div className="text-[11px] text-white/50 text-right mb-2">صورة الوجبة (اختياري)</div>
            <ImagePicker value={newItem.image} onChange={u => setNew(n => ({ ...n, image: u }))} onError={setError} />
          </div>
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
                  <div className="mb-3">
                    <div className="text-[11px] text-white/50 text-right mb-1.5">القسم</div>
                    <select
                      value={editState.category}
                      onChange={e => setEd(s => ({ ...s, category: e.target.value }))}
                      className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50 cursor-pointer" dir="rtl"
                    >
                      <SectionOptions current={editState.category} />
                    </select>
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
                  {/* Photo upload */}
                  <div className="rounded-[9px] bg-c2 border border-c3 px-3 py-2.5 mb-3">
                    <div className="text-[11px] text-white/50 text-right mb-2">صورة الوجبة</div>
                    <ImagePicker value={editState.image} onChange={u => setEd(s => ({ ...s, image: u }))} onError={setError} />
                  </div>
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
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.hot && <span className="badge badge-warn text-[10px]">🔥 الأشهر</span>}
                        <span className="text-[13px] font-medium text-white">{item.name}</span>
                      </div>
                      <div className="flex items-center justify-end gap-3 mt-0.5">
                        <span className="badge badge-gold text-[11px]">{item.price.toLocaleString()} د.ع</span>
                        <span className="text-[11px] text-white/40">{catLabel(item.category)}</span>
                      </div>
                      {item.desc && <div className="text-[10px] text-white/30 mt-0.5 text-right">{item.desc}</div>}
                    </div>
                    {/* Thumbnail: photo if uploaded, else emoji */}
                    <div
                      className="w-[48px] h-[48px] rounded-[8px] overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: '#1a1a1a', border: '1px solid rgba(220,169,92,0.2)' }}
                    >
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <span className="text-[22px]">{item.emoji}</span>}
                    </div>
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
