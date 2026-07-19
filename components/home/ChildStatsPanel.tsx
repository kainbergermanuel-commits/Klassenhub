'use client'

import { pctOf, RingTile, BarRow, RecapChip } from './statParts'

export interface ChildStats {
  /** Reise: eltern-bestätigter Streak des Kindes + nächster Meilenstein (Ring). */
  reise: { streak: number; nextMilestone: number }
  /** Hausübungen: erledigt / aktiv des Kindes. */
  homework: { done: number; total: number }
  /** Erinnerungen: vom Kind gesehene von bevorstehenden. null = keine. */
  reminders: { seen: number; total: number } | null
  /** Bevorstehende Termine. */
  termine: number
  /** Dienst des Kindes diese Woche durchgehend erledigt? null = kein Dienst. */
  dienst: { keptUp: boolean } | null
  /** Rückblick letzte Woche fürs Kind. null = ruhige Woche. */
  recap: { hwConfirmed: number; riddlesSolved: number } | null
}

/**
 * Statistik-Panel fürs eigene Kind (rechte Nav der Eltern-Startseite) —
 * spiegelt das Lehrer-Panel, aber für ein einzelnes Kind: Reise (Streak),
 * HÜ-Fortschritt, gesehene Erinnerungen, Termine, eigener Dienst, plus
 * Wochenrückblick. Kein Vergleich mit anderen Kindern (Prinzip 1/5).
 */
export default function ChildStatsPanel({ stats, childFirst }: { stats: ChildStats; childFirst: string }) {
  const reisePct = pctOf(stats.reise.streak, stats.reise.nextMilestone)
  const hwPct = pctOf(stats.homework.done, stats.homework.total)
  const remPct = stats.reminders ? pctOf(stats.reminders.seen, stats.reminders.total) : 0

  return (
    <div className="bg-white rounded-[20px] p-4 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2 mb-3.5 px-1">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
        <h2 className="font-extrabold text-base text-kh-dark truncate">{childFirst} auf einen Blick</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        <RingTile
          href="/streaks"
          icon="local_fire_department" iconColor="#B9791A" ringColor="#E8A020"
          pct={reisePct}
          big={`${stats.reise.streak}`} small="in Folge"
          label={stats.reise.streak > 0 ? `bis Etappe ${stats.reise.nextMilestone}` : 'Reise startet mit der ersten HÜ'}
        />
        <RingTile
          href="/hausaufgaben"
          icon="assignment" iconColor="#0F8A82" ringColor="#0F8A82"
          pct={hwPct}
          big={`${hwPct}%`} small="erledigt"
          label={stats.homework.total > 0
            ? `${stats.homework.done}/${stats.homework.total} Hausübungen`
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
        {stats.dienst && (
          <BarRow
            href="/dienste"
            icon="cleaning_services" iconColor="#0F8A82" barColor="#0F8A82"
            label="Dienst diese Woche"
            value={stats.dienst.keptUp ? 'erledigt' : 'offen'}
            pct={null}
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
          <div className="grid grid-cols-2 gap-1.5">
            <RecapChip icon="task_alt" value={stats.recap.hwConfirmed} label="HÜ bestätigt" />
            <RecapChip icon="extension" value={stats.recap.riddlesSolved} label="Rätsel gelöst" />
          </div>
        </>
      )}
    </div>
  )
}
