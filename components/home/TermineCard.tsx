import Link from 'next/link'
import { eventCategoryMeta } from '@/lib/eventCategories'

export interface NextEvent {
  title: string
  category: string
  countdownLabel: string
  dateLabel: string
}

/**
 * Startseiten-Minicard fürs Termin-Modul (Variante B: der nächste Termin
 * steht im Vordergrund). Blau-Pastell, klassenweit identisch für alle Rollen.
 */
export default function TermineCard({ nextEvent, moreCount }: { nextEvent: NextEvent | null; moreCount: number }) {
  const meta = nextEvent ? eventCategoryMeta(nextEvent.category) : null

  return (
    <Link
      href="/termine"
      className="bg-gradient-to-br from-[#4C93C9] to-[#7EB8E5] rounded-2xl p-[18px] text-white flex flex-col gap-3 shadow-[0_8px_16px_rgba(20,40,45,.10)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full"
    >
      {nextEvent ? (
        <>
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            </div>
            {moreCount > 0 && (
              <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full flex-shrink-0">+{moreCount} weitere</span>
            )}
          </div>
          <div className="mt-1">
            <div className="font-extrabold text-[17px] leading-tight">Termine</div>
            <div className="flex items-center gap-1.5 mt-1">
              {meta && <span className="msym text-[13px] text-white/85 flex-shrink-0">{meta.icon}</span>}
              <span className="text-[13px] font-semibold text-white/85 truncate">{nextEvent.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white/75 mt-auto pt-1">
            <span className="msym text-[13px]">schedule</span>
            {nextEvent.countdownLabel} · {nextEvent.dateLabel}
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          </div>
          <div className="mt-1">
            <div className="font-extrabold text-[17px] leading-tight">Termine</div>
            <div className="text-[13px] font-semibold text-white/85 mt-1">Nichts geplant</div>
          </div>
        </>
      )}
    </Link>
  )
}
