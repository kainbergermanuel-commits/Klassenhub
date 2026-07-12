'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getSeasonTheme } from '@/lib/seasonTheme'
import { chooseQuestPath } from '@/app/actions/chooseQuestPath'
import type { QuestResult } from '@/lib/quests'

interface Props {
  quests: QuestResult[]
  weekStart: string
  season: string
}

function ChoiceButtons({ questKey, weekStart, choices }: { questKey: string; weekStart: string; choices: NonNullable<QuestResult['template']['choices']> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(choiceKey: string) {
    startTransition(async () => {
      await chooseQuestPath(weekStart, questKey, choiceKey)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {choices.map(c => (
        <button
          key={c.key}
          onClick={() => choose(c.key)}
          disabled={pending}
          className="flex items-center justify-between gap-2 text-left rounded-xl bg-white border border-kh-border/60 px-3 py-2 hover:border-kh-teal transition-colors disabled:opacity-50"
        >
          <span className="min-w-0">
            <span className="block font-semibold text-[13px] text-kh-dark">{c.label}</span>
            <span className="block text-[11.5px] text-kh-muted">{c.narrative}</span>
          </span>
          <span className="msym text-[16px] text-kh-teal flex-shrink-0">chevron_right</span>
        </button>
      ))}
    </div>
  )
}

export default function WeeklyQuestCard({ quests, weekStart, season }: Props) {
  if (quests.length === 0) return null
  const theme = getSeasonTheme(season)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
        <h2 className="font-extrabold text-base text-kh-dark">Wochen-Quests</h2>
        <span className="text-[12px] font-semibold text-kh-muted ml-auto">{theme.guide}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {quests.map(q => {
          const narrative = q.template.narrative.replace('{guide}', theme.guide)
          return (
            <div key={q.template.key} className="rounded-xl bg-[#FAF8F3] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`msym text-[18px] flex-shrink-0 ${q.done ? 'text-kh-green' : 'text-kh-muted/50'}`}
                  style={{ fontVariationSettings: `'FILL' ${q.done ? 1 : 0}` }}
                >
                  {q.done ? 'task_alt' : 'radio_button_unchecked'}
                </span>
                <span className="font-semibold text-[14px] text-kh-dark truncate">{q.template.title}</span>
              </div>
              <p className="text-[12px] text-kh-muted mt-1 pl-[26px]">{narrative}</p>

              {q.needsChoice && q.template.choices && (
                <div className="pl-[26px]">
                  <ChoiceButtons questKey={q.template.key} weekStart={weekStart} choices={q.template.choices} />
                </div>
              )}

              {!q.needsChoice && q.parts.length > 0 && (
                <div className="flex flex-col gap-1 mt-2 pl-[26px]">
                  {q.parts.map(p => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="text-[11px] text-kh-muted flex-1 truncate">{p.label}</span>
                      <div className="w-16 h-1.5 rounded-full bg-kh-border/50 overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full bg-kh-teal transition-[width] duration-500"
                          style={{ width: `${(p.progress.current / p.progress.target) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10.5px] font-bold text-kh-muted flex-shrink-0 w-9 text-right">
                        {p.progress.current}/{p.progress.target}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
