'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmHomeworkCompletion } from '@/app/actions/confirmHomeworkCompletion'

export interface PendingConfirmation {
  homework_id: string
  student_id: string
  title: string
  subject: string
  subject_short: string
  subject_color: string
  due_date: string
}

export default function ParentHwConfirmList({ items, childFirstName }: { items: PendingConfirmation[]; childFirstName: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  if (items.length === 0) return null

  const pending = items.filter(i => !confirmed.has(i.homework_id))
  if (pending.length === 0) return null

  async function confirm(item: PendingConfirmation) {
    setLoading(item.homework_id)
    try {
      await confirmHomeworkCompletion(item.homework_id, item.student_id)
      setConfirmed(prev => new Set([...prev, item.homework_id]))
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[18px] text-kh-amber" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
        <h2 className="font-extrabold text-[14px] text-kh-dark">
          {pending.length === 1
            ? `${childFirstName} hat eine HÜ erledigt — bitte bestätigen`
            : `${childFirstName} hat ${pending.length} HÜ erledigt — bitte bestätigen`}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {pending.map(item => (
          <div key={item.homework_id} className="flex items-center gap-3 bg-[#FFFBF0] border border-[#F0C040]/50 rounded-[14px] px-3 py-2.5">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${item.subject_color}ee 0%, ${item.subject_color}99 100%)` }}
            >
              {item.subject_short}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-kh-dark truncate">{item.title}</div>
              <div className="text-[11px] font-semibold text-kh-muted mt-0.5">{item.subject}</div>
            </div>
            <button
              onClick={() => confirm(item)}
              disabled={loading === item.homework_id}
              className="flex items-center gap-1.5 gradient-teal text-white px-3 py-1.5 rounded-full text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex-shrink-0"
            >
              <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              {loading === item.homework_id ? '…' : 'Bestätigen'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
