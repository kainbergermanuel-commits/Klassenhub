'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import HomeworkCard from './HomeworkCard'
import HomeworkDetails from './HomeworkDetails'
import HomeworkStatsCard from './HomeworkStatsCard'
import AddHomeworkModal from './AddHomeworkModal'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { dueInfo, todayISO, monthLabel, isOver, isActionable } from '@/lib/date'
import { dueDateFor } from '@/lib/homework'
import type { HomeworkWithStatus, Role, SpecialRole } from '@/lib/types'
import type { SubjectOption } from '@/lib/subjectsCatalog'

type StatusFilter = 'all' | 'open' | 'done' | 'missed'

interface Props {
  homework: HomeworkWithStatus[]
  role: Role
  specialRole?: SpecialRole | null
  userId: string
  classId: string
  subtitle: string
  stats?: { open: number; done: number; missed: number }
  studentCount?: number
  subjects: SubjectOption[]
  /** Nur für Eltern: ID des verknüpften Kindes (für den Bestätigen-Knopf). */
  childId?: string | null
}

export default function HomeworkList({ homework, role, specialRole, userId, classId, subtitle, stats, studentCount, subjects, childId }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [listError, setListError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

  const canCreate = role === 'teacher' || specialRole === 'hw_admin'
  const asPending = role !== 'teacher'

  async function confirmHomework(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('homework').update({ status: 'published' }).eq('id', id)
    if (error) { setListError('Bestätigen fehlgeschlagen. Bitte erneut versuchen.'); return }
    setListError(null)
    router.refresh()
  }

  /** Eingereichte HÜ ablehnen. Die Delete-Policy erlaubt das für Lehrpersonen
   *  längst, es fehlte nur der Knopf — eine versehentliche Einreichung blieb
   *  sonst dauerhaft im Posteingang stehen. */
  async function rejectHomework(hw: HomeworkWithStatus) {
    const ok = await confirm({
      title: 'Einreichung ablehnen?',
      message: `„${hw.title}" wird verworfen und nicht an die Klasse ausgespielt.`,
      confirmLabel: 'Ablehnen',
      tone: 'danger',
      icon: 'delete',
    })
    if (!ok) return
    const supabase = createClient()
    const { error } = await supabase.from('homework').delete().eq('id', hw.id)
    if (error) { setListError('Ablehnen fehlgeschlagen. Bitte erneut versuchen.'); return }
    setListError(null)
    router.refresh()
  }

  const today = todayISO()
  const pending = homework.filter(h => h.status === 'pending')
  // Eigene, noch nicht freigegebene Einreichungen. Für Lehrpersonen läuft das
  // über den Posteingang oben; alle anderen sahen ihre eingereichte HÜ bisher
  // gar nicht mehr (die Read-Policy gab nur `published` frei).
  const ownPending = role !== 'teacher' ? pending.filter(h => h.created_by === userId) : []
  const publishedAll = homework.filter(h => h.status === 'published')

  const subjectOptions = useMemo(() => {
    const byName = new Map<string, string>()
    for (const h of publishedAll) byName.set(h.subject, h.subject_color)
    return Array.from(byName, ([name, color]) => ({ name, color })).sort((a, b) => a.name.localeCompare(b.name))
  }, [publishedAll])

  const published = useMemo(() => {
    return publishedAll.filter(h => {
      if (subjectFilter !== 'all' && h.subject !== subjectFilter) return false
      if (statusFilter === 'all') return true
      if (role === 'teacher') {
        // Lehrer haben kein persönliches "erledigt" — Status richtet sich rein nach Fälligkeit.
        return statusFilter === 'missed' ? isOver(dueDateFor(h), today) : isActionable(dueDateFor(h), today)
      }
      if (statusFilter === 'done') return h.done
      if (statusFilter === 'missed') return !h.done && isOver(dueDateFor(h), today)
      return !h.done && isActionable(dueDateFor(h), today) // open
    })
  }, [publishedAll, subjectFilter, statusFilter, today, role])

  const open = published
    .filter(h => isActionable(dueDateFor(h), today))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return a.due_date.localeCompare(b.due_date)
    })
  const past = published.filter(h => isOver(dueDateFor(h), today)).sort((a, b) => b.due_date.localeCompare(a.due_date))

  // Group past by month (most recent first)
  const pastGroups: { label: string; items: HomeworkWithStatus[] }[] = []
  for (const hw of past) {
    const label = monthLabel(hw.due_date)
    const last = pastGroups[pastGroups.length - 1]
    if (last && last.label === label) {
      last.items.push(hw)
    } else {
      pastGroups.push({ label, items: [hw] })
    }
  }

  const hasFilters = subjectOptions.length > 1 || publishedAll.length > 3

  return (
    <>
      {dialog}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 max-md:w-10 max-md:h-10 rounded-2xl gradient-amber shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0">
            <span className="msym text-[24px] max-md:text-[22px] text-white">assignment</span>
          </div>
          <div>
          <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight">Hausübungen</h1>
          <p className="text-[13.5px] text-kh-muted font-medium mt-0.5">{subtitle}</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="max-md:hidden flex items-center gap-2 gradient-teal text-white px-[17px] py-[11px] rounded-full font-bold text-sm hover:brightness-105 transition-[filter,opacity] duration-150 tap"
          >
            <span className="msym text-[19px]">add</span>
            Neue Hausübung
          </button>
        )}
      </div>

      {/* Schwebender „Neue HÜ"-Button unter dem Burger (nur Mobile) */}
      {canCreate && (
        <button
          onClick={() => setShowModal(true)}
          className="md:hidden fixed top-[68px] right-4 z-30 w-11 h-11 flex items-center justify-center rounded-2xl gradient-teal text-white shadow-[0_2px_10px_rgba(20,40,45,.18)] active:scale-95 transition-transform"
          aria-label="Neue Hausübung"
        >
          <span className="msym text-[23px]">assignment_add</span>
        </button>
      )}

      {homework.length === 0 ? (
        <div className="text-center text-kh-muted py-16 font-medium">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">assignment</span>
          Keine Hausübungen vorhanden.
        </div>
      ) : (
        <div className={stats ? 'lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-5' : undefined}>
        <div className="flex flex-col gap-6 min-w-0">
          {/* Statistik auf Mobile über der Liste. Auf Desktop steht dieselbe
              Karte rechts in der Seitenspalte (siehe unten). */}
          {stats && (
            <div className="lg:hidden">
              <HomeworkStatsCard homework={homework} stats={stats} role={role} studentCount={studentCount ?? 0} />
            </div>
          )}
          {listError && (
            <div className="text-[13px] font-semibold text-kh-red bg-kh-red-light rounded-xl px-4 py-3">{listError}</div>
          )}
          {hasFilters && (
            <FilterBar
              role={role}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              subjectFilter={subjectFilter}
              onSubjectChange={setSubjectFilter}
              subjectOptions={subjectOptions}
            />
          )}
          {/* Pending — nur für Lehrer */}
          {role === 'teacher' && pending.length > 0 && (
            <div>
              <div className="text-xs font-bold text-kh-amber uppercase tracking-[.6px] mb-3 flex items-center gap-1.5">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>pending</span>
                Ausstehend · Bestätigung erforderlich ({pending.length})
              </div>
              <div className="flex flex-col gap-3">
                {pending.map(hw => (
                  <PendingHomeworkCard key={hw.id} hw={hw} onConfirm={confirmHomework} onReject={rejectHomework} />
                ))}
              </div>
            </div>
          )}
          {/* Eigene Einreichung, wartet auf die Lehrperson */}
          {ownPending.length > 0 && (
            <div>
              <div className="text-xs font-bold text-kh-amber uppercase tracking-[.6px] mb-3 flex items-center gap-1.5">
                <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>hourglass_top</span>
                Von dir eingetragen · wartet auf Freigabe ({ownPending.length})
              </div>
              <div className="flex flex-col gap-3">
                {ownPending.map(hw => (
                  <OwnPendingCard key={hw.id} hw={hw} />
                ))}
              </div>
            </div>
          )}

          {/* Anstehend / upcoming — gruppiert rein nach Fälligkeit in der Zukunft
           *  (done UND offen), damit eine bereits erledigte HÜ mit künftigem
           *  Fälligkeitsdatum sichtbar bleibt. Bewusst NICHT "Offen", sonst
           *  widerspricht der Titel der Kopfstatistik ("0 offen"), obwohl eine
           *  erledigte HÜ darunter steht. */}
          {open.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">
                Anstehend · {open.length}
              </div>
              <div className="flex flex-col gap-3">
                {open.map(hw => (
                  <HomeworkCard key={hw.id} hw={hw} role={role} userId={userId} childId={childId} subjects={subjects} />
                ))}
              </div>
            </div>
          )}

          {/* Past grouped by month */}
          {pastGroups.map(group => (
            <div key={group.label}>
              <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-3">
                {group.label}
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map(hw => (
                  <HomeworkCard key={hw.id} hw={hw} role={role} userId={userId} childId={childId} subjects={subjects} />
                ))}
              </div>
            </div>
          ))}

          {(role !== 'teacher' || pending.length === 0) && ownPending.length === 0 && open.length === 0 && pastGroups.length === 0 && (
            <div className="text-center text-kh-muted py-12 font-medium text-sm">
              <span className="msym text-4xl block mb-2 text-kh-teal-light">filter_alt_off</span>
              Keine Hausübungen für diese Filter.
            </div>
          )}
        </div>

        {stats && (
          <div className="max-lg:hidden">
            <HomeworkStatsCard homework={homework} stats={stats} role={role} studentCount={studentCount ?? 0} />
          </div>
        )}
        </div>
      )}

      {showModal && (
        <AddHomeworkModal
          classId={classId}
          userId={userId}
          subjects={subjects}
          asPending={asPending}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'open', label: 'Offen' },
  { key: 'done', label: 'Erledigt' },
  { key: 'missed', label: 'Versäumt' },
]

const TEACHER_STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'open', label: 'Anstehend' },
  { key: 'missed', label: 'Vergangen' },
]

function FilterBar({
  role, statusFilter, onStatusChange, subjectFilter, onSubjectChange, subjectOptions,
}: {
  role: Role
  statusFilter: StatusFilter
  onStatusChange: (v: StatusFilter) => void
  subjectFilter: string
  onSubjectChange: (v: string) => void
  subjectOptions: { name: string; color: string }[]
}) {
  const tabs = role === 'teacher' ? TEACHER_STATUS_TABS : STATUS_TABS
  const hasSubjectTab = subjectOptions.length > 1
  // Zwei getrennte Kapseln statt einer durchgehenden: vier Tabs plus
  // Fach-Auswahl sind auf einem 375px-Display rund 70px zu breit und hätten
  // die ganze Seite seitlich verschoben. Ein overflow-Container scheidet aus,
  // der würde das aufklappende Fach-Menü abschneiden — also lieber umbrechen.
  return (
    <div className="flex flex-wrap items-start gap-2">
    <div
      className="inline-flex items-stretch rounded-xl w-fit"
      style={{ background: 'linear-gradient(180deg, #FBF7EE 0%, #FFFFFF 100%)', boxShadow: '0 1px 2px rgba(20,40,45,.05), 0 10px 24px rgba(20,40,45,.14)' }}
    >
      {tabs.map((tab, i) => {
        const active = statusFilter === tab.key
        const isFirst = i === 0
        const isLast = i === tabs.length - 1
        return (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`px-4 py-2 text-[13px] font-semibold transition-[color,transform] duration-150 ${isFirst ? 'rounded-l-xl' : ''} ${isLast ? 'rounded-r-xl' : ''} ${active ? 'text-[#2F86C5]' : 'text-kh-muted hover:text-kh-dark hover:-translate-y-px'}`}
            style={{
              backgroundImage: active ? 'linear-gradient(90deg, #2F86C5 0%, #56AEE6 100%)' : undefined,
              backgroundSize: '100% 3px',
              backgroundPosition: 'bottom',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {tab.label}
          </button>
        )
      })}

    </div>

      {hasSubjectTab && (
        <div
          className="inline-flex items-stretch rounded-xl w-fit"
          style={{ background: 'linear-gradient(180deg, #FBF7EE 0%, #FFFFFF 100%)', boxShadow: '0 1px 2px rgba(20,40,45,.05), 0 10px 24px rgba(20,40,45,.14)' }}
        >
          <SubjectDropdown value={subjectFilter} onChange={onSubjectChange} options={subjectOptions} />
        </div>
      )}
    </div>
  )
}

function SubjectDropdown({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { name: string; color: string }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = value !== 'all'
  const selected = options.find(o => o.name === value)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 pl-4 pr-3 py-2 text-[13px] font-semibold transition-[color,transform] duration-150 rounded-xl ${active ? 'text-[#2F86C5]' : 'text-kh-muted hover:text-kh-dark hover:-translate-y-px'}`}
        style={{
          backgroundImage: active ? 'linear-gradient(90deg, #2F86C5 0%, #56AEE6 100%)' : undefined,
          backgroundSize: '100% 3px',
          backgroundPosition: 'bottom',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {selected && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selected.color }} />}
        <span>{selected ? selected.name : 'Alle Fächer'}</span>
        <span className="msym text-[16px]">expand_more</span>
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-kh-border py-1.5 w-[190px]">
          <DropdownRow label="Alle Fächer" active={value === 'all'} onClick={() => { onChange('all'); setOpen(false) }} />
          {options.map(o => (
            <DropdownRow
              key={o.name}
              label={o.name}
              color={o.color}
              active={value === o.name}
              onClick={() => { onChange(o.name); setOpen(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DropdownRow({
  label, color, active, onClick,
}: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-left transition-colors ${active ? 'text-[#2F86C5] bg-[#EAF4FB]' : 'text-kh-dark hover:bg-[#F6F3ED]'}`}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color ?? '#D8D2C4' }} />
      <span className="flex-1 truncate">{label}</span>
      {active && <span className="msym text-[16px] text-[#2F86C5]">check</span>}
    </button>
  )
}

/** Eigene, noch nicht freigegebene Einreichung (hw_admin-Sicht). Bewusst
 *  ohne Aktionen: freigeben darf nur die Lehrperson, und ein Zurückziehen
 *  wäre ein eigenes Feature. */
function OwnPendingCard({ hw }: { hw: HomeworkWithStatus }) {
  const due = dueInfo(hw.due_date)
  return (
    <div className="bg-[#FFFBF2] border border-kh-amber/30 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
      >
        {hw.subject_short}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
        <div className="text-xs text-kh-muted font-medium mt-0.5" title={due.tooltip}>
          {hw.subject} · {due.dateOnlyLabel}
        </div>
        {/* Damit die einreichende Person nachlesen kann, was sie geschrieben
            hat — die HÜ ist bis zur Freigabe sonst nirgends einsehbar. */}
        {hw.details && <HomeworkDetails text={hw.details} clamp={2} className="mt-1" />}
      </div>
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F8ECD6] text-kh-amber flex-shrink-0">
        Wartet
      </span>
    </div>
  )
}

function PendingHomeworkCard({ hw, onConfirm, onReject }: { hw: HomeworkWithStatus; onConfirm: (id: string) => void; onReject: (hw: HomeworkWithStatus) => void }) {
  const due = dueInfo(hw.due_date)
  return (
    <div className="bg-[#FFFBF2] border border-kh-amber/30 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
      >
        {hw.subject_short}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] text-kh-dark truncate">{hw.title}</div>
        <div className="text-xs font-medium mt-0.5" style={{ color: due.color }} title={due.tooltip}>
          {hw.subject} · {due.label}
        </div>
        {/* Ohne die Details gäbe die Lehrperson Text für die ganze Klasse
            frei, den sie nie gesehen hat. */}
        {hw.details && <HomeworkDetails text={hw.details} clamp={2} className="mt-1" />}
      </div>
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F8ECD6] text-kh-amber flex-shrink-0 max-sm:hidden">Ausstehend</span>
      <button
        onClick={() => onReject(hw)}
        aria-label="Einreichung ablehnen"
        className="msym text-[19px] text-[#B6C0BE] hover:text-kh-red transition-colors flex-shrink-0"
      >
        delete
      </button>
      <button
        onClick={() => onConfirm(hw.id)}
        className="flex items-center gap-1 bg-kh-teal text-white text-[12px] font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity flex-shrink-0"
      >
        <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        Bestätigen
      </button>
    </div>
  )
}
