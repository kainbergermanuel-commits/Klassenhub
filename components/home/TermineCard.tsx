import Link from 'next/link'
import { eventCategoryMeta } from '@/lib/eventCategories'
import { todayISO, daysUntilLabel } from '@/lib/date'
import type { AgendaEvent } from '@/lib/types'

const MONTHS_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function pillLabel(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`
}

/**
 * Startseiten-Minicard fürs Termin-Modul. Listet die nächsten Termine als
 * kleine ovale Datum-Pillen; Hover zeigt ein Detail-Overlay. Blau-Pastell,
 * klassenweit identisch für alle Rollen.
 */
export default function TermineCard({ events }: { events: AgendaEvent[] }) {
  const today = todayISO()

  return (
    <Link
      href="/termine"
      className="relative hover:z-30 bg-gradient-to-br from-[#4C93C9] to-[#7EB8E5] rounded-2xl p-[18px] text-white flex flex-col gap-3 shadow-[0_8px_16px_rgba(20,40,45,.10)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full"
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
      </div>

      <div className="mt-1">
        <div className="font-extrabold text-[17px] leading-tight">Termine</div>

        {events.length === 0 ? (
          <div className="text-[13px] font-semibold text-white/85 mt-1">Nichts geplant</div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {events.map(ev => {
              const meta = eventCategoryMeta(ev.category)
              const ongoing = ev.start_date <= today && today <= ev.end_date
              const countdown = ongoing ? 'Heute' : daysUntilLabel(ev.start_date)
              const timeLabel = !ev.all_day && ev.start_time ? ev.start_time : null
              return (
                <span key={ev.id} className="relative group/ev">
                  <span className="inline-flex items-center justify-center gap-1 w-[72px] bg-white/20 group-hover/ev:bg-white/30 text-white text-[11px] font-bold py-1 rounded-full transition-colors">
                    <span className="msym text-[12px]">{meta.icon}</span>
                    {pillLabel(ev.start_date)}
                  </span>
                  {/* Detail-Overlay bei Hover */}
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 hidden group-hover/ev:block w-max max-w-[190px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-2.5 text-left">
                    <span className="flex items-center gap-1 mb-0.5">
                      <span className="msym text-[13px]" style={{ color: meta.color }}>{meta.icon}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                    </span>
                    <span className="block font-bold text-[13px] text-kh-dark leading-tight">{ev.title}</span>
                    <span className="block text-[11.5px] font-semibold text-kh-muted mt-0.5">
                      {countdown} · {pillLabel(ev.start_date)}{timeLabel ? ` · ${timeLabel}` : ''}
                    </span>
                  </span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </Link>
  )
}
