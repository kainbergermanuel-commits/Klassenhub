import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveAuth } from '@/lib/previewAuth'
import { todayISO, lastDayOfMonthISO, lastDayOfPrevMonthISO, firstDayOfPrevMonthISO, daysUntil } from '@/lib/date'
import { computeStreak, currentMilestone, confirmedStreak, MILESTONES } from '@/lib/streak'
import StreakOverview from '@/components/streaks/StreakOverview'

export default async function StreaksPage() {
  const { user, profile, activeClassId } = await getEffectiveAuth()
  if (!user) redirect('/login')
  if (!activeClassId) redirect('/')

  const supabase = await createClient()
  const today = todayISO()
  const monthEnd = lastDayOfMonthISO()
  const prevMonthEnd = lastDayOfPrevMonthISO()
  const prevMonthStart = firstDayOfPrevMonthISO()
  const daysLeft = daysUntil(monthEnd) + 1 // +1: endet zu Mitternacht des letzten Tags

  const [
    { data: students },
    { data: allHwDesc },
    { data: confirmations },
  ] = await Promise.all([
    supabase.from('profiles').select('id,full_name,avatar_color,avatar_seed,avatar_hair_color,avatar_skin_color').eq('class_id', activeClassId).eq('role', 'student').order('full_name'),
    supabase.from('homework').select('id,due_date').eq('class_id', activeClassId).order('due_date', { ascending: false }),
    supabase.from('streak_confirmations').select('student_id,milestone,confirmed_by,confirmed_at').in(
      'student_id',
      (await supabase.from('profiles').select('id').eq('class_id', activeClassId).eq('role', 'student')).data?.map(s => s.id) ?? []
    ),
  ])

  const allHwIds = (allHwDesc ?? []).map(h => h.id)
  const { data: allCompletions } = allHwIds.length > 0
    ? await supabase.from('homework_completions').select('homework_id,student_id').in('homework_id', allHwIds)
    : { data: [] }

  // Build doneIds per student
  const doneByStudent = new Map<string, Set<string>>()
  for (const c of allCompletions ?? []) {
    if (!doneByStudent.has(c.student_id)) doneByStudent.set(c.student_id, new Set())
    doneByStudent.get(c.student_id)!.add(c.homework_id)
  }

  // Confirmed milestone lookup: student_id → Set<milestone>
  const confirmedByStudent = new Map<string, Set<number>>()
  for (const c of confirmations ?? []) {
    if (!confirmedByStudent.has(c.student_id)) confirmedByStudent.set(c.student_id, new Set())
    confirmedByStudent.get(c.student_id)!.add(c.milestone)
  }

  // Build per-student data
  const allConfirmationsArr = (confirmations ?? []) as { student_id: string; milestone: number; confirmed_by: string; confirmed_at: string }[]
  const studentData = (students ?? []).map(s => {
    const doneIds = doneByStudent.get(s.id) ?? new Set<string>()
    const actualStreak = computeStreak(doneIds, allHwDesc ?? [], today)
    const confirmedMilestones = confirmedByStudent.get(s.id) ?? new Set<number>()
    const displayStreak = confirmedStreak(s.id, allConfirmationsArr)

    // Pending: current milestone threshold not yet confirmed
    const milestone = currentMilestone(actualStreak)
    const pendingMilestone = actualStreak >= 5 && milestone > 0 && !confirmedMilestones.has(milestone) ? milestone : null

    // All confirmed milestone records for this student (for history)
    const studentConfirmations = allConfirmationsArr
      .filter(c => c.student_id === s.id)
      .sort((a, b) => b.milestone - a.milestone)

    return {
      id: s.id,
      full_name: s.full_name,
      avatar_color: s.avatar_color ?? '#0F8A82',
      avatar_seed: s.avatar_seed ?? null,
      avatar_hair_color: s.avatar_hair_color ?? null,
      avatar_skin_color: s.avatar_skin_color ?? null,
      streak: displayStreak,
      pendingMilestone,
      confirmedMilestones: studentConfirmations,
    }
  })

  // ─── VORMONAT-RANGLISTE ──────────────────────────────────────────────────────
  const prevMonthHw = (allHwDesc ?? []).filter(h => h.due_date >= prevMonthStart && h.due_date <= prevMonthEnd)
  const prevMonthHwIds = prevMonthHw.map(h => h.id)
  let prevRace: Array<{ id: string; full_name: string; avatar_color: string; avatar_seed: string | null; avatar_hair_color: string | null; avatar_skin_color: string | null; streak: number }> = []
  if (prevMonthHwIds.length > 0) {
    const { data: prevCompletions } = await supabase
      .from('homework_completions').select('homework_id,student_id').in('homework_id', prevMonthHwIds)
    const doneByStudentPrev = new Map<string, Set<string>>()
    for (const c of prevCompletions ?? []) {
      if (!doneByStudentPrev.has(c.student_id)) doneByStudentPrev.set(c.student_id, new Set())
      doneByStudentPrev.get(c.student_id)!.add(c.homework_id)
    }
    prevRace = (students ?? [])
      .map(s => ({
        id: s.id,
        full_name: s.full_name,
        avatar_color: s.avatar_color ?? '#0F8A82',
        avatar_seed: s.avatar_seed ?? null,
        avatar_hair_color: s.avatar_hair_color ?? null,
        avatar_skin_color: s.avatar_skin_color ?? null,
        streak: computeStreak(doneByStudentPrev.get(s.id) ?? new Set(), prevMonthHw, prevMonthEnd),
      }))
      .filter(s => s.streak > 0)
      .sort((a, b) => b.streak - a.streak)
  }

  // Sort: by streak desc
  const withStreak = studentData
    .filter(s => s.streak > 0)
    .sort((a, b) => b.streak - a.streak)
  const noStreak = studentData.filter(s => s.streak === 0)

  // Group confirmed milestones by month (for history section)
  const milestoneHistory: Record<string, Array<{ studentName: string; milestone: number; confirmed_at: string }>> = {}
  for (const c of confirmations ?? []) {
    const student = (students ?? []).find(s => s.id === c.student_id)
    if (!student) continue
    const month = c.confirmed_at.slice(0, 7) // "2026-06"
    if (!milestoneHistory[month]) milestoneHistory[month] = []
    milestoneHistory[month].push({
      studentName: student.full_name,
      milestone: c.milestone,
      confirmed_at: c.confirmed_at,
    })
  }

  return (
    <StreakOverview
      role={profile.role}
      withStreak={withStreak}
      noStreak={noStreak}
      milestoneHistory={milestoneHistory}
      daysLeft={daysLeft}
      prevRace={prevRace}
      prevMonthLabel={prevMonthEnd.slice(0, 7)}
    />
  )
}
