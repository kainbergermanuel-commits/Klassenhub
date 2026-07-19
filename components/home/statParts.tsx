'use client'

import Link from 'next/link'

/** Prozent-Anteil, gerundet, 0 bei Nenner 0. */
export const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

/** Kompakter Ring (SVG) für die zwei Haupt-Kennzahlen. */
export function Ring({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
      <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#EFE9DC" strokeWidth={6} />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1000ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  )
}

/** Prominente Kachel mit Ring, für die zwei Haupt-Kennzahlen. */
export function RingTile({
  href, icon, iconColor, ringColor, pct, big, small, label,
}: {
  href: string; icon: string; iconColor: string; ringColor: string
  pct: number; big: string; small: string; label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white p-3.5 border border-kh-border/50 hover:border-kh-teal/40 transition-colors"
    >
      <Ring pct={pct} color={ringColor}>
        <span className="msym text-[19px]" style={{ color: iconColor, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </Ring>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-[19px] font-extrabold text-kh-dark tracking-tight">{big}</span>
          <span className="text-[12px] font-semibold text-kh-muted">{small}</span>
        </div>
        <div className="text-[11.5px] font-medium text-kh-muted mt-0.5">{label}</div>
      </div>
    </Link>
  )
}

/** Kompakte Zeile mit optionalem Balken, für Erinnerungen/Termine/Dienste. */
export function BarRow({
  href, icon, iconColor, barColor, label, value, pct,
}: {
  href: string; icon: string; iconColor: string; barColor: string
  label: string; value: string; pct: number | null
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/70 transition-colors"
    >
      <span
        className="msym text-[18px] flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center"
        style={{ color: iconColor, background: `${iconColor}1a`, fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-kh-dark truncate">{label}</span>
          <span className="text-[13px] font-extrabold text-kh-dark flex-shrink-0">{value}</span>
        </div>
        {pct !== null && (
          <div className="relative w-full h-1.5 rounded-full bg-[#EFE9DC] overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, pct)}%`, background: barColor, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

/** Rückblick-Chip im Platinum-Metallic-Look. */
export function RecapChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div
      className="flex flex-col items-center text-center rounded-xl px-1.5 py-2.5 border border-white/70 shadow-[0_1px_4px_rgba(80,95,110,.1)]"
      style={{ background: 'linear-gradient(160deg, #F8F9FB 0%, #E3E7EC 52%, #CED4DB 100%)' }}
    >
      <span className="msym text-[17px]" style={{ color: '#556472', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      <span className="text-[17px] font-extrabold leading-tight mt-0.5" style={{ color: '#38434E' }}>{value}</span>
      <span className="text-[10px] font-medium leading-tight" style={{ color: '#66727E' }}>{label}</span>
    </div>
  )
}
