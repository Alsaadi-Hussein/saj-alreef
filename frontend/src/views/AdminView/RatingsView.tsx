import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { Rating } from '../../types/index'

function Stars({ n }: { n: number }) {
  const clamped = Math.max(0, Math.min(5, n))
  return <span className="text-gold text-[13px]">{'★'.repeat(clamped)}{'☆'.repeat(5 - clamped)}</span>
}

export default function RatingsView() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRatings().then(data => { setRatings(data); setLoading(false) })
    const ch = supabase.channel('ratings-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ratings' }, () => {
        api.getRatings().then(setRatings)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const avgOverall = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.overall, 0) / ratings.length).toFixed(1) : '—'
  const avgFood    = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.food,    0) / ratings.length).toFixed(1) : '—'
  const avgService = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.service, 0) / ratings.length).toFixed(1) : '—'

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      <div className="flex justify-between items-center mb-5">
        <span className="text-[12px] text-white/40">{ratings.length} تقييم</span>
        <h1 className="text-[20px] font-semibold text-white">التقييمات</h1>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/40">جارٍ التحميل...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'متوسط الكلي',  value: avgOverall },
              { label: 'متوسط الطعام', value: avgFood    },
              { label: 'متوسط الخدمة', value: avgService },
            ].map((c, i) => (
              <div key={i} className="rounded-xl p-4 border border-c3 text-right" style={{ background: '#111111' }}>
                <div className="text-[11px] text-white/45 mb-1">{c.label}</div>
                <div className="text-[26px] font-semibold text-gold">{c.value}</div>
                <div className="text-[12px] text-gold mt-0.5">
                  {'★'.repeat(Math.round(parseFloat(c.value) || 0))}
                </div>
              </div>
            ))}
          </div>

          {ratings.length === 0 ? (
            <div className="text-center py-20 text-white/25 text-[14px]">لا توجد تقييمات بعد</div>
          ) : (
            <div className="grid gap-3">
              {ratings.map((r) => (
                <div key={r.id} className="rounded-xl p-4 border border-c3" style={{ background: '#111111' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[11px] text-white/35">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars n={r.overall} />
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium text-black" style={{ background: '#DCA95C' }}>
                        طاولة {r.tableId}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right mb-2">
                    <div>
                      <span className="text-[10px] text-white/40">الخدمة </span>
                      <Stars n={r.service} />
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40">الطعام </span>
                      <Stars n={r.food} />
                    </div>
                  </div>
                  {r.sessionId && (
                    <div className="text-[10px] text-white/25 text-right mb-1">جلسة: {r.sessionId}</div>
                  )}
                  {r.comment && (
                    <div className="text-[12px] text-white/60 text-right border-t border-c3/50 pt-2 mt-2">
                      "{r.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
