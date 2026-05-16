import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Offer } from '../../types/index'

export default function OffersMgmt() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [title,  setTitle]  = useState('')
  const [desc,   setDesc]   = useState('')

  useEffect(() => { api.getOffers().then(setOffers) }, [])

  async function add() {
    if (!title.trim()) return
    const o = await api.addOffer(title.trim(), desc.trim())
    setOffers(prev => [...prev, o])
    setTitle(''); setDesc('')
  }

  async function toggle(id: number) {
    const updated = await api.toggleOffer(id)
    setOffers(prev => prev.map(o => o.id === id ? updated : o))
  }

  async function remove(id: number) {
    await api.deleteOffer(id)
    setOffers(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      <h1 className="text-[20px] font-semibold text-white text-right mb-5">إدارة العروض</h1>

      {/* Add offer form */}
      <div className="rounded-xl p-4 border border-c3 mb-5" style={{ background: '#111111' }}>
        <div className="text-[13px] font-medium text-gold text-right mb-3">إضافة عرض جديد</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            value={desc} onChange={e => setDesc(e.target.value)} placeholder="الوصف..."
            className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-right placeholder:text-white/30 focus:outline-none focus:border-gold/50"
            dir="rtl"
          />
          <input
            value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان العرض..."
            className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white text-right placeholder:text-white/30 focus:outline-none focus:border-gold/50"
            dir="rtl"
          />
        </div>
        <button
          onClick={add}
          className="w-full py-2 rounded-[9px] text-[12px] font-medium bg-gold text-black hover:bg-gold-light active:scale-95 transition-all cursor-pointer"
        >
          + إضافة عرض
        </button>
      </div>

      {/* Offers list */}
      <div className="grid gap-3">
        {offers.map(o => (
          <div
            key={o.id}
            className="rounded-xl p-4 border flex items-center justify-between"
            style={{ background: '#111111', borderColor: o.active ? 'rgba(220,169,92,0.35)' : '#242424' }}
          >
            <div className="flex items-center gap-3">
              <button onClick={() => remove(o.id)} className="text-[11px] text-white/40 hover:text-err border border-c3 rounded-[7px] px-2 py-1 hover:border-err/40 cursor-pointer transition-colors">حذف</button>
              <div
                onClick={() => toggle(o.id)}
                className="relative w-9 h-5 rounded-full cursor-pointer transition-colors duration-300"
                style={{ background: o.active ? '#DCA95C' : '#343434' }}
              >
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300" style={{ left: o.active ? '18px' : '2px' }} />
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[13px] font-medium ${o.active ? 'text-gold' : 'text-white/50'}`}>{o.title}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{o.desc}</div>
            </div>
          </div>
        ))}
        {offers.length === 0 && (
          <div className="text-center py-10 text-white/25 text-[13px]">لا توجد عروض نشطة</div>
        )}
      </div>
    </div>
  )
}
