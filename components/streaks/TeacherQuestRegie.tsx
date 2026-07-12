'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { swapWeeklyQuest, resetWeeklyQuests } from '@/app/actions/manageWeeklyQuests'
import { QUEST_FOCUS_LABELS, type QuestFocusTag } from '@/lib/questVault'

export interface RegieQuest {
  key: string
  title: string
  narrative: string
  focusTag: QuestFocusTag
}

interface Props {
  activeQuests: RegieQuest[]
  allTemplates: { key: string; title: string }[]
  weekStart: string
  isOverride: boolean
}

export default function TeacherQuestRegie({ activeQuests, allTemplates, weekStart, isOverride }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function swap(oldKey: string, newKey: string) {
    if (!newKey || newKey === oldKey) return
    startTransition(async () => {
      await swapWeeklyQuest(weekStart, oldKey, newKey)
      router.refresh()
    })
  }

  function reset() {
    startTransition(async () => {
      await resetWeeklyQuests(weekStart)
      router.refresh()
    })
  }

  return (
    <div className="kh-card p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="msym text-[19px] text-kh-violet" style={{ fontVariationSettings: "'FILL' 1" }}>stadia_controller</span>
          <h2 className="font-extrabold text-base text-kh-dark">Wochen-Quests steuern</h2>
        </div>
        {isOverride && (
          <button
            onClick={reset}
            disabled={pending}
            className="text-[11.5px] font-semibold text-kh-muted hover:text-kh-teal transition-colors disabled:opacity-40 flex-shrink-0"
          >
            Automatisch wählen lassen
          </button>
        )}
      </div>
      <p className="text-[12px] text-kh-muted font-medium mb-3">
        {isOverride ? 'Manuell festgelegt für diese Woche.' : 'Automatisch gewählt — du kannst einzelne Quests tauschen.'}
      </p>

      <div className="flex flex-col gap-2">
        {activeQuests.map(q => (
          <div key={q.key} className="rounded-xl bg-[#FAF8F3] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold text-[13.5px] text-kh-dark truncate block">{q.title}</span>
                <span className="text-[11px] text-kh-muted">{QUEST_FOCUS_LABELS[q.focusTag]}</span>
              </div>
              <select
                value={q.key}
                onChange={e => swap(q.key, e.target.value)}
                disabled={pending}
                className="text-[12px] font-semibold text-kh-dark bg-white border border-kh-border rounded-lg px-2 py-1.5 flex-shrink-0 disabled:opacity-40"
              >
                {allTemplates.map(t => (
                  <option key={t.key} value={t.key}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
