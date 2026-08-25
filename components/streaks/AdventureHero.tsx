'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { setClassGoal } from '@/app/actions/setClassGoal'
import { monthLabel } from '@/lib/date'
import { getSeasonTheme, currentStageIndex, GUIDE_PORTRAIT } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'

interface Props {
  season: string
  role: 'teacher' | 'student' | 'parent'
  /** `isSuggested` = berechneter Vorschlag statt gesetztem Ziel (siehe
   *  lib/classGoal.ts). Wird als Chip gekennzeichnet; speichert die Lehrperson
   *  ein echtes Ziel, verschwindet der Chip ohne weiteren Sonderfall. */
  goal: { target: number; reward: string | null; isSuggested?: boolean } | null
  done: number
}

/** Der eine Welt-Einstieg der Abenteuer-Seite: SEASON_ART-Hintergrund,
 *  Guide-Portrait, Titel UND die Klassenreise (Etappen + Story + Ziel) in
 *  einer Card — vorher waren Header und Klassenziel-Card zwei Banner mit
 *  demselben Berg-Motiv. Die Reise-Inhalte liegen auf einem Glas-Panel
 *  (Story-Art-Glas-Muster), damit sie über dem Artwork lesbar bleiben.
 *  Der interne Begriff "Klassenziel" bleibt als stabiler Anker sichtbar. */
export default function AdventureHero({ season, role, goal, done }: Props) {
  const router = useRouter()
  const theme = getSeasonTheme(season)
  const Art = SEASON_ART[theme.icon]
  const portrait = GUIDE_PORTRAIT[theme.icon]
  // Kurzname für Chips ("Vala?") — letztes Wort, nicht der Titel davor
  // ("Bergführerin?" wäre die Rolle, nicht die Figur).
  const guideShort = theme.guide.split(' ').pop()

  const [guideInfoOpen, setGuideInfoOpen] = useState(false)
  const [goalInfoOpen, setGoalInfoOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [target, setTarget] = useState(String(goal?.target ?? ''))
  const [reward, setReward] = useState(goal?.reward ?? '')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const isTeacher = role === 'teacher'
  const pct = goal ? Math.min(100, Math.round((done / goal.target) * 100)) : 0
  const reached = goal ? done >= goal.target : false
  const activeStage = goal ? currentStageIndex(pct, theme.stages.length) : 0
  // Epilog-Welt (Sonnenhafen): ein Ort zum Ankommen, kein Monat mit Zielwert.
  // Kein Fortschrittsbalken, keine Etappen-Leiste, nur der Text.
  const isEpilogue = !!theme.isEpilogue
  // Etappen-Tooltip „X von Y": bei einer Ein-Etappen-Welt wäre der Nenner 0
  // und der Wert NaN. Der Guard hält den Fall auch dann sauber, wenn eine
  // künftige Welt mit weniger als zwei Etappen scharfgeschaltet wird.
  const stageDenominator = Math.max(1, theme.stages.length - 1)

  function save() {
    const parsed = Number(target)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError(true)
      return
    }
    setError(false)
    startTransition(async () => {
      try {
        await setClassGoal(season, parsed, reward)
        setEditing(false)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  return (
    <>
      <div className="relative mb-6 flex items-stretch rounded-2xl shadow-[0_8px_16px_rgba(20,40,45,.10)]">
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#EFEAE0] to-[#FAF8F3]">
          {Art && (
            <div className="absolute inset-0 pointer-events-none select-none">
              <Art />
            </div>
          )}
        </div>

        {/* Guide-Portrait — volle Card-Höhe, unten verankert, Füße ragen bewusst
            unten und links über den Rand. Auf Mobile ausgeblendet (das hohe
            Glas-Panel würde die Figur klein und verloren wirken lassen, und der
            Platz fehlt dem Titel). */}
        {portrait ? (
          <div className="relative z-10 -ml-2.5 w-[17%] min-w-[64px] max-w-[150px] flex-shrink-0 self-stretch pointer-events-none max-md:hidden">
            <img
              src={portrait}
              alt={theme.guide}
              className="absolute bottom-[-24px] left-[-8px] w-[125%] max-h-[290px] h-[calc(100%+24px)] object-contain object-left-bottom"
            />
          </div>
        ) : (
          <div className="relative z-10 w-4 flex-shrink-0 max-md:hidden" />
        )}

        <div className="relative z-10 flex-1 min-w-0 pr-4 pb-4 pt-4 max-md:px-4">
          {/* max-md:pr-12 — oben rechts sitzt auf Mobile der fixe Hamburger-
              Button des MobileHeaders, der Guide-Chip darf nicht darunter. */}
          <div className="flex items-start justify-between gap-2 mb-3 max-md:pr-12">
            <div className="min-w-0">
              <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">Abenteuer</h1>
              <p className="text-[13px] text-kh-dark/70 font-semibold leading-tight mt-0.5">
                {theme.name} · Begleitet von {theme.guide}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuideInfoOpen(true)}
              className="flex items-center gap-1 rounded-full bg-white/70 backdrop-blur-sm pl-2 pr-2.5 py-1 mt-1 text-[10.5px] font-bold text-kh-muted shadow-sm hover:bg-white transition-colors flex-shrink-0"
            >
              <span className="msym text-[14px] text-kh-teal" aria-hidden="true">info</span>
              {guideShort}?
            </button>
          </div>

          {/* Glas-Panel: die Reise der Klasse (Etappen + Story + Ziel). Ohne
              gesetztes Ziel greift ein berechneter Vorschlag, damit die
              Erzählebene nie ausfällt; die Epilog-Welt zeigt nur den Text. */}
          {(goal || isTeacher || isEpilogue) && (
            <div className="rounded-2xl bg-white/55 backdrop-blur-[3px] px-4 pt-3.5 pb-4">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <h2 className="font-extrabold text-[15px] text-kh-dark flex items-center gap-1.5 min-w-0">
                  <span className="msym text-[17px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                  <span className="min-w-0 md:truncate">{theme.goalTitle}</span>
                  {!isEpilogue && (
                    <button
                      onClick={() => setGoalInfoOpen(true)}
                      aria-label="Wie funktioniert das Klassenziel?"
                      className="msym text-[15px] text-kh-muted/60 hover:text-kh-teal transition-colors flex-shrink-0"
                    >
                      info
                    </button>
                  )}
                </h2>
                <span className="text-[11.5px] font-semibold text-kh-muted flex-shrink-0 whitespace-nowrap">
                  {!isEpilogue && <span className="max-md:hidden">Klassenziel · </span>}{monthLabel(season + '-01')}
                </span>
              </div>

              {isEpilogue ? (
                // Sommerferien: kein Ziel, keine Etappen, nur ankommen.
                <p className="mt-2 text-[12.5px] text-kh-dark/80 italic leading-snug border-l-2 border-[#E8A020]/50 pl-3">
                  {theme.stages[0].story}
                </p>
              ) : !goal || editing ? (
                editing ? (
                  <GoalForm target={target} setTarget={setTarget} reward={reward} setReward={setReward} error={error} pending={pending} onSave={save} onCancel={() => setEditing(false)} />
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[13px] text-kh-muted font-medium">Noch kein Ziel für diesen Monat gesetzt.</p>
                    <button onClick={() => setEditing(true)} className="text-[12.5px] font-bold text-kh-teal hover:opacity-70 transition-opacity flex-shrink-0">
                      Ziel setzen
                    </button>
                  </div>
                )
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3.5">
                    <p className="text-[13px] font-semibold text-kh-dark">
                      {done} von {goal.target} {theme.stepNoun}
                      <span className="text-kh-muted font-medium"> · bestätigte HÜ</span>
                      {reached && <span className="ml-1.5">🎉</span>}
                      {goal.isSuggested && (
                        <span
                          title={isTeacher
                            ? 'Für diesen Monat ist noch kein Ziel gesetzt. Bis dahin schlägt KlassenHub eines vor, damit die Reise weiterläuft. Tippe auf den Stift, um ein eigenes zu setzen.'
                            : 'Für diesen Monat steht noch kein festes Ziel. So lange gilt ein Vorschlag.'}
                          className="ml-2 align-middle text-[9.5px] font-extrabold text-kh-muted bg-kh-muted/12 px-1.5 py-0.5 rounded-full cursor-default"
                        >
                          Vorschlag
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isTeacher && (
                        <button onClick={() => setEditing(true)} aria-label="Klassenziel bearbeiten" className="msym text-[16px] text-kh-muted/60 hover:text-kh-teal transition-colors">
                          edit
                        </button>
                      )}
                      <Link href="/streaks/reise" className="text-[11.5px] font-bold text-kh-teal hover:opacity-70 transition-opacity flex items-center gap-0.5">
                        Die Reise
                        <span className="msym text-[14px]">chevron_right</span>
                      </Link>
                    </div>
                  </div>

                  {/* Etappen-Leiste */}
                  <div className="relative flex items-center">
                    <div className="absolute left-0 right-0 h-1 rounded-full bg-[#E4DCC9] top-1/2 -translate-y-1/2" />
                    <div
                      className="absolute left-0 h-1 rounded-full bg-gradient-to-r from-[#B8721E] to-[#F5C842] top-1/2 -translate-y-1/2 transition-all duration-700"
                      style={{ width: `${((activeStage + 0.5) / theme.stages.length) * 100}%` }}
                    />
                    {theme.stages.map((stage, i) => {
                      const stageReached = i <= activeStage
                      const isCurrent = i === activeStage
                      const stageHw = Math.round((i / stageDenominator) * goal.target)
                      return (
                        <div key={stage.label} className="relative flex-1 min-w-0 flex flex-col items-center gap-1.5 px-0.5">
                          <div className="group relative">
                            <div
                              className={`msym flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0 cursor-default ${
                                isCurrent ? 'w-8 h-8 text-[17px] md:w-9 md:h-9 md:text-[19px]' : 'w-6 h-6 text-[13px] md:w-7 md:h-7 md:text-[15px]'
                              }`}
                              style={{
                                background: stageReached ? 'linear-gradient(135deg, #E8A020 0%, #F5C842 100%)' : '#fff',
                                color: stageReached ? '#fff' : '#B8AF9C',
                                border: stageReached ? 'none' : '1.5px solid #E4DCC9',
                                fontVariationSettings: `'FILL' ${stageReached ? 1 : 0}`,
                                boxShadow: isCurrent ? '0 4px 10px rgba(184,114,30,.35)' : 'none',
                              }}
                            >
                              {stage.icon}
                            </div>

                            <div className="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 mb-2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-10 whitespace-nowrap">
                              <div className="bg-kh-dark text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg">
                                {stage.label} · {stageHw} von {goal.target} {theme.stepNoun}
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-kh-dark" />
                            </div>
                          </div>
                          <span className={`w-full text-[9px] md:text-[10.5px] font-semibold text-center leading-[1.15] break-words ${stageReached ? 'text-kh-dark' : 'text-kh-muted/60'} ${isCurrent ? '' : 'max-md:hidden'}`}>
                            {stage.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <p className="mt-3.5 text-[12.5px] text-kh-dark/80 italic leading-snug border-l-2 border-[#E8A020]/50 pl-3">
                    {theme.stages[activeStage].story}
                  </p>

                  {goal.reward && (
                    <p className="text-[12px] text-kh-muted font-medium mt-2.5 flex items-center gap-1">
                      <span className="msym text-[14px]">redeem</span>
                      {goal.reward}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {guideInfoOpen && <GuideInfoOverlay theme={theme} onClose={() => setGuideInfoOpen(false)} />}

      {goalInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setGoalInfoOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-extrabold text-kh-dark flex items-center gap-1.5">
                <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                Wie funktioniert das Klassenziel?
              </h3>
              <button onClick={() => setGoalInfoOpen(false)} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors flex-shrink-0">
                close
              </button>
            </div>
            <div className="flex flex-col gap-3 text-[13.5px] text-kh-dark/90 leading-snug">
              <p>
                Jede von den Eltern <strong>bestätigte</strong> Hausübung zählt nicht nur für die eigene Streak, sondern auch auf ein
                gemeinsames <strong>Ziel der ganzen Klasse</strong> ein.
              </p>
              <p>
                Die Lehrperson legt den Zielwert für den Monat fest (und optional eine Belohnung). Der Fortschritt wird als Reise mit
                mehreren Etappen dargestellt — je mehr HÜ bestätigt sind, desto weiter kommt die Klasse.
              </p>
              <p>
                Je nach Welt trägt die Reise einen anderen Namen ({theme.goalTitle}) — dahinter steckt immer dasselbe Klassenziel.
                Und anders als beim persönlichen Streak zählt hier <strong>jeder Beitrag</strong> — gemeinsam statt im Wettbewerb
                gegeneinander.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function GoalForm({ target, setTarget, reward, setReward, error, pending, onSave, onCancel }: {
  target: string
  setTarget: (v: string) => void
  reward: string
  setReward: (v: string) => void
  error: boolean
  pending: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        type="number"
        min={1}
        value={target}
        onChange={e => setTarget(e.target.value)}
        placeholder="Zielwert (Anzahl HÜ)"
        className="text-base md:text-[13.5px] font-semibold px-3 py-2 rounded-xl border border-kh-border bg-white focus:outline-none focus:border-kh-teal"
      />
      <input
        type="text"
        value={reward}
        onChange={e => setReward(e.target.value)}
        placeholder="Belohnung (optional)"
        className="text-base md:text-[13.5px] font-medium px-3 py-2 rounded-xl border border-kh-border bg-white focus:outline-none focus:border-kh-teal"
      />
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={onSave}
          disabled={pending}
          className="px-4 py-1.5 rounded-full gradient-teal text-white text-[12.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Speichern
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-semibold text-kh-muted hover:text-kh-dark transition-colors">
          Abbrechen
        </button>
        {error && <span className="text-[12px] font-semibold text-kh-red">Konnte nicht gespeichert werden — Zielwert prüfen.</span>}
      </div>
    </div>
  )
}
