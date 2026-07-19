'use client'

import Link from 'next/link'

export interface TeacherStats {
  /** Reise: Kinder mit aktivem (eltern-bestätigtem) Streak. */
  reise: { active: number; total: number }
  /** Hausübungen: abgegebene von möglichen Slots (Kinder × aktive HÜ). */
  homework: { submitted: number; slots: number; active: number }
  /** Erinnerungen: gesehene von möglichen (Kinder × bevorstehende). null = keine. */
  reminders: { seen: number; total: number } | null
  /** Bevorstehende Termine. */
  termine: number
  /** Dienste diese Woche: durchgehend erledigt / zugeteilt. null = keine. */
  dienste: { done: number; assigned: number } | null
  /** Kollektiver Rückblick auf die letzte Woche. null = ruhige Woche. */
  recap: { hwConfirmed: number; activeKids: number; riddlesSolved: number } | null
}

const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

/** Kompakter Ring (SVG) für die zwei Haupt-Kennzahlen. */
function Ring({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
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

/** Prominente Kachel mit Ring, für Reise & Hausübungen. */
function RingTile({
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

/** Kompakte Zeile mit Balken, für Erinnerungen/Termine/Dienste. */
function BarRow({
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

/**
 * Lehrer-Statistik-Panel für die rechte Nav der Startseite — ersetzt die
 * Klassenziel-("Schatzsuche")-Card durch eine Übersicht der fünf für die
 * Lehrperson relevanten Kennzahlen. Bewusst kollektive Anteile, kein Ranking.
 */
export default function TeacherStatsPanel({ stats }: { stats: TeacherStats }) {
  const reisePct = pctOf(stats.reise.active, stats.reise.total)
  const hwPct = pctOf(stats.homework.submitted, stats.homework.slots)
  const remPct = stats.reminders ? pctOf(stats.reminders.seen, stats.reminders.total) : 0
  const dienstePct = stats.dienste ? pctOf(stats.dienste.done, stats.dienste.assigned) : 0

  return (
    <div className="bg-white rounded-[20px] p-4 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2 mb-3.5 px-1">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
        <h2 className="font-extrabold text-base text-kh-dark">Auf einen Blick</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        <RingTile
          href="/streaks"
          icon="explore" iconColor="#B9791A" ringColor="#E8A020"
          pct={reisePct}
          big={`${stats.reise.active}`} small={`/ ${stats.reise.total}`}
          label={stats.reise.active === 1 ? 'Kind auf Reise' : 'Kinder auf Reise'}
        />
        <RingTile
          href="/hausaufgaben"
          icon="assignment" iconColor="#0F8A82" ringColor="#0F8A82"
          pct={hwPct}
          big={`${hwPct}%`} small="abgegeben"
          label={stats.homework.active > 0
            ? `${stats.homework.submitted}/${stats.homework.slots} · ${stats.homework.active} aktiv`
            : 'Keine aktiven HÜ'}
        />
      </div>

      <div className="h-px bg-kh-border/50 my-3" />

      <div className="flex flex-col gap-0.5">
        {stats.reminders && (
          <BarRow
            href="/erinnerungen"
            icon="push_pin" iconColor="#C98A2B" barColor="#E8A020"
            label="Erinnerungen gesehen"
            value={`${remPct}%`}
            pct={remPct}
          />
        )}
        <BarRow
          href="/termine"
          icon="calendar_month" iconColor="#4A8FB0" barColor="#4A8FB0"
          label="Bevorstehende Termine"
          value={`${stats.termine}`}
          pct={null}
        />
        {stats.dienste && (
          <BarRow
            href="/dienste"
            icon="cleaning_services" iconColor="#0F8A82" barColor="#0F8A82"
            label="Dienste erledigt"
            value={`${stats.dienste.done}/${stats.dienste.assigned}`}
            pct={dienstePct}
          />
        )}
      </div>

      {stats.recap && (
        <>
          <div className="h-px bg-kh-border/50 my-3" />
          <div className="flex items-center gap-1.5 mb-2.5 px-1">
            <span className="msym text-[16px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            <h3 className="text-[11px] font-bold text-kh-muted uppercase tracking-wide">Rückblick · letzte Woche</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <RecapChip icon="task_alt" value={stats.recap.hwConfirmed} label={stats.recap.hwConfirmed === 1 ? 'HÜ bestätigt' : 'HÜ bestätigt'} />
            <RecapChip icon="groups" value={stats.recap.activeKids} label={stats.recap.activeKids === 1 ? 'Kind aktiv' : 'aktiv'} />
            <RecapChip icon="extension" value={stats.recap.riddlesSolved} label="Rätsel" />
          </div>
        </>
      )}
    </div>
  )
}

function RecapChip({ icon, value, label }: { icon: string; value: number; label: string }) {
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
