import { useState } from 'react'
import { api } from '../../lib/api'

function StarGroup({ label, rating, onRate }: { label: string; rating: number; onRate: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="bg-c2 border border-c3 rounded-xl p-3 mb-2.5">
      <div className="text-[11px] text-white/60 mb-2.5">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            onClick={() => onRate(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className={`text-[28px] cursor-pointer transition-colors duration-150 select-none
              ${i <= (hovered || rating) ? 'text-gold' : 'text-c4'}`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RatingTab({ tableId = 0 }: { tableId?: number }) {
  const [food, setFood]       = useState(0)
  const [service, setService] = useState(0)
  const [overall, setOverall] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (loading || sent) return
    setLoading(true)
    await api.submitRating(food, service, overall, comment, tableId)
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="p-4">
      <div className="text-[17px] font-medium text-gold mb-1 font-serif">قيّم تجربتك</div>
      <div className="text-[11px] text-white/60 mb-4">رأيك يساعدنا على التطوير</div>

      <StarGroup label="جودة الأكل 🍽️"    rating={food}    onRate={setFood}    />
      <StarGroup label="جودة الخدمة 👨‍🍽️"  rating={service} onRate={setService} />
      <StarGroup label="التجربة الكلية ⭐"  rating={overall} onRate={setOverall} />

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="w-full h-[68px] bg-c2 border border-c3 rounded-[10px] p-2.5 text-white text-[12px] resize-none outline-none
          focus:border-gold transition-colors duration-200 font-sans"
        placeholder="تعليق إضافي..."
        dir="rtl"
      />

      <button
        onClick={submit}
        disabled={loading || sent}
        className="w-full mt-2.5 py-2.5 rounded-[9px] text-[12px] font-medium bg-gold text-black
          hover:bg-gold-light active:scale-95 transition-all duration-200 disabled:opacity-70"
      >
        {loading ? '...' : sent ? '✓ شكراً!' : 'إرسال التقييم ✨'}
      </button>

      {sent && (
        <div className="text-center text-[12px] text-gold mt-2.5 animate-fade-in">
          ✓ شكراً على تقييمك الكريم!
        </div>
      )}
    </div>
  )
}
