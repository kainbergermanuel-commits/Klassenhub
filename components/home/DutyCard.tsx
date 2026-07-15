import Link from 'next/link'
import { dutyIcon } from '@/lib/dutyIcon'

export interface DutyEntry {
  name: string
  names: string[]
}

export default function DutyCard({ title, entries }: { title: string; entries: DutyEntry[] }) {
  return (
    <Link
      href="/dienste"
      className="gradient-violet rounded-2xl p-[18px] text-white flex flex-col gap-3 shadow-[0_8px_16px_rgba(20,40,45,.10)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full"
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>cleaning_services</span>
      </div>

      <div className="mt-1">
        <div className="font-extrabold text-[17px] leading-tight">{title}</div>
        {entries.length === 0 ? (
          <div className="text-[13px] font-semibold text-white/85 mt-1">Noch keine Dienste vergeben</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
            {entries.map(e => (
              <div key={e.name} className="flex items-center gap-1.5 min-w-0" title={e.name}>
                <span className="msym text-[16px] text-white/90 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {dutyIcon(e.name)}
                </span>
                <span className="text-[12px] font-semibold text-white/90 truncate">{e.names.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
