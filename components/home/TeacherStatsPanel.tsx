'use client'

import { pctOf, RingTile, BarRow, RecapChip } from './statParts'

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
