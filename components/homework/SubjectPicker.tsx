'use client'

import type { SubjectOption } from '@/lib/subjectsCatalog'

/**
 * Fächer-Auswahl als kompaktes Kachelraster.
 *
 * Statt breiter Pillen mit vollem Namen (13 Fächer brauchten so vier Zeilen)
 * dieselben Kürzel-Kacheln, die im Rest der App eine Hausübung markieren:
 * Verlauf in der Fachfarbe, weiße Initialen. Das halbiert die Höhe und
 * verbindet das Formular optisch mit den Karten, die daraus entstehen.
 *
 * Der volle Name geht dabei nicht verloren: er steht rechts in der
 * Beschriftungszeile, sobald ein Fach gewählt ist, und zusätzlich in
 * title/aria-label jeder Kachel.
 *
 * Gemeinsame Fassung für "Neue Hausübung" und den Bearbeiten-Dialog — die
 * Auswahl lag vorher zweimal im Code (vgl. components/ui/DatePicker.tsx).
 */
export default function SubjectPicker({
  subjects, value, onChange, label = 'Fach',
}: {
  subjects: SubjectOption[]
  /** Ausgewähltes Fach über sein `label` (so liegt es auch an der HÜ). */
  value: string
  onChange: (label: string) => void
  label?: string
}) {
  const selected = subjects.find(s => s.label === value)

  return (
    <div>
      {/* Der volle Name des gewählten Fachs steht direkt bei der Beschriftung,
          nicht am rechten Rand: die Kacheln zeigen nur das Kürzel, und die
          Auflösung gehört dorthin, wo man ohnehin hinschaut. */}
      <div className="flex items-baseline gap-1.5 mb-1.5 min-w-0">
        <span className="text-xs font-bold text-kh-dark flex-shrink-0">{label}</span>
        {selected && (
          <>
            <span className="text-xs font-bold text-kh-muted/60 flex-shrink-0">·</span>
            <span className="text-[12px] font-bold text-kh-teal truncate">{selected.label}</span>
          </>
        )}
      </div>

      {subjects.length === 0 ? (
        <p className="text-[12.5px] text-kh-muted font-medium">
          Noch keine Fächer angelegt. Die Administration verwaltet den Fächer-Katalog unter „Fächer-Katalog".
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {subjects.map(s => {
            const active = s.label === value
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => onChange(s.label)}
                title={s.label}
                aria-label={s.label}
                aria-pressed={active}
                className={`h-11 min-w-[44px] px-2.5 rounded-[13px] flex items-center justify-center font-extrabold tracking-tight transition-all ${
                  s.short.length > 3 ? 'text-[11px]' : 'text-[14px]'
                } ${active ? 'text-white shadow-[0_4px_12px_rgba(20,40,45,.18)] scale-[1.04]' : 'hover:-translate-y-px'}`}
                style={active
                  ? { background: `linear-gradient(135deg, ${s.color}ee 0%, ${s.color}99 100%)` }
                  // Ungewählt bewusst neutral hinterlegt, aber mit der Fachfarbe
                  // als Schrift: die Farbzuordnung bleibt lesbar, ohne dass 13
                  // gefüllte Kacheln um Aufmerksamkeit konkurrieren.
                  : { background: '#F6F3ED', color: s.color }
                }
              >
                {s.short}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
