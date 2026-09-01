'use client'

import { pctOf, RingTile, BarRow, RecapChip, StatTooltip, MilestoneDots, SectionLabel } from './statParts'

export interface ChildStats {
  /** Reise: eltern-bestätigter Streak des Kindes + Etappenkette. */
  reise: { streak: number; nextMilestone: number; milestones: number[] }
  /** Hausübungen: erledigt / aktiv des Kindes. */
  homework: { done: number; total: number }
  /** Vom Kind abgegeben, aber von den Eltern noch nicht bestätigt. */
  pending: number
  /** Pünktlichkeit: vor Fälligkeit erledigte HÜ dieses Schuljahres. null = noch keine. */
  punctual: { onTime: number; total: number } | null
  /** Erinnerungen: vom Kind gesehene von bevorstehenden. null = keine. */
  reminders: { seen: number; total: number } | null
  /** Bevorstehende Termine + Label des nächsten. */
  termine: { count: number; nextLabel: string | null }
  /** Dienst des Kindes diese Woche durchgehend erledigt? null = kein Dienst.
   *  `weekStarted` = false am Sonntag, wenn die angezeigte Dienstwoche erst
   *  beginnt — dann ist "noch nicht abgehakt" keine ehrliche Aussage. */
  dienst: { keptUp: boolean; weekStarted: boolean } | null
  /** Rückblick letzte Woche fürs Kind. null = ruhige Woche. */
  recap: { hwConfirmed: number; riddlesSolved: number } | null
}

/**
 * Statistik-Panel fürs eigene Kind (rechte Nav der Eltern-Startseite) —
 * spiegelt das Lehrer-Panel, aber für ein einzelnes Kind: Reise (Streak +
 * Etappenkette), HÜ-Fortschritt, offene Bestätigungen, Pünktlichkeit, gesehene
 * Erinnerungen, Termine, eigener Dienst, plus Wochenrückblick. Kein Vergleich
 * mit anderen Kindern (Prinzip 1/5) — nur das Kind mit sich selbst.
 */
export default function ChildStatsPanel({ stats, childFirst }: { stats: ChildStats; childFirst: string }) {
  const reisePct = pctOf(stats.reise.streak, stats.reise.nextMilestone)
  const hwPct = pctOf(stats.homework.done, stats.homework.total)
  const remPct = stats.reminders ? pctOf(stats.reminders.seen, stats.reminders.total) : 0
  const punctPct = stats.punctual ? pctOf(stats.punctual.onTime, stats.punctual.total) : 0

  return (
    <div className="bg-white rounded-[20px] p-4 shadow-sm border border-kh-border/50 max-md:rounded-2xl max-md:border-0 max-md:shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      <div className="flex items-center gap-2 mb-3.5 px-1">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
        <h2 className="font-extrabold text-base text-kh-dark truncate">{childFirst} auf einen Blick</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        <StatTooltip
          title="Die Reise"
          body={stats.reise.streak > 0
            ? `${stats.reise.streak} Hausübungen in Folge — jede von euch bestätigt. Noch ${stats.reise.nextMilestone - stats.reise.streak} bis zur Etappe ${stats.reise.nextMilestone}.`
            : 'Die Reise startet, sobald ihr die erste erledigte Hausübung bestätigt.'}
        >
          <RingTile
            href="/streaks"
            icon="local_fire_department" iconColor="#B9791A" ringColor="#E8A020"
            pct={reisePct}
            value={stats.reise.streak} small="in Folge"
            label={stats.reise.streak > 0 ? `bis Etappe ${stats.reise.nextMilestone}` : 'Reise startet mit der ersten HÜ'}
            footer={
              <>
                <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">Etappen</div>
                <MilestoneDots milestones={stats.reise.milestones} current={stats.reise.streak} color="#E8A020" />
              </>
            }
          />
        </StatTooltip>

        <StatTooltip
          title="Hausübungen gerade"
          body={stats.homework.total > 0
            ? `${stats.homework.done} von ${stats.homework.total} offenen Hausübungen sind erledigt.`
            : 'Gerade sind keine Hausübungen offen.'}
        >
          <RingTile
            href="/hausaufgaben"
            icon="assignment" iconColor="#0F8A82" ringColor="#0F8A82"
            pct={hwPct}
            value={hwPct} suffix="%" small="erledigt"
            label={stats.homework.total > 0
              ? `${stats.homework.done}/${stats.homework.total} Hausübungen`
              : 'Keine aktiven HÜ'}
          />
        </StatTooltip>
      </div>

      <div className="h-px bg-kh-border/50 my-3" />

      <div className="flex flex-col gap-0.5">
        {stats.pending > 0 && (
          <StatTooltip
            title="Wartet auf eure Bestätigung"
            body={`${childFirst} hat abgegeben, aber ihr habt noch nicht bestätigt. Erst die Bestätigung lässt die Reise weiterwachsen.`}
          >
            <BarRow
              href="/hausaufgaben"
              icon="hourglass_top" iconColor="#C98A2B" barColor="#E8A020"
              label="Wartet auf euch"
              value={`${stats.pending}`}
              pct={null}
              accent
            />
          </StatTooltip>
        )}

        {stats.punctual && (
          <StatTooltip
            title="Pünktlichkeit"
            body={`${stats.punctual.onTime} von ${stats.punctual.total} Hausübungen dieses Schuljahres waren vor dem Abgabetag erledigt.`}
          >
            <BarRow
              href="/hausaufgaben"
              icon="schedule" iconColor="#7A6BA8" barColor="#7A6BA8"
              label="Rechtzeitig erledigt"
              value={`${punctPct}%`}
              pct={punctPct}
            />
          </StatTooltip>
        )}

        {stats.reminders && (
          <StatTooltip
            title="Gesehene Erinnerungen"
            body={`${stats.reminders.seen} von ${stats.reminders.total} bevorstehenden Erinnerungen hat ${childFirst} schon geöffnet.`}
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
            : 'Aktuell stehen keine Termine an.'}
        >
          <BarRow
            href="/termine"
            icon="calendar_month" iconColor="#4A8FB0" barColor="#4A8FB0"
            label={stats.termine.nextLabel ?? 'Bevorstehende Termine'}
            value={`${stats.termine.count}`}
            pct={null}
          />
        </StatTooltip>

        {stats.dienst && (
          <StatTooltip
            title="Dienst diese Woche"
            body={!stats.dienst.weekStarted
              ? `Die Dienstwoche beginnt erst am Montag.`
              : stats.dienst.keptUp
              ? `${childFirst} hat den Dienst an allen Tagen dieser Woche erledigt.`
              : `Der Dienst dieser Woche ist noch nicht an allen Tagen abgehakt.`}
          >
            <BarRow
              href="/dienste"
              icon="cleaning_services" iconColor="#0F8A82" barColor="#0F8A82"
              label="Dienst diese Woche"
              value={!stats.dienst.weekStarted ? 'ab Montag' : stats.dienst.keptUp ? 'erledigt' : 'offen'}
              pct={null}
            />
          </StatTooltip>
        )}
      </div>

      {stats.recap && (
        <>
          <div className="h-px bg-kh-border/50 my-3" />
          <SectionLabel icon="history">Rückblick · letzte Woche</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <RecapChip icon="task_alt" value={stats.recap.hwConfirmed} label="HÜ bestätigt" />
            <RecapChip icon="extension" value={stats.recap.riddlesSolved} label="Rätsel gelöst" />
          </div>
        </>
      )}
    </div>
  )
}
