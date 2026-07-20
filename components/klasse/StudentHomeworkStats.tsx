'use client'

import { pctOf, Ring, Sparkline, SectionLabel } from '@/components/home/statParts'
import { localDateOf } from '@/lib/date'
import type { Homework } from '@/lib/types'

interface SubjectInfo { label: string; short: string; color: string }

interface Props {
  /** Voller, unfiltierter Hausübungs-Bestand der Klasse — die "je Fach"-
   *  Aufschlüsselung braucht alle Fächer, nicht nur das aktuell gefilterte. */
  homework: Homework[]
  doneIds: Set<string>
  /** homeworkId → completed_at (ISO) des ausgewählten Kindes, für Pünktlichkeit. */
  completedAtByHw: Map<string, string>
  subjects: SubjectInfo[]
  activeSubject: string | null
  today: string
}

const NEUTRAL_COLOR = '#0F8A82'

/**
 * Statistik-Block im Schüler-Hausübungs-Panel (Klasse-Seite) — dieselben
 * Bausteine wie im Statistik-Panel der Lehrer-Startseite (`statParts.tsx`),
 * aber für EIN Kind statt die ganze Klasse, und reaktiv auf den bestehenden
 * Fach-Filter: "Alle" zeigt die Gesamtquote + eine Aufschlüsselung je Fach
 * (schwächstes Fach zuerst — direkter Hinweis, wo Nachfragen sich lohnt),
 * ein einzelnes Fach zeigt nur dessen Kennzahlen.
 *
 * Bewusst KEINE Links (anders als RingTile/BarRow auf der Startseite) — das
 * hier ist ein Info-Block innerhalb eines Slide-in-Panels, kein Navigations-
 * ziel. Deshalb lokale, nicht-klickbare Darstellung statt der geteilten
 * Link-Kacheln.
 */
export default function StudentHomeworkStats({
  homework, doneIds, completedAtByHw, subjects, activeSubject, today,
}: Props) {
  const filtered = activeSubject ? homework.filter(h => h.subject === activeSubject) : homework
  const total = filtered.length
  if (total === 0) return null

  const doneItems = filtered.filter(h => doneIds.has(h.id))
  const done = doneItems.length
  const pct = pctOf(done, total)

  // Pünktlichkeit nur über tatsächlich abgegebene HÜ — "von dem, was da ist,
  // wie viel war rechtzeitig" (gleiche Definition wie im Eltern-Statistik-Panel).
  const onTime = doneItems.filter(h => {
    const at = completedAtByHw.get(h.id)
    return at ? localDateOf(at) <= h.due_date : false
  }).length
  const punctualPct = done > 0 ? pctOf(onTime, done) : null

  // Verlauf nur über bereits fällige HÜ — nicht fällige als "0" zu zeigen
  // sähe wie ein verpasster Termin aus, ist aber nur "noch nicht dran".
  const sparkValues = [...filtered]
    .filter(h => h.due_date <= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(-6)
    .map(h => (doneIds.has(h.id) ? 100 : 0))

  const ringColor = activeSubject
    ? subjects.find(s => s.label === activeSubject)?.color ?? NEUTRAL_COLOR
    : NEUTRAL_COLOR

  // Je-Fach-Aufschlüsselung nur im "Alle"-Zustand — bei einem aktiven Filter
  // wäre sie redundant mit der Ring-Kennzahl direkt darüber. Schwächstes
  // Fach zuerst: die Reihenfolge selbst ist der Hinweis.
  const breakdown = activeSubject
    ? []
    : subjects
        .map(s => {
          const subjHw = homework.filter(h => h.subject === s.label)
          const subjDone = subjHw.filter(h => doneIds.has(h.id)).length
          return { ...s, done: subjDone, total: subjHw.length, pct: pctOf(subjDone, subjHw.length) }
        })
        .filter(s => s.total > 0)
        .sort((a, b) => a.pct - b.pct)

  // Kein eigenes mb-*: der Elterncontainer (flex flex-col gap-6) übernimmt den
  // Abstand zum nächsten Block bereits — nur pb-5+border als Trenner-Optik.
  return (
    <div className="pb-5 border-b border-kh-border/60">
      <SectionLabel icon="query_stats">
        Statistik{activeSubject ? ` · ${activeSubject}` : ''}
      </SectionLabel>

      <div className="flex items-center gap-3">
        <Ring pct={pct} color={ringColor}>
          <span className="msym text-[17px]" style={{ color: ringColor, fontVariationSettings: "'FILL' 1" }}>
            assignment
          </span>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="text-[19px] font-extrabold text-kh-dark tabular-nums tracking-tight">{pct}%</div>
          <div className="text-[11.5px] font-medium text-kh-muted">{done}/{total} abgegeben</div>
        </div>
        {punctualPct !== null && (
          <div className="text-right flex-shrink-0 pl-2">
            <div className="text-[16px] font-extrabold text-kh-dark tabular-nums">{punctualPct}%</div>
            <div className="text-[10px] font-medium text-kh-muted whitespace-nowrap">pünktlich</div>
          </div>
        )}
      </div>

      {sparkValues.length >= 2 && (
        <div className="mt-3.5">
          <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1">
            Verlauf · letzte {sparkValues.length} fällige
          </div>
          <Sparkline values={sparkValues} color={ringColor} />
        </div>
      )}

      {breakdown.length > 1 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold text-kh-muted uppercase tracking-wide mb-1.5">Je Fach</div>
          <div className="flex flex-col gap-1.5">
            {breakdown.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-7 text-[10px] font-bold text-kh-muted flex-shrink-0">{s.short}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#EFE9DC] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, s.pct)}%`, background: s.color, transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </div>
                <span className="text-[10.5px] font-bold text-kh-dark tabular-nums w-9 text-right flex-shrink-0">
                  {s.done}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
