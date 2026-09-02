'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmHomeworkCompletion, confirmAllHomeworkCompletions } from '@/app/actions/confirmHomeworkCompletion'

export interface PendingConfirmation {
  homework_id: string
  student_id: string
  title: string
  subject: string
  subject_short: string
  subject_color: string
  due_date: string
}

export default function ParentHwConfirmList({ items, childFirstName, nudgedHomeworkIds }: { items: PendingConfirmation[]; childFirstName: string; nudgedHomeworkIds?: Set<string> }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [milestone, setMilestone] = useState<number | null>(null)

  const pending = items.filter(i => !confirmed.has(i.homework_id))

  function celebrate(reachedMilestone: number | null) {
    if (!reachedMilestone) return
    setMilestone(reachedMilestone)
    setTimeout(() => setMilestone(null), 7000)
  }

  async function confirm(item: PendingConfirmation) {
    setLoading(item.homework_id)
    try {
      const { reachedMilestone } = await confirmHomeworkCompletion(item.homework_id, item.student_id)
      setConfirmed(prev => new Set([...prev, item.homework_id]))
      celebrate(reachedMilestone)
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  async function confirmAll() {
    if (pending.length === 0) return
    const studentId = pending[0].student_id
    const ids = pending.map(p => p.homework_id)
    setLoading('__all__')
    try {
      const { reachedMilestone } = await confirmAllHomeworkCompletions(ids, studentId)
      setConfirmed(prev => new Set([...prev, ...ids]))
      celebrate(reachedMilestone)
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  // Jubel-Anzeige darf bestehen bleiben, auch wenn keine offene HÜ mehr übrig ist
  if (pending.length === 0 && milestone === null) return null

  const celebration = milestone !== null && (
    <div className="animate-pop-shake mb-6 rounded-[20px] p-4 bg-kh-teal-light border border-kh-teal/30 flex items-center gap-3">
      <img src="/flame.svg" alt="" className="animate-wobble w-8 h-8 flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-extrabold text-[15px] text-kh-dark">Meilenstein erreicht! 🎉</div>
        <div className="text-[12.5px] font-semibold text-kh-teal mt-0.5">
          {childFirstName} hat {milestone} HÜ in Folge — Flamme verdient!
        </div>
      </div>
      <span className="msym text-kh-teal text-2xl ml-auto flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
    </div>
  )

  if (pending.length === 0) return <>{celebration}</>

  return (
    <div className="mb-6">
      {celebration}
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[18px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
        <h2 className="font-extrabold text-[14px] text-kh-dark min-w-0">
          {pending.length === 1
            ? `${childFirstName} hat eine HÜ erledigt — bitte bestätigen`
            : `${childFirstName} hat ${pending.length} HÜ erledigt — bitte bestätigen`}
        </h2>
        {pending.length > 1 && (
          <button
            onClick={confirmAll}
            disabled={loading !== null}
            className="ml-auto mr-3 flex items-center gap-1.5 gradient-teal text-white px-3 py-1.5 rounded-full text-[12px] font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-60 flex-shrink-0"
          >
            <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
            {loading === '__all__' ? '…' : 'Alle bestätigen'}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {pending.map(item => {
          const nudged = nudgedHomeworkIds?.has(item.homework_id)
          return (
          <div key={item.homework_id} className="flex items-center gap-3 bg-gradient-to-l from-[#FDF8EA] to-[#FDF1D6] border border-[#F0C040]/50 rounded-[14px] px-3 py-2.5">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${item.subject_color}ee 0%, ${item.subject_color}99 100%)` }}
            >
              {item.subject_short}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-[13px] text-kh-dark truncate">{item.title}</span>
                {nudged && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97B3D] bg-[#D97B3D]/12 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    <span className="msym text-[11px]">mail</span>
                    {childFirstName} bittet darum
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-kh-muted mt-0.5">{item.subject}</div>
            </div>
            <button
              onClick={() => confirm(item)}
              disabled={loading === item.homework_id}
              className="flex items-center gap-1.5 gradient-teal text-white px-3 py-1.5 rounded-full text-[12px] font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-60 flex-shrink-0"
            >
              <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              {loading === item.homework_id ? '…' : 'Bestätigen'}
            </button>
          </div>
          )
        })}
      </div>
    </div>
  )
}
