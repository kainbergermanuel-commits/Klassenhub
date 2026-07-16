'use client'

import { SCHOOL_YEAR_ARCS, GUIDE_PORTRAIT, LOCATION_ART, findBuiltTheme } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'

/** Admin-only Vorschau: ALLE geplanten Welten des Schuljahres-Fahrplans auf
 *  einmal, unabhängig vom tatsächlichen Fortschritt der Klasse — inkl. voller
 *  Etappen-Texte für bereits gebaute Welten. Reines Redaktions-/Kontrollwerkzeug
 *  für Lehrkräfte mit Admin-Rechten, keine neue Mechanik, keine Schüler:innen-
 *  Sicht (Prinzip 5: nur Schüler:innen werden bespielt). */
export default function AllArcsOverview() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12.5px] text-kh-muted font-medium leading-snug -mt-1">
        Admin-Vorschau: alle {SCHOOL_YEAR_ARCS.length} Welten des Fahrplans, unabhängig vom Klassenfortschritt —
        inkl. voller Etappen-Texte, wo bereits gebaut.
      </p>

      {SCHOOL_YEAR_ARCS.map(arc => {
        const Art = SEASON_ART[arc.icon]
        const portrait = GUIDE_PORTRAIT[arc.icon]
        const locationArt = LOCATION_ART[arc.icon]
        const builtTheme = findBuiltTheme(arc.icon)

        return (
          <div key={arc.name} className="relative overflow-hidden rounded-2xl kh-card p-5">
            {Art && (
              <div className="absolute inset-0 pointer-events-none select-none opacity-70">
                <Art />
              </div>
            )}

            {/* Orts-Illustration (kein Charakter, z.B. Sonnenhafen) — deutlich
                größer als ein Guide-Portrait und bewusst nicht als runder
                Avatar, um den Unterschied "Ort vs. Figur" auch visuell klar
                zu machen. */}
            {locationArt && (
              <div
                className="relative z-10 mb-4 -mx-5 -mt-5 h-[260px] flex items-center justify-center overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #EAF6FB 0%, #FDF6E3 100%)' }}
              >
                <img
                  src={locationArt}
                  alt={`${arc.name} (Ort)`}
                  className="h-full w-auto object-contain"
                />
              </div>
            )}

            <div className="relative z-10 flex gap-4">
              {portrait ? (
                <img
                  src={portrait}
                  alt={arc.guide}
                  className="w-20 h-20 rounded-full object-cover object-top ring-2 ring-white shadow-sm flex-shrink-0 bg-[#EFEAE0]"
                />
              ) : (
                <span className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E0A94B] to-[#B8721E] flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
                  <span className="msym text-[32px] text-white" aria-hidden="true">{arc.icon}</span>
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">{arc.monthLabel}</span>
                  <span
                    className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${
                      arc.built ? 'text-kh-teal bg-kh-teal/15' : 'text-kh-muted bg-[#EFEAE0]'
                    }`}
                  >
                    {arc.built ? 'Gebaut' : 'Nur Teaser'}
                  </span>
                  {!portrait && (
                    <span className="text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-2 py-0.5 rounded-full">Kein Portrait</span>
                  )}
                </div>
                <h3 className="font-extrabold text-[17px] text-kh-dark leading-tight">{arc.name}</h3>
                <p className="text-[12.5px] text-kh-muted font-medium mt-0.5">{arc.guide} · {arc.focus}</p>
                <p className="text-[13px] text-kh-dark/85 italic mt-1.5 leading-snug">{arc.tagline}</p>
              </div>
            </div>

            <div className="relative z-10 mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted mb-1">Teaser (Jahresübersicht)</p>
              <p className="text-[12.5px] text-kh-dark/80 italic leading-snug">{arc.teaser}</p>
            </div>

            {builtTheme ? (
              <div className="relative z-10 mt-4 flex flex-col gap-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted">
                  Etappen-Story ({builtTheme.stages.length}) · Ziel: „{builtTheme.goalTitle}“ · Einheit: {builtTheme.stepNoun}
                </p>
                {builtTheme.stages.map((stage, i) => (
                  <div key={stage.label} className="rounded-xl bg-white/75 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="msym text-[16px] text-kh-amber" aria-hidden="true">{stage.icon}</span>
                      <span className="font-bold text-[13px] text-kh-dark">{i + 1}. {stage.label}</span>
                    </div>
                    <p className="text-[12.5px] text-kh-dark/80 leading-snug italic">{stage.story}</p>
                  </div>
                ))}
                <p className="text-[12px] text-kh-muted italic">Nudge-Beispiel (3 offen): {builtTheme.nudge(3)}</p>
              </div>
            ) : (
              <p className="relative z-10 mt-4 text-[12.5px] text-kh-muted font-medium italic">
                Noch keine Etappen-Story geschrieben — nur Teaser-Content vorhanden.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
