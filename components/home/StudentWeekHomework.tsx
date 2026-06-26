'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayISO, addDaysISO } from '@/lib/date'
import type { HomeworkWithStatus } from '@/lib/types'

const TODAY = todayISO()
const TOMORROW = addDaysISO(1)

interface Props {
  homework: HomeworkWithStatus[]
  userId: string
}

function Row({ hw, userId }: { hw: HomeworkWithStatus; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [done, setDone] = useState(hw.done)
  const canToggle = hw.due_date >= TOMORROW
  const isToday = hw.due_date === TODAY

  async function toggle() {
    if (!canToggle) return
    const next = !done
    setDone(next)
    const supabase = createClient()
    if (next) {
      await supabase.from('homework_completions').upsert({ homework_id: hw.id, student_id: userId })
    } else {
      await supabase.from('homework_completions').delete().match({ homework_id: hw.id, student_id: userId })
    }
    startTransition(() => router.refresh())
  }

  const dueLabel = isToday
    ? 'Heute fällig'
    : `Fällig: ${new Date(hw.due_date).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })}`

  const statusColor = done ? 'text-kh-green' : isToday ? 'text-[#C95040]' : 'text-kh-amber'
  const statusText = done ? 'Erledigt' : dueLabel

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 overflow-hidden">
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
      >
        {hw.subject_short}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold text-[14px] truncate"
          style={{ color: done ? '#7C8A89' : '#15363F', textDecoration: done ? 'line-through' : 'none' }}
        >
          {hw.title}
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${statusColor}`}>
          <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
          {statusText} · {hw.subject}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={!canToggle}
        aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:cursor-not-allowed"
        style={done
          ? { background: '#2E9C6E' }
          : canToggle
            ? { border: '2.5px solid #CBD5D3' }
            : { border: '2.5px solid #F5D5D0' }
        }
      >
        {done && <span className="msym text-white text-[17px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>}
      </button>
    </div>
  )
}

export default function StudentOpenHomework({ homework, userId }: Props) {
  // Show only open, sorted by due_date ascending (most urgent first)
  const open = homework.filter(h => !h.done).sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-kh-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-extrabold text-base text-kh-dark">Meine Hausübungen</h2>
        <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline">Alle</Link>
      </div>
      {open.length === 0 ? (
        <p className="text-sm text-kh-muted font-medium">Alle erledigt 🎉</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {open.map(hw => <Row key={hw.id} hw={hw} userId={userId} />)}
        </div>
      )}
    </div>
  )
}
