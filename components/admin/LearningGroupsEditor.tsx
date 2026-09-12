'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  createLearningGroup, updateLearningGroup, deleteLearningGroup,
  setLearningGroupArchived, setLearningGroupMembers,
} from '@/app/actions/learningGroups'
import type { SubjectOption } from '@/lib/subjectsCatalog'

interface Group {
  id: string
  name: string
  subject: string
  subject_short: string
  subject_color: string
  teacher_id: string | null
  archived: boolean
}
interface Student { id: string; full_name: string; class_id: string | null }

interface Props {
  groups: Group[]
  /** groupId → studentIds */
  members: Record<string, string[]>
  teachers: { id: string; full_name: string }[]
  classes: { id: string; name: string }[]
  students: Student[]
  subjects: SubjectOption[]
}

/**
 * Admin-Verwaltung der Lerngruppen.
 *
 * Eine Gruppe ist nur eine Liste von Verweisen auf bestehende Kinder — kein
 * zweites Konto, keine zweite Klasse. Deshalb ist die Mitgliederauswahl hier
 * nach Klassen gruppiert: man sieht auf einen Blick, aus welchen Klassen die
 * Gruppe zusammengesetzt ist.
 *
 * Der Gruppenname steht später in den Hausübungen der Kinder. Darauf weist
 * die Oberfläche ausdrücklich hin: „Mathe Gruppe 2" ist eine Bezeichnung,
 * „SPF Mathe" wäre eine Auskunft über die Kinder.
 */
export default function LearningGroupsEditor({ groups, members, teachers, classes, students, subjects }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const { confirm, dialog } = useConfirm()

  const teacherName = (id: string | null) => teachers.find(t => t.id === id)?.full_name ?? 'keine Lehrperson'
  const className = (id: string | null) => classes.find(c => c.id === id)?.name ?? '—'

  function run(fn: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try { await fn(); router.refresh() }
      catch (e) { setError(e instanceof Error ? e.message : 'Fehler beim Speichern.') }
    })
  }

  async function remove(g: Group) {
    const ok = await confirm({
      title: `„${g.name}" löschen?`,
      message: 'Die Gruppe verschwindet. Bereits ausgespielte Hausübungen bleiben bei den Kindern stehen — sie verlieren nur ihre Gruppen-Kennzeichnung.',
      confirmLabel: 'Löschen',
      tone: 'danger',
      icon: 'delete',
    })
    if (!ok) return
    run(() => deleteLearningGroup(g.id))
  }

  return (
    <>
      {dialog}

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px]">
          Gruppen ({groups.length})
        </div>
        <button
          onClick={() => { setCreating(v => !v); setOpenId(null) }}
          className="flex items-center gap-1 text-xs font-bold text-kh-teal hover:text-kh-dark transition"
        >
          <span className="msym text-[16px]">{creating ? 'close' : 'add'}</span>
          {creating ? 'Abbrechen' : 'Anlegen'}
        </button>
      </div>

      {creating && (
        <div className="kh-card px-5 py-5 mb-3">
          <GroupForm
            teachers={teachers}
            subjects={subjects}
            onCancel={() => setCreating(false)}
            onSave={input => { run(async () => { await createLearningGroup(input); setCreating(false) }) }}
            pending={pending}
          />
        </div>
      )}

      {error && (
        <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3 mb-3">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        {groups.map(g => {
          const memberIds = members[g.id] ?? []
          const memberClasses = [...new Set(memberIds.map(id => students.find(s => s.id === id)?.class_id ?? null))]
          const isOpen = openId === g.id
          return (
            <div key={g.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-4">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-[12px] flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${g.subject_color}ee, ${g.subject_color}99)` }}
                >
                  {g.subject_short || '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[15px] text-kh-dark truncate">{g.name}</span>
                    {g.archived && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-kh-muted bg-kh-border/40 rounded-full px-2 py-0.5">
                        archiviert
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-kh-muted font-medium mt-0.5">
                    {teacherName(g.teacher_id)} · {memberIds.length} {memberIds.length === 1 ? 'Kind' : 'Kinder'}
                    {memberClasses.length > 0 && ` · ${memberClasses.map(className).join(', ')}`}
                  </div>
                </div>
                <button
                  onClick={() => { setOpenId(isOpen ? null : g.id); setCreating(false) }}
                  className="text-xs font-bold text-kh-teal hover:text-kh-dark transition flex items-center gap-1"
                >
                  <span className="msym text-[16px]">{isOpen ? 'expand_less' : 'tune'}</span>
                  {isOpen ? 'Schließen' : 'Bearbeiten'}
                </button>
              </div>

              {isOpen && (
                <div className="mt-5 pt-5 border-t border-kh-border/50 flex flex-col gap-6">
                  <GroupForm
                    initial={g}
                    teachers={teachers}
                    subjects={subjects}
                    onCancel={() => setOpenId(null)}
                    onSave={input => run(() => updateLearningGroup(g.id, input))}
                    pending={pending}
                  />

                  <MemberPicker
                    classes={classes}
                    students={students}
                    initial={memberIds}
                    pending={pending}
                    onSave={ids => run(() => setLearningGroupMembers(g.id, ids))}
                  />

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => run(() => setLearningGroupArchived(g.id, !g.archived))}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-full border border-kh-border hover:border-kh-teal hover:text-kh-teal text-kh-muted transition-colors"
                    >
                      {g.archived ? 'Wieder aktivieren' : 'Archivieren'}
                    </button>
                    <button
                      onClick={() => remove(g)}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-full border border-kh-red/30 text-kh-red hover:bg-kh-red-light transition-colors"
                    >
                      Gruppe löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {groups.length === 0 && !creating && (
          <div className="text-sm text-kh-muted font-medium">
            Noch keine Lerngruppen angelegt. Eine Lerngruppe bündelt Kinder aus mehreren
            Klassen, die in einem Fach gemeinsam unterrichtet werden.
          </div>
        )}
      </div>
    </>
  )
}

/** Stammdaten einer Gruppe: Name, Fach, führende Lehrperson. */
function GroupForm({
  initial, teachers, subjects, onSave, onCancel, pending,
}: {
  initial?: Group
  teachers: { id: string; full_name: string }[]
  subjects: SubjectOption[]
  onSave: (input: { name: string; subject: string; subjectShort: string; subjectColor: string; teacherId: string | null }) => void
  onCancel: () => void
  pending: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [subjectLabel, setSubjectLabel] = useState(initial?.subject ?? subjects[0]?.label ?? '')
  const [teacherId, setTeacherId] = useState(initial?.teacher_id ?? '')

  const subject = subjects.find(s => s.label === subjectLabel)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-bold text-kh-dark mb-1.5 block">Name der Gruppe</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z.B. Mathe Gruppe 2"
          className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
        />
        {/* Der Name steht später in der Hausübung jedes Gruppenkindes und ist
            damit für Kind und Eltern lesbar. Eine Bezeichnung, die auf den
            Grund der Gruppe schliessen lässt, gehört dort nicht hin. */}
        <p className="text-[11px] text-kh-muted font-semibold mt-1.5 leading-snug">
          Erscheint in der Hausübung jedes Gruppenkindes. Neutral benennen — der Name
          soll nichts über die Kinder verraten.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-bold text-kh-dark mb-1.5 block">Fach</label>
          <select
            value={subjectLabel}
            onChange={e => setSubjectLabel(e.target.value)}
            className="w-full rounded-xl border border-kh-border px-3 py-2.5 text-sm font-semibold text-kh-dark bg-white focus:outline-none focus:ring-2 focus:ring-kh-teal/40 transition"
          >
            {subjects.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-bold text-kh-dark mb-1.5 block">Führende Lehrperson</label>
          <select
            value={teacherId}
            onChange={e => setTeacherId(e.target.value)}
            className="w-full rounded-xl border border-kh-border px-3 py-2.5 text-sm font-semibold text-kh-dark bg-white focus:outline-none focus:ring-2 focus:ring-kh-teal/40 transition"
          >
            <option value="">— keine —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={pending || !name.trim() || !subject}
          onClick={() => subject && onSave({
            name, subject: subject.label, subjectShort: subject.short,
            subjectColor: subject.color, teacherId: teacherId || null,
          })}
          className="gradient-teal text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-60"
        >
          {initial ? 'Änderungen speichern' : 'Gruppe anlegen'}
        </button>
        <button onClick={onCancel} className="text-[12px] font-bold text-kh-muted hover:text-kh-dark transition-colors px-3 py-2">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

/** Mitgliederauswahl, nach Klassen gruppiert. */
function MemberPicker({
  classes, students, initial, onSave, pending,
}: {
  classes: { id: string; name: string }[]
  students: Student[]
  initial: string[]
  onSave: (ids: string[]) => void
  pending: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))
  const dirty =
    selected.size !== initial.length || initial.some(id => !selected.has(id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="text-xs font-bold text-kh-dark">
          Mitglieder ({selected.size})
        </label>
        {dirty && (
          <button
            disabled={pending}
            onClick={() => onSave([...selected])}
            className="text-[12px] font-bold px-3 py-1.5 rounded-full gradient-teal text-white hover:brightness-105 transition disabled:opacity-60"
          >
            Mitglieder speichern
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {classes.map(c => {
          const kids = students.filter(s => s.class_id === c.id)
          if (kids.length === 0) return null
          return (
            <div key={c.id}>
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-kh-muted mb-1.5">{c.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {kids.map(s => {
                  const on = selected.has(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      aria-pressed={on}
                      className={`px-2.5 py-1 rounded-full border text-[12px] font-semibold transition-all ${
                        on
                          ? 'border-kh-teal bg-kh-teal/10 text-kh-dark'
                          : 'border-kh-border text-kh-muted hover:border-kh-teal/40'
                      }`}
                    >
                      {s.full_name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
