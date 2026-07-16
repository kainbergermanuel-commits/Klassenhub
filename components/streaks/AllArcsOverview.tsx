'use client'

import { SCHOOL_YEAR_ARCS, GUIDE_PORTRAIT, LOCATION_ART, findBuiltTheme, ARC_STORY_DRAFTS } from '@/lib/seasonTheme'
import { SEASON_ART_SRC, SEASON_ART_POS } from '@/components/streaks/seasonArt'

/** Admin-only Vorschau: ALLE geplanten Welten des Schuljahres-Fahrplans auf
 *  einmal, unabhängig vom tatsächlichen Fortschritt der Klasse, inkl. voller
 *  Etappen-Texte. Reines Redaktions-/Kontrollwerkzeug für Lehrkräfte mit Admin-
 *  Rechten, keine neue Mechanik, keine Schüler:innen-Sicht (Prinzip 5).
 *
 *  Layout je Card: großes Welten-Bild als Hintergrund (deutlich sichtbar),
 *  darüber links die volle Guide-Figur, rechts Kopf + Etappen-Texte. */
export default function AllArcsOverview() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12.5px] text-kh-muted font-medium leading-snug -mt-1">
        Admin-Vorschau: alle {SCHOOL_YEAR_ARCS.length} Welten des Fahrplans mit vollem Etappen-Text, unabhängig vom Klassenfortschritt.
        Gebaute Welten sind live, die übrigen zeigen den fertig geschriebenen Story-Entwurf.
      </p>

      {SCHOOL_YEAR_ARCS.map(arc => {
        const seasonSrc = SEASON_ART_SRC[arc.icon]
        const seasonPos = SEASON_ART_POS[arc.icon] ?? 'center'
        const portrait = GUIDE_PORTRAIT[arc.icon]
        const locationArt = LOCATION_ART[arc.icon]
        const builtTheme = findBuiltTheme(arc.icon)
        // Gebaute Welt (aus THEMES) ODER fertig geschriebener Entwurf (ARC_STORY_DRAFTS).
        // Beide liefern goalTitle/stepNoun/stages; der Draft hat nur keine nudge-Funktion.
        const draft = ARC_STORY_DRAFTS[arc.icon]
        const story = builtTheme ?? draft ?? null

        return (
          <div key={arc.name} className="flex flex-col gap-3">
            {/* ── Story-Header: ÜBER der Card, reine Typografie, kein Glas-Panel ── */}
            <div className="px-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">{arc.monthLabel}</span>
                <span
                  className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${
                    arc.built ? 'text-kh-teal bg-kh-teal/15' : 'text-kh-muted bg-[#EFEAE0]'
                  }`}
                >
                  {arc.built ? 'Gebaut' : 'Nur Teaser'}
                </span>
                {!portrait && !locationArt && (
                  <span className="text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-2 py-0.5 rounded-full">Kein Portrait</span>
                )}
              </div>
              <h3 className="font-extrabold text-[21px] text-kh-dark leading-tight">{arc.name}</h3>
              <p className="text-[13px] text-kh-muted font-semibold mt-1">{arc.guide} · {arc.focus}</p>
              <p className="text-[13.5px] text-kh-dark/85 italic mt-1.5 leading-snug">{arc.tagline}</p>
              <p className="text-[12px] text-kh-dark/70 leading-snug mt-1.5">
                <span className="font-bold text-kh-muted">Teaser: </span>{arc.teaser}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl kh-card p-5">
              {/* ── Hintergrund ─────────────────────────────────────────────── */}
              {locationArt ? (
                // Orts-Illustration (kein Charakter, z.B. Sonnenhafen): Freisteller,
                // object-contain rechts, sanfter Verlauf dahinter.
                <div
                  className="absolute inset-0 pointer-events-none select-none"
                  style={{ background: 'linear-gradient(180deg, #EAF6FB 0%, #FDF6E3 45%, #FDF6E3 100%)' }}
                >
                  <img
                    src={locationArt}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ objectPosition: 'right center', transform: 'scale(1.12)', transformOrigin: 'right center' }}
                  />
                </div>
              ) : seasonSrc && (
                // Welten-Bild als Vollflächen-Hintergrund. Bewusst höhere Deckkraft
                // (0.9) als die geteilte SEASON_ART-Optik (0.55) — hier soll das Bild
                // klar sichtbar sein. Nur ein leichter Verlauf unten für Zusammenhalt;
                // die Etappen-Textkarten darunter sind bewusst transparent gehalten.
                <div className="absolute inset-0 pointer-events-none select-none">
                  <img
                    src={seasonSrc}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.9, objectPosition: seasonPos }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, rgba(251,249,243,0) 0%, rgba(251,249,243,0.18) 70%, rgba(251,249,243,0.35) 100%)' }}
                  />
                </div>
              )}

              {/* ── Inhalt: Figur links (groß), Etappen-Texte rechts ────────── */}
              <div className="relative z-10 flex gap-4">
                {/* Volle Guide-Figur (nicht rundes Portrait) im linken Bereich,
                    deutlich größer als ein Portrait. sticky, damit sie bei langen
                    Etappenlisten mitwandert. */}
                {!locationArt && portrait && (
                  <div className="w-[170px] md:w-[220px] flex-shrink-0 self-stretch">
                    <img
                      src={portrait}
                      alt={arc.guide}
                      className="sticky top-4 w-full max-h-[80vh] object-contain object-bottom drop-shadow-[0_8px_16px_rgba(20,40,45,.35)]"
                    />
                  </div>
                )}
                {/* Für Welten ohne Figur und ohne Ortsbild (Fallback): Icon-Kachel. */}
                {!locationArt && !portrait && (
                  <span className="w-[90px] h-[90px] rounded-2xl bg-gradient-to-br from-[#E0A94B] to-[#B8721E] flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm self-start">
                    <span className="msym text-[38px] text-white" aria-hidden="true">{arc.icon}</span>
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  {/* Etappen-Texte */}
                  {story ? (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-kh-dark/70 bg-white/35 rounded-md px-2 py-1 inline-block w-fit">
                        {builtTheme ? 'Etappen-Story' : 'Etappen-Story (Entwurf, noch nicht live)'} ({story.stages.length}) · Ziel: „{story.goalTitle}“ · Einheit: {story.stepNoun}
                      </p>
                      {story.stages.map((stage, i) => (
                        <div key={stage.label} className="rounded-xl bg-white/55 backdrop-blur-sm p-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="msym text-[16px] text-kh-amber" aria-hidden="true">{stage.icon}</span>
                            <span className="font-bold text-[13px] text-kh-dark">{i + 1}. {stage.label}</span>
                          </div>
                          <p className="text-[12.5px] text-kh-dark/80 leading-snug italic">{stage.story}</p>
                        </div>
                      ))}
                      {builtTheme && (
                        <p className="text-[12px] text-kh-dark/70 italic bg-white/35 rounded-md px-2 py-1 w-fit">Nudge-Beispiel (3 offen): {builtTheme.nudge(3)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-kh-dark/75 font-medium italic bg-white/45 rounded-md px-2.5 py-1.5 w-fit">
                      Noch keine Etappen-Story geschrieben, nur Teaser-Content vorhanden.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
