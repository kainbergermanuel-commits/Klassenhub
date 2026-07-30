'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useStreakFreeze } from '@/app/actions/useStreakFreeze'
import { useTimeCrystal } from '@/app/actions/useTimeCrystal'
import { sendParentNudge } from '@/app/actions/sendParentNudge'
import { VETERAN_MILESTONE } from '@/lib/streak'
import { SPLITTER_SIGNS } from '@/lib/seasonTheme'
import { RUCKSACK_LORE, WAPPEN_TARGET, progressLabel, type RucksackState } from '@/lib/rucksack'

type ItemState = 'ready' | 'action' | 'spent' | 'locked'

const STATE_CHIP: Record<ItemState, { label: string; cls: string }> = {
  ready:  { label: 'Bereit',      cls: 'text-kh-teal bg-kh-teal/12' },
  action: { label: 'Einsetzbar',  cls: 'text-white bg-[#3D8FC7]' },
  spent:  { label: 'Verbraucht',  cls: 'text-kh-muted bg-kh-muted/12' },
  locked: { label: 'Gesperrt',    cls: 'text-kh-muted bg-kh-muted/12' },
}

/** Der Rucksack hat zwei Fächer statt eines flachen Rasters: oben die
 *  Werkzeuge (etwas größer — „was kann ich jetzt tun?" ist für ein Kind die
 *  wichtigste Frage und stand vorher zwischen passiven Anzeigen verstreut),
 *  darunter die Zeichen der Reise, ganz unten der Splitter als einziges
 *  Season-übergreifendes Objekt in voller Breite. */
export default function RucksackItems({ state }: { state: RucksackState }) {
  const { broken, jokerAvailable, jokerUsedThisSeason, crystalAvailable, crystalUsedThisSeason,
    pendingConfirmationCount, nudgeSentToday,
    veteranEarned, confirmedStreak, totalAchievements, guildName, parentConfirmStreak, nextStepHint,
    classGoalTarget, classGoalDone,
    splitterFound, awakenedSignCount } = state
  const router = useRouter()
  // Welche Item-Tooltip-Kachel offen ist (per Index) — zentral statt pro Item,
  // damit immer nur EINER gleichzeitig offen ist und ein Klick außerhalb des
  // Rucksacks alles schließt (vorher blieben Tooltips nach Klick permanent
  // offen, da jedes Item nur seinen eigenen Zustand toggelte). */
  const containerRef = useRef<HTMLDivElement>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  useEffect(() => {
    if (openIndex === null) return
    function onDocDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpenIndex(null)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [openIndex])

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const [used, setUsed] = useState(false)
  const [crystalPending, startCrystalTransition] = useTransition()
  const [crystalError, setCrystalError] = useState(false)
  const [crystalUsed, setCrystalUsed] = useState(false)
  const [nudgePending, startNudgeTransition] = useTransition()
  const [nudgeError, setNudgeError] = useState(false)
  const [nudgeSent, setNudgeSent] = useState(false)
  const [nudgeTarget, setNudgeTarget] = useState<string | null>(null)

  function activateShield() {
    setError(false)
    startTransition(async () => {
      try {
        await useStreakFreeze()
        setUsed(true)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  function activateCrystal() {
    setCrystalError(false)
    startCrystalTransition(async () => {
      try {
        await useTimeCrystal()
        setCrystalUsed(true)
        router.refresh()
      } catch {
        setCrystalError(true)
      }
    })
  }

  function activateNudge() {
    setNudgeError(false)
    startNudgeTransition(async () => {
      try {
        const { homeworkTitle } = await sendParentNudge()
        setNudgeTarget(homeworkTitle)
        setNudgeSent(true)
        router.refresh()
      } catch {
        setNudgeError(true)
      }
    })
  }

  const shieldSpent = used || jokerUsedThisSeason
  const shieldState: ItemState = broken && jokerAvailable && !used
    ? 'action'
    : shieldSpent ? 'spent' : 'ready'

  const crystalSpent = crystalUsed || crystalUsedThisSeason
  const crystalState: ItemState = broken && crystalAvailable && !crystalUsed
    ? 'action'
    : crystalSpent ? 'spent' : 'ready'

  const nudgeSpent = nudgeSent || nudgeSentToday
  const nudgeState: ItemState = pendingConfirmationCount > 0 && !nudgeSpent
    ? 'action'
    : nudgeSpent ? 'spent' : 'locked'

  const wappenEarned = totalAchievements >= WAPPEN_TARGET
  const goalReached = classGoalTarget !== null && classGoalDone >= classGoalTarget

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {/* ── Fach 1: Werkzeuge ──────────────────────────────────────────── */}
      <div>
        <FachHead icon="build">Werkzeuge</FachHead>
        <div className="grid grid-cols-2 gap-2.5">
          <Item
            isOpen={openIndex === 0}
            onToggle={() => setOpenIndex(i => (i === 0 ? null : 0))}
            state={shieldState}
            gradient={shieldState === 'action' ? 'linear-gradient(135deg, #5AB4E0, #3D8FC7)' : 'linear-gradient(135deg, #3DB5AC, #0F8A82)'}
            dimmed={shieldState === 'spent'}
            pulse={shieldState === 'action'}
            icon={
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z" fill={shieldState !== 'spent' ? 'rgba(255,255,255,.22)' : 'none'} />
              </svg>
            }
            title="Schutzschild"
            tooltip={
              <>
                <TipHead>Schutzschild</TipHead>
                <TipBody>Fängt einmal pro Season eine vergessene Hausübung ab, ohne dass deine Streak reißt. Lädt sich am Monatsanfang wieder auf.</TipBody>
                <TipOrigin item="schild" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {used ? 'Eingesetzt — Streak gerettet!'
                    : shieldState === 'action' ? 'Streak gerissen — jetzt einsetzbar.'
                    : shieldSpent ? 'Diese Season verbraucht.'
                    : '1 Ladung in Reserve.'}
                </span>
                {shieldState === 'action' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); activateShield() }}
                    disabled={pending}
                    className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#5AB4E0] to-[#3D8FC7] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <span className="msym text-[13px]">ac_unit</span>
                    Schild einsetzen
                  </button>
                )}
                {error && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Schild konnte nicht eingesetzt werden.</span>}
              </>
            }
          />

          <Item
            isOpen={openIndex === 1}
            onToggle={() => setOpenIndex(i => (i === 1 ? null : 1))}
            state={crystalState}
            gradient={crystalState === 'action' ? 'linear-gradient(135deg, #C084E8, #9C5FD1)' : 'linear-gradient(135deg, #9CA3AF, #6E7E80)'}
            dimmed={crystalState === 'spent'}
            pulse={crystalState === 'action'}
            icon={
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 4 8l8 14 8-14z" fill={crystalState !== 'spent' ? 'rgba(255,255,255,.22)' : 'none'} />
                <path d="M4 8h16M9 8l3-6 3 6" />
              </svg>
            }
            title="Zeitkristall"
            tooltip={
              <>
                <TipHead>Zeitkristall</TipHead>
                <TipBody>Verlängert einmal pro Season die Frist einer HÜ um 3 Tage, ohne dass deine Streak reißt — die Lehrkraft sieht die Verlängerung. Lädt sich am Monatsanfang wieder auf.</TipBody>
                <TipOrigin item="kristall" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {crystalUsed ? 'Eingesetzt — Frist verlängert!'
                    : crystalState === 'action' ? 'Streak gerissen — jetzt einsetzbar.'
                    : crystalSpent ? 'Diese Season verbraucht.'
                    : '1 Ladung in Reserve.'}
                </span>
                {crystalState === 'action' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); activateCrystal() }}
                    disabled={crystalPending}
                    className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#C084E8] to-[#9C5FD1] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <span className="msym text-[13px]">bolt</span>
                    Kristall einsetzen
                  </button>
                )}
                {crystalError && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Kristall konnte nicht eingesetzt werden.</span>}
              </>
            }
          />

          <Item
            isOpen={openIndex === 2}
            onToggle={() => setOpenIndex(i => (i === 2 ? null : 2))}
            state={nudgeState}
            gradient={nudgeState === 'action' ? 'linear-gradient(135deg, #F0A868, #D97B3D)' : 'linear-gradient(135deg, #9CA3AF, #6E7E80)'}
            dimmed={nudgeState !== 'action'}
            pulse={nudgeState === 'action'}
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>}
            title="Botenfeder"
            chipOverride={nudgeState === 'locked' ? { label: 'Nichts offen', cls: 'text-kh-muted bg-kh-muted/12' } : undefined}
            tooltip={
              <>
                <TipHead>Botenfeder</TipHead>
                <TipBody>Schickt einen vordefinierten Hinweis an deine Eltern, wenn eine erledigte Hausübung noch auf Bestätigung wartet — höchstens einmal am Tag.</TipBody>
                <TipOrigin item="botenfeder" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {nudgeSent ? `Erinnerung geschickt${nudgeTarget ? ` (${nudgeTarget})` : ''}!`
                    : nudgeState === 'action' ? `${pendingConfirmationCount} Hausübung${pendingConfirmationCount === 1 ? ' wartet' : 'en warten'} noch auf Bestätigung.`
                    : nudgeSpent ? 'Heute schon geschickt.'
                    : 'Gerade nichts zu erinnern.'}
                </span>
                {nudgeState === 'action' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); activateNudge() }}
                    disabled={nudgePending}
                    className="pointer-events-auto mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#F0A868] to-[#D97B3D] text-white text-[11.5px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <span className="msym text-[13px]">send</span>
                    Erinnerung schicken
                  </button>
                )}
                {nudgeError && <span className="block text-[10.5px] font-semibold text-kh-red mt-1.5">Erinnerung konnte nicht geschickt werden.</span>}
              </>
            }
          />

          <Item
            isOpen={openIndex === 3}
            onToggle={() => setOpenIndex(i => (i === 3 ? null : 3))}
            state="ready"
            gradient="linear-gradient(135deg, #3DB5AC, #0F8A82)"
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>}
            title="Kompass"
            chipOverride={{ label: 'Aktiv', cls: 'text-kh-teal bg-kh-teal/12' }}
            tooltip={
              <>
                <TipHead>Kompass des Mentors</TipHead>
                <TipBody>Zeigt dir statt eines Rangs immer nur den einen nächsten sinnvollen Schritt — Orientierung statt Vergleich.</TipBody>
                <TipOrigin item="kompass" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-teal">
                  {nextStepHint ?? 'Alles erledigt — genieß die Pause!'}
                </span>
              </>
            }
          />
        </div>
      </div>

      {/* ── Fach 2: Zeichen der Reise ──────────────────────────────────── */}
      <div>
        <FachHead icon="auto_awesome">Zeichen der Reise</FachHead>
        <div className="grid grid-cols-3 gap-2.5">
          <Item
            isOpen={openIndex === 4}
            onToggle={() => setOpenIndex(i => (i === 4 ? null : 4))}
            state={veteranEarned ? 'ready' : 'locked'}
            gradient="linear-gradient(135deg, #E0A94B, #B8721E)"
            dimmed={!veteranEarned}
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>}
            title="Meistersiegel"
            chipOverride={veteranEarned ? { label: 'Verdient', cls: 'text-kh-amber bg-kh-amber/15' } : undefined}
            tooltip={
              <>
                <TipHead>Meistersiegel</TipHead>
                <TipBody>Ab einer Streak von {VETERAN_MILESTONE} HÜ in Folge zählen deine erledigten Hausübungen automatisch — ganz ohne Bestätigung deiner Eltern. Ein Privileg, das man sich verdient.</TipBody>
                <TipOrigin item="meistersiegel" />
                <span className="block text-[11.5px] font-semibold text-kh-amber mt-1.5">
                  {veteranEarned
                    ? 'Verdient — deine Hausübungen zählen von allein.'
                    : progressLabel(confirmedStreak, VETERAN_MILESTONE, 'HÜ in Folge geschafft.', 'Das Siegel wartet am Ende einer langen Reihe.')}
                </span>
              </>
            }
          />

          <Item
            isOpen={openIndex === 5}
            onToggle={() => setOpenIndex(i => (i === 5 ? null : 5))}
            state={wappenEarned ? 'ready' : 'locked'}
            gradient="linear-gradient(135deg, #8791dd, #5965B8)"
            dimmed={!wappenEarned}
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>}
            title="Wappen-Fragment"
            chipOverride={wappenEarned ? { label: `${totalAchievements}`, cls: 'text-kh-violet bg-kh-violet/15' } : undefined}
            tooltip={
              <>
                <TipHead>Wappen-Fragment</TipHead>
                <TipBody>Jeder gesammelte Erfolg (Quest, Gilden-Quest, Klassenziel) legt ein Stück deines persönlichen Wappens frei — reiner Ausdruck, kein Wettbewerb.</TipBody>
                <TipOrigin item="wappen" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {wappenEarned
                    ? `${totalAchievements} Erfolge gesammelt.`
                    : progressLabel(totalAchievements, WAPPEN_TARGET, 'Erfolgen gesammelt.', 'Dein erster Erfolg legt das erste Stück frei.')}
                </span>
              </>
            }
          />

          {/* Bewusst nie gesperrt/grau und ohne Zielzahl: ob Eltern bestätigen,
              kann ein Kind nicht steuern. Ein Zähler „noch X Bestätigungen"
              wäre negatives Feedback für eine unkontrollierbare Ursache — und
              träfe genau die Kinder mit dem geringsten Rückhalt zuhause.
              Deshalb reines Dankeschön-Zeichen statt Fortschrittsanzeige. */}
          <Item
            isOpen={openIndex === 6}
            onToggle={() => setOpenIndex(i => (i === 6 ? null : 6))}
            state="ready"
            gradient="linear-gradient(135deg, #E285A0, #C15B76)"
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>}
            title="Verbündeten-Amulett"
            chipOverride={{
              label: parentConfirmStreak > 0 ? 'Leuchtet' : 'Ruht',
              cls: parentConfirmStreak > 0 ? 'text-[#C15B76] bg-[#C15B76]/15' : 'text-kh-muted bg-kh-muted/12',
            }}
            tooltip={
              <>
                <TipHead>Verbündeten-Amulett</TipHead>
                <TipBody>Leuchtet auf, sobald deine Verbündeten zuhause eine Hausübung bestätigen — ein Dankeschön an sie, keine Aufgabe für dich.</TipBody>
                <TipOrigin item="amulett" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {parentConfirmStreak > 0
                    ? `Zuletzt ${parentConfirmStreak}× hintereinander bestätigt.`
                    : 'Es ruht gerade — das ist völlig in Ordnung.'}
                </span>
              </>
            }
          />

          <Item
            isOpen={openIndex === 7}
            onToggle={() => setOpenIndex(i => (i === 7 ? null : 7))}
            openUpward
            state={guildName ? 'ready' : 'locked'}
            gradient="linear-gradient(135deg, #7FD3A6, #2E9C6E)"
            dimmed={!guildName}
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>}
            title="Gildenbanner"
            tooltip={
              <>
                <TipHead>Gildenbanner</TipHead>
                <TipBody>Zeigt, zu welcher Gilde du diese Season gehörst. Gilden mischen sich jeden Monat neu — niemand bleibt für immer in derselben Gruppe.</TipBody>
                <TipOrigin item="gildenbanner" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {guildName ? `Du gehörst zu: ${guildName}` : 'Deine Gilde für diese Season wird bald ausgelost.'}
                </span>
              </>
            }
          />

          {/* Das einzige kollektive Item — sieht bei allen Kindern der Klasse
              exakt gleich aus und ist damit vergleichsresistent: es gibt nichts
              zu gewinnen und nichts zu verlieren. Deckt den bestbelegten
              Gamification-Hebel (Kooperation) ab, der im Rucksack sonst fehlt. */}
          <Item
            isOpen={openIndex === 8}
            onToggle={() => setOpenIndex(i => (i === 8 ? null : 8))}
            openUpward
            state="ready"
            gradient={goalReached ? 'linear-gradient(135deg, #FFD98A, #E8A33D)' : 'linear-gradient(135deg, #F3C97B, #C98A2E)'}
            icon={<span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>wb_incandescent</span>}
            title="Laterne der Klasse"
            chipOverride={{
              label: classGoalTarget === null ? 'Ruht' : goalReached ? 'Hell' : `${classGoalDone}/${classGoalTarget}`,
              cls: 'text-kh-amber bg-kh-amber/15',
            }}
            tooltip={
              <>
                <TipHead>Laterne der Klasse</TipHead>
                <TipBody>Sie brennt vom gemeinsamen Klassenziel — und sieht bei allen in der Klasse gleich aus. Niemand trägt sie allein, niemand trägt sie besser.</TipBody>
                <TipOrigin item="laterne" />
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-amber">
                  {classGoalTarget === null
                    ? 'Gerade kein gemeinsames Ziel — die Laterne ruht.'
                    : goalReached
                      ? 'Ihr habt es gemeinsam geschafft. Sie brennt hell.'
                      : `${classGoalDone} von ${classGoalTarget} Hausübungen — gemeinsam getragen.`}
                </span>
              </>
            }
          />
        </div>
      </div>

      {/* ── Der Splitter: eigenes Feld in voller Breite ─────────────────
          Als einziges Item läuft er über alle Seasons hinweg und ist der rote
          Faden der ganzen Reise — im gleichrangigen Raster ging das unter.
          Die 7 Zeichen stehen deshalb direkt sichtbar, nicht nur im Tooltip. */}
      <div>
        <FachHead icon="diamond">Der Splitter</FachHead>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={openIndex === 9}
          aria-label={`Splitter — Details ${openIndex === 9 ? 'schließen' : 'anzeigen'}`}
          className="relative flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-3 cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-kh-teal"
          onClick={(e) => { e.stopPropagation(); setOpenIndex(i => (i === 9 ? null : 9)) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenIndex(i => (i === 9 ? null : 9)) }
            if (e.key === 'Escape' && openIndex === 9) setOpenIndex(null)
          }}
        >
          <span
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_3px_10px_rgba(20,40,45,.16)] ${splitterFound ? '' : 'opacity-45 saturate-50'}`}
            style={{ background: splitterFound ? 'linear-gradient(135deg, #F5C842, #B8721E)' : 'linear-gradient(135deg, #9CA3AF, #6E7E80)' }}
          >
            <span className="msym text-[24px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
          </span>

          <span className="flex-1 min-w-0">
            {splitterFound ? (
              <>
                <span className="flex items-center gap-1.5 flex-wrap">
                  {SPLITTER_SIGNS.map((sign, i) => {
                    const awake = i < awakenedSignCount
                    return (
                      <span
                        key={sign.label}
                        title={awake ? `${sign.label} — ${sign.worldName}` : `${sign.label} — noch nicht erwacht`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          awake ? 'bg-gradient-to-br from-[#F5C842] to-[#B8721E]' : 'bg-kh-muted/15'
                        }`}
                      >
                        <span
                          className={`msym text-[13px] ${awake ? 'text-white' : 'text-kh-muted/50'}`}
                          style={{ fontVariationSettings: `'FILL' ${awake ? 1 : 0}` }}
                        >
                          {sign.icon}
                        </span>
                      </span>
                    )
                  })}
                </span>
                <span className="block text-[11.5px] font-semibold mt-1.5 text-kh-muted">
                  {awakenedSignCount === 0
                    ? 'Noch kein Zeichen erwacht — bald geht die Reise weiter.'
                    : `${awakenedSignCount} von ${SPLITTER_SIGNS.length} Zeichen erwacht.`}
                </span>
              </>
            ) : (
              <span className="block text-[11.5px] font-semibold text-kh-muted">
                Noch nicht gefunden — irgendwo tief in einer fernen Welt.
              </span>
            )}
          </span>

          <span
            className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-max max-w-[220px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-3 text-left transition-opacity ${
              openIndex === 9 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <TipHead>Splitter</TipHead>
            <TipBody>Ein kleiner, warm leuchtender Splitter voller unlesbarer Zeichen — auf jeder Welt, die ihr hinter euch lasst, erwacht eines davon. Was er ganz zusammengesetzt verrät, weiß noch niemand.</TipBody>
            <TipOrigin item="splitter" />
          </span>
        </div>
      </div>
    </div>
  )
}

function FachHead({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 mb-2 text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">
      <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      {children}
    </p>
  )
}

function Item({
  state, gradient, dimmed, pulse, icon, title, tooltip, chipOverride, isOpen, onToggle, openUpward,
}: {
  state: ItemState
  gradient: string
  dimmed?: boolean
  pulse?: boolean
  icon: React.ReactNode
  title: string
  tooltip: React.ReactNode
  chipOverride?: { label: string; cls: string }
  /** Zentral in RucksackItems verwaltet (nicht mehr lokaler State) — sorgt
   *  dafür, dass immer nur ein Tooltip gleichzeitig offen ist und ein Klick
   *  außerhalb des Rucksacks alles schließt. */
  isOpen: boolean
  onToggle: () => void
  /** Für die unterste Zeile eines Fachs: der nach unten öffnende Tooltip
   *  stößt sonst an das `overflow-hidden` der äußeren App-Shell
   *  (app/(app)/layout.tsx) und wird dort unsichtbar abgeschnitten — betrifft
   *  Desktop UND Mobile gleich, da die Klasse nicht responsive ist. Fix: die
   *  unterste Reihe öffnet stattdessen nach oben. */
  openUpward?: boolean
}) {
  const chip = chipOverride ?? STATE_CHIP[state]

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-label={`${title} — Details ${isOpen ? 'schließen' : 'anzeigen'}`}
      className="group/item flex flex-col items-center gap-1.5 rounded-xl bg-[#FAF8F3] px-2 py-3 cursor-default text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-kh-teal"
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
        if (e.key === 'Escape' && isOpen) onToggle()
      }}
    >
      <span className="relative">
        <span
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_3px_10px_rgba(20,40,45,.16)] transition-transform group-hover/item:-translate-y-0.5 ${pulse ? 'animate-pulse' : ''} ${dimmed ? 'opacity-45 saturate-50' : ''}`}
          style={{ background: gradient }}
        >
          {icon}
        </span>

        {/* Tooltip — direkt am Icon verankert, z-50 + horizontal zentriert.
         *  Öffnet normalerweise nach unten; die unterste Raster-Reihe (siehe
         *  openUpward-Kommentar oben) öffnet stattdessen nach oben. */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-max max-w-[220px] bg-white rounded-xl shadow-[0_8px_20px_rgba(20,40,45,.22)] p-3 text-left transition-opacity ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto'
          }`}
        >
          {tooltip}
        </span>
      </span>
      <p className="w-full font-extrabold text-[11.5px] text-kh-dark leading-tight break-words hyphens-auto">{title}</p>
      <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0 ${chip.cls}`}>
        {chip.label}
      </span>
    </div>
  )
}

function TipHead({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-1">{children}</span>
}
function TipBody({ children }: { children: React.ReactNode }) {
  return <span className="block text-[12px] font-medium text-kh-dark leading-snug">{children}</span>
}
/** Herkunftszeile in der Stimme der Guide-Figur, die das Item übergeben hat —
 *  macht aus Mechanik im Fantasy-Kostüm einen Teil der Reise. */
function TipOrigin({ item }: { item: keyof typeof RUCKSACK_LORE }) {
  return (
    <span className="block text-[11px] italic text-kh-muted leading-snug mt-1.5 pl-2 border-l-2 border-kh-muted/20">
      {RUCKSACK_LORE[item].origin}
    </span>
  )
}
