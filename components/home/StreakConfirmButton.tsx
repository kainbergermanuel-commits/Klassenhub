'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  childId: string
  milestone: number
  childFirstName: string
  parentId: string
}

export default function StreakConfirmButton({ childId, milestone, childFirstName, parentId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('streak_confirmations').insert({
      student_id: childId,
      milestone,
      confirmed_by: parentId,
    })
    if (!error) {
      setConfirmed(true)
      startTransition(() => router.refresh())
    }
    setLoading(false)
  }

  if (confirmed) {
    return (
      <div className="rounded-[20px] p-4 bg-kh-teal-light border border-kh-teal/30 flex items-center gap-3">
        <span className="text-3xl">🔥</span>
        <div>
          <div className="font-extrabold text-[15px] text-kh-dark">Meilenstein bestätigt!</div>
          <div className="text-[12.5px] font-semibold text-kh-teal mt-0.5">Toll gemacht, {childFirstName}!</div>
        </div>
        <span className="msym text-kh-teal text-2xl ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] p-4 bg-[#FFF3CD] border border-[#F0C040] flex items-start gap-3">
      <span className="text-3xl flex-shrink-0">🔥</span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[15px] text-[#8A6200]">
          {childFirstName} hat {milestone} HÜ in Folge erledigt!
        </div>
        <div className="text-[12.5px] font-semibold text-[#A07800] mt-0.5 mb-3">
          Bestätige diesen Meilenstein
        </div>
        <button
          onClick={confirm}
          disabled={loading}
          className="gradient-teal text-white px-5 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? 'Wird gespeichert…' : '🎉 Meilenstein bestätigen'}
        </button>
      </div>
    </div>
  )
}
