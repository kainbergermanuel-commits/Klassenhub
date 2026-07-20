'use client'

import { pctOf, RingTile, BarRow, RecapChip, StatTooltip, Sparkline, DistributionStrip, SectionLabel } from './statParts'

export interface TeacherStats {
  /** Reise: Kinder mit aktivem (eltern-bestätigtem) Streak + anonyme Verteilung. */
  reise: {
    active: number
    total: number
    /** Längenverteilung der Reisen — ohne Namen, zeigt Streuung statt Rangliste. */
    buckets: { label: string; count: number }[]
    longest: number
  }
  /** Hausübungen: abgegebene von möglichen Slots (Kinder × aktive HÜ). */
  homework: {
    submitted: number; slots: number; active: number
    /** Abgabequoten der letzten fälligen HÜ (ältest → neuest) für den Mini-Verlauf. */
    history: number[]
    /** Veränderung in Prozentpunkten gegenüber dem vorigen Messpunkt. */
    trend: number
  }
  /** Abgegeben, aber von den Eltern noch nicht bestätigt — ohne Bestätigung wächst keine Reise. */
  unconfirmed: number
  /** Erinnerungen: gesehene von möglichen (Kinder × bevorstehende). null = keine. */
  reminders: { seen: number; total: number } | null
  /** Bevorstehende Termine + Label des nächsten ("in 3 Tagen"). */
  termine: { count: number; nextLabel: string | null }
  /** Dienste diese Woche: durchgehend erledigt / zugeteilt. null = keine. */
  dienste: { done: number; assigned: number } | null
  /** Kollektiver Rückblick auf die letzte Woche. null = ruhige Woche. */
  recap: { hwConfirmed: number; activeKids: number; riddlesSolved: number } | null
}

/**
 * Lehrer-Statistik-Panel für die rechte Nav der Startseite — ersetzt die
 * Klassenziel-("Schatzsuche")-Card durch eine Übersicht der für die Lehrperson
 * relevanten Kennzahlen. Bewusst kollektive Anteile und anonyme Verteilungen,
 * kein Ranking (Prinzip 1/5). Jede Kennzahl trägt einen Erklär-Tooltip, damit
 * "24 %" nicht raten lässt, worauf sich die Zahl bezieht.
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
        <StatTooltip
          title="Kinder mit aktiver Reise"
          body={`Mindestens eine Hausübung in Folge, von einem Elternteil bestätigt. Eingefrorene Tage unterbrechen die Reise nicht.${
            stats.reise.longest > 0 ? ` Längste Reise gerade: ${stats.reise.longest} Etappen.` : ''
          }`}
        >
          <RingTile
            href="/streaks"
            icon="explore" iconColor="#B9791A" ringColor="#E8A020"
            pct={reisePct}
            value={stats.reise.active} small={`von ${stats.reise.total}`}
            label={stats.reise.active === 1 ? 'Kind auf Reise' : 'Kinder auf Reise'}
            footer={
              stats.reise.total > 0 ? (
                <>
                  <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">
                    Reiselängen in der Klasse
                  </div>
                  <DistributionStrip buckets={stats.reise.buckets} color="#E8A020" />
                </>
              ) : undefined
            }
          />
        </StatTooltip>

        <StatTooltip
          title="Abgabequote der aktiven Hausübungen"
          body={
            stats.homework.active > 0
              ? `${stats.homework.submitted} von ${stats.homework.slots} möglichen Abgaben (${stats.homework.active} aktive HÜ × ${stats.reise.total} Kinder). Der Verlauf zeigt die letzten fälligen Hausübungen.`
              : 'Gerade sind keine Hausübungen offen.'
          }
        >
          <RingTile
            href="/hausaufgaben"
            icon="assignment" iconColor="#0F8A82" ringColor="#0F8A82"
            pct={hwPct}
            value={hwPct} suffix="%" small="abgegeben"
            trend={stats.homework.history.length >= 2 ? stats.homework.trend : undefined}
            label={stats.homework.active > 0
              ? `${stats.homework.submitted}/${stats.homework.slots} · ${stats.homework.active} aktiv`
              : 'Keine aktiven HÜ'}
            footer={
              stats.homework.history.length >= 2 ? (
                <>
                  <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-0.5">
                    Letzte {stats.homework.history.length} fällige HÜ
                  </div>
                  <Sparkline values={stats.homework.history} color="#0F8A82" />
                </>
              ) : undefined
            }
          />
        </StatTooltip>
      </div>

      <div className="h-px bg-kh-border/50 my-3" />

      <div className="flex flex-col gap-0.5">
        {stats.unconfirmed > 0 && (
          <StatTooltip
            title="Warten auf Eltern-Bestätigung"
            body="Diese Abgaben sind da, aber noch nicht von einem Elternteil bestätigt. Erst die Bestätigung lässt die Reise des Kindes weiterwachsen."
          >
            <BarRow
              href="/hausaufgaben"
              icon="hourglass_top" iconColor="#C98A2B" barColor="#E8A020"
              label="Warten auf Bestätigung"
              value={`${stats.unconfirmed}`}
              pct={null}
              accent
            />
          </StatTooltip>
        )}

        {stats.reminders && (
          <StatTooltip
            title="Gesehene Erinnerungen"
            body={`${stats.reminders.seen} von ${stats.reminders.total} möglichen Ansichten (bevorstehende Erinnerungen × Kinder). Ein niedriger Wert heißt meist: die Erinnerung ist noch frisch.`}
          >
            <BarRow
              href="/erinnerungen"
              icon="push_pin" iconColor="#C98A2B" barColor="#E8A020"
              label="Erinnerungen gesehen"
              value={`${remPct}%`}
              pct={remPct}
            />
          </StatTooltip>
        )}

        <StatTooltip
          title="Bevorstehende Termine"
          body={stats.termine.nextLabel
            ? `Nächster Termin: ${stats.termine.nextLabel}.`
            : 'Aktuell sind keine Termine eingetragen.'}
        >
          <BarRow
            href="/termine"
            icon="calendar_month" iconColor="#4A8FB0" barColor="#4A8FB0"
            label={stats.termine.nextLabel ?? 'Bevorstehende Termine'}
            value={`${stats.termine.count}`}
            pct={null}
          />
        </StatTooltip>

        {stats.dienste && (
          <StatTooltip
            title="Dienste diese Woche"
            body={`${stats.dienste.done} von ${stats.dienste.assigned} Kindern mit Dienst haben ihn an allen Tagen erledigt.`}
          >
            <BarRow
              href="/dienste"
              icon="cleaning_services" iconColor="#0F8A82" barColor="#0F8A82"
              label="Dienste erledigt"
              value={`${stats.dienste.done}/${stats.dienste.assigned}`}
              pct={dienstePct}
            />
          </StatTooltip>
        )}
      </div>

      {stats.recap && (
        <>
          <div className="h-px bg-kh-border/50 my-3" />
          <SectionLabel icon="history">Rückblick · letzte Woche</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            <RecapChip icon="task_alt" value={stats.recap.hwConfirmed} label="HÜ bestätigt" />
            <RecapChip icon="groups" value={stats.recap.activeKids} label={stats.recap.activeKids === 1 ? 'Kind aktiv' : 'aktiv'} />
            <RecapChip icon="extension" value={stats.recap.riddlesSolved} label="Rätsel" />
          </div>
        </>
      )}
    </div>
  )
}
