'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setClassGoal } from '@/app/actions/setClassGoal'
import { monthLabel } from '@/lib/date'
import SeasonJourney from '@/components/streaks/SeasonJourney'

interface Props {
  role: 'teacher' | 'student' | 'parent'
  goal: { target: number; reward: string | null } | null
  done: number
  season: string
}

export default function ClassGoalCard({ role, goal, done, season }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [target, setTarget] = useState(String(goal?.target ?? ''))
  const [reward, setReward] = useState(goal?.reward ?? '')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()
  const [infoOpen, setInfoOpen] = useState(false)

  const isTeacher = role === 'teacher'
  if (!goal && !isTeacher) return null

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

  const pct = goal ? Math.min(100, Math.round((done / goal.target) * 100)) : 0
  const reached = goal ? done >= goal.target : false

  return (
    <div className="kh-card p-5 relative overflow-hidden">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-extrabold text-base text-kh-dark flex items-center gap-1.5">
          <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          Klassenziel
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="Wie funktioniert das Klassenziel?"
            className="msym text-[15px] text-kh-muted/50 hover:text-kh-teal transition-colors"
          >
            info
          </button>
        </h2>
        <span className="text-[12px] font-semibold text-kh-muted">{monthLabel(season + '-01')}</span>
      </div>

      {!goal ? (
        editing ? (
          <GoalForm target={target} setTarget={setTarget} reward={reward} setReward={setReward} error={error} pending={pending} onSave={save} onCancel={() => setEditing(false)} />
        ) : (
          <div className="flex items-center justify-between mt-2">
            <p className="text-[13.5px] text-kh-muted font-medium">Noch kein Ziel für diesen Monat gesetzt.</p>
            <button onClick={() => setEditing(true)} className="text-[12.5px] font-bold text-kh-teal hover:opacity-70 transition-opacity flex-shrink-0">
              Ziel setzen
            </button>
          </div>
        )
      ) : editing ? (
        <GoalForm target={target} setTarget={setTarget} reward={reward} setReward={setReward} error={error} pending={pending} onSave={save} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 mt-1">
            <p className="text-[13.5px] font-semibold text-kh-dark">
              {done} von {goal.target} bestätigten HÜ
              {reached && <span className="ml-1.5">🎉</span>}
            </p>
            {isTeacher && (
              <button onClick={() => setEditing(true)} className="msym text-[16px] text-kh-muted/60 hover:text-kh-teal transition-colors flex-shrink-0">
                edit
              </button>
            )}
          </div>
          <SeasonJourney season={season} pct={pct} target={goal.target} />
          {goal.reward && (
            <p className="text-[12px] text-kh-muted font-medium mt-2 flex items-center gap-1">
              <span className="msym text-[14px]">redeem</span>
              {goal.reward}
            </p>
          )}
        </>
      )}

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setInfoOpen(false)}
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
              <button onClick={() => setInfoOpen(false)} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors flex-shrink-0">
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
                Anders als beim persönlichen Streak-Race zählt hier <strong>jeder Beitrag</strong>, egal wie lang die eigene Streak
                gerade ist — gemeinsam statt nur im Wettbewerb gegeneinander.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="Zielwert (Anzahl HÜ)"
          className="flex-1 min-w-0 text-[13.5px] font-semibold px-3 py-2 rounded-xl border border-kh-border bg-white focus:outline-none focus:border-kh-teal"
        />
      </div>
      <input
        type="text"
        value={reward}
        onChange={e => setReward(e.target.value)}
        placeholder="Belohnung (optional)"
        className="text-[13.5px] font-medium px-3 py-2 rounded-xl border border-kh-border bg-white focus:outline-none focus:border-kh-teal"
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
        {error && <span className="text-[12px] font-semibold text-kh-red">Ungültiger Wert.</span>}
      </div>
    </div>
  )
}
