'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import StudentChip from '@/components/ui/StudentChip'
import DatePicker from '@/components/ui/DatePicker'
import IconButton from '@/components/ui/IconButton'
import { addDaysISO, dueInfo, schoolYearStartISO, todayISO } from '@/lib/date'
import { createGroupHomework, deleteGroupHomework, updateGroupHomework } from '@/app/actions/learningGroups'

interface Group {
  id: string
  name: string
  subject: string
  subject_short: string
  subject_color: string
  archived: boolean
}
interface Member {
  student_id: string
  full_name: string
  class_name: string | null
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}
interface GroupHw {
  batch_id: string
  title: string
  due_date: string
  details: string | null
  subject: string
  subject_short: string
  subject_color: string
  member_count: number
  done_count: number
  confirmed_count: number
}
interface HwStudent extends Member { done: boolean; confirmed: boolean }

const EARLIEST_DUE = () => addDaysISO(1)

/**
 * Lerngruppen der Lehrperson: Mitglieder, Hausübungen, Kontrolle.
 *
 * Die Gruppen-Hausübung liegt in der Datenbank als je eine Zeile pro
 * beteiligter Klasse (siehe supabase/feature-lerngruppen.sql). Diese Ansicht
 * führt die Hälften über group_batch_id wieder zusammen — sie ist der einzige
 * Ort im Projekt, an dem die Aufteilung überhaupt sichtbar wird, und zwar als
 * EINE Hausübung.
 *
 * Details werden erst beim Aufklappen geladen. Wer die Seite nur öffnet,
 * bezahlt eine einzige kleine Abfrage (die Gruppenliste).
 */
export default function LearningGroupsView({ groups, isAdmin }: { groups: Group[]; isAdmin: boolean }) {
  const [openId, setOpenId] = useState<string | null>(groups.length === 1 ? groups[0].id : null)

  if (groups.length === 0) {
    return (
      <div className="kh-card px-5 py-8 text-center">
        <span className="msym text-[40px] text-kh-muted/40" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
        <p className="text-[14px] font-bold text-kh-dark mt-2">Dir ist noch keine Lerngruppe zugeteilt.</p>
        <p className="text-[12.5px] text-kh-muted font-medium mt-1 leading-snug max-w-md mx-auto">
          Eine Lerngruppe bündelt Kinder aus mehreren Klassen, die in einem Fach gemeinsam
          unterrichtet werden. Dann genügt eine Hausübung für die ganze Gruppe statt einer je Klasse.
        </p>
        {isAdmin && (
          <Link href="/admin/gruppen" className="inline-flex items-center gap-1.5 mt-4 text-[12.5px] font-bold text-kh-teal hover:underline">
            <span className="msym text-[16px]">add</span> Gruppe anlegen
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map(g => (
        <GroupCard
          key={g.id}
          group={g}
          open={openId === g.id}
          onToggle={() => setOpenId(openId === g.id ? null : g.id)}
        />
      ))}
    </div>
  )
}

function GroupCard({ group, open, onToggle }: { group: Group; open: boolean; onToggle: () => void }) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [homework, setHomework] = useState<GroupHw[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Zählt die Ladevorgänge. Nur die Antwort des JÜNGSTEN darf schreiben —
   *  sonst überholt eine langsame frühere Antwort eine neuere (Aufklappen,
   *  zuklappen, wieder aufklappen) und die Karte zeigt veraltete Daten. */
  const loadSeq = useRef(0)
  /** Fehler einer Aktion (Löschen) — getrennt vom Ladefehler, der die ganze
   *  Karte ersetzt. */
  const [actionError, setActionError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<GroupHw | null>(null)
  const [pending, startTransition] = useTransition()
  const { confirm, dialog } = useConfirm()

  /**
   * Mitglieder + Hausübungen der Gruppe holen.
   *
   * Bewusst mit try/finally und sichtbarem Fehler: vorher verschluckte diese
   * Funktion jeden Fehlschlag. Brach ein Aufruf ab, blieb „Lädt…" für immer
   * stehen; lieferte er einen Fehler statt Daten, sah das aus wie „Gruppe hat
   * keine Mitglieder". Beides war von aussen nicht zu unterscheiden.
   */
  async function load() {
    const seq = ++loadSeq.current
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      // Ein Aufruf für Mitglieder UND Hausübungen (group_overview bündelt die
      // beiden Funktionen serverseitig). Die Hausübungen sind auf das laufende
      // Schuljahr begrenzt — wie überall sonst in der App, sonst stünde hier im
      // zweiten Jahr alles seit Anfang.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc('group_overview', {
        p_group: group.id,
        p_since: schoolYearStartISO(),
      })
      if (seq !== loadSeq.current) return
      if (rpcError) {
        setError(`Konnte die Gruppe nicht laden: ${rpcError.message ?? 'unbekannter Fehler'}`)
        return
      }
      const overview = (data ?? {}) as { members?: Member[]; homework?: GroupHw[] }
      setMembers(overview.members ?? [])
      setHomework(overview.homework ?? [])
    } catch (e) {
      if (seq !== loadSeq.current) return
      setError(e instanceof Error ? `Konnte die Gruppe nicht laden: ${e.message}` : 'Konnte die Gruppe nicht laden.')
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }

  // Laden hängt am Zustand „offen", nicht am Klick: bei genau einer Gruppe
  // startet die Karte bereits aufgeklappt, und dann gibt es keinen Klick, der
  // das Laden auslösen könnte — sie stand aufgeklappt und leer da.
  useEffect(() => {
    // Beim Aufklappen genau einmal laden. `loading` steht bewusst NICHT in der
    // Bedingung: es stammte aus einem alten Render-Stand und konnte das Laden
    // dauerhaft blockieren. Gegen doppelte Läufe schützt die Sequenznummer.
    if (open && members === null) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function afterChange() {
    void load()
    startTransition(() => router.refresh())
  }

  async function remove(hw: GroupHw) {
    const ok = await confirm({
      title: 'Hausübung löschen?',
      message: `„${hw.title}" verschwindet bei allen Kindern der Gruppe.`,
      confirmLabel: 'Löschen',
      tone: 'danger',
      icon: 'delete',
    })
    if (!ok) return
    setActionError(null)
    try { await deleteGroupHomework(hw.batch_id); afterChange() }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.') }
  }

  return (
    <div className="kh-card px-5 py-4">
      {dialog}
      <button onClick={onToggle} className="w-full flex items-center gap-4 text-left">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-[13px] flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${group.subject_color}ee, ${group.subject_color}99)` }}
        >
          {group.subject_short || '—'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[15px] text-kh-dark truncate">{group.name}</span>
            {group.archived && (
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-kh-muted bg-kh-border/40 rounded-full px-2 py-0.5">archiviert</span>
            )}
          </div>
          <div className="text-[12px] text-kh-muted font-medium mt-0.5">
            {group.subject}
            {members && ` · ${members.length} ${members.length === 1 ? 'Kind' : 'Kinder'}`}
            {members && members.length > 0 && ` · ${[...new Set(members.map(m => m.class_name).filter(Boolean))].join(', ')}`}
          </div>
        </div>
        <span className="msym text-[20px] text-kh-muted flex-shrink-0">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-kh-border/50">
          {error ? (
            <div className="py-4">
              <div className="bg-kh-red-light text-kh-red text-[13px] font-semibold rounded-xl px-4 py-3">{error}</div>
              <button
                onClick={() => void load()}
                className="mt-2.5 text-[12.5px] font-bold text-kh-teal hover:underline flex items-center gap-1"
              >
                <span className="msym text-[16px]">refresh</span> Erneut versuchen
              </button>
            </div>
          ) : loading && members === null ? (
            <div className="text-[12.5px] text-kh-muted font-semibold py-6 text-center">Lädt…</div>
          ) : (
            <>
              {/* Mitglieder */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(members ?? []).map(m => (
                  <StudentChip key={m.student_id} student={m} classLabel={m.class_name} />
                ))}
                {(members ?? []).length === 0 && (
                  <span className="text-[12.5px] text-kh-muted font-semibold">
                    Noch keine Mitglieder — die Administration stellt die Gruppe zusammen.
                  </span>
                )}
              </div>

              {actionError && (
                <div className="bg-kh-red-light text-kh-red text-[13px] font-semibold rounded-xl px-4 py-3 mb-3">{actionError}</div>
              )}

              {/* Hausübungen */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-kh-muted">
                  Hausübungen ({(homework ?? []).length})
                </span>
                {!group.archived && (members ?? []).length > 0 && (
                  <button
                    onClick={() => { setAdding(true); setEditing(null) }}
                    className="flex items-center gap-1 text-[12px] font-bold text-kh-teal hover:text-kh-dark transition"
                  >
                    <span className="msym text-[16px]">add</span> Neue Hausübung
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {(homework ?? []).map(hw => (
                  <HomeworkRow
                    key={hw.batch_id}
                    hw={hw}
                    onEdit={() => { setEditing(hw); setAdding(false) }}
                    onDelete={() => remove(hw)}
                  />
                ))}
                {(homework ?? []).length === 0 && (
                  <div className="text-[12.5px] text-kh-muted font-medium py-2">
                    Für diese Gruppe wurde noch keine Hausübung eingetragen.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {(adding || editing) && (
        <GroupHomeworkModal
          group={group}
          edit={editing}
          pending={pending}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); afterChange() }}
        />
      )}
    </div>
  )
}

/** Eine Gruppen-HÜ mit Abgabestand; aufklappbar zur namentlichen Kontrolle. */
function HomeworkRow({ hw, onEdit, onDelete }: { hw: GroupHw; onEdit: () => void; onDelete: () => void }) {
  const [students, setStudents] = useState<HwStudent[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const due = dueInfo(hw.due_date)

  async function toggle() {
    setOpen(o => !o)
    if (students !== null || loadError) return
    // Fehler sichtbar machen: eine leere Liste hiesse sonst „niemand hat
    // abgegeben", obwohl die Abfrage gar nicht durchkam.
    const supabase = createClient()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('group_homework_students', { p_batch: hw.batch_id })
      if (error) { setLoadError(error.message ?? 'unbekannter Fehler'); return }
      setStudents((data as HwStudent[] | null) ?? [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'unbekannter Fehler')
    }
  }

  return (
    <div className="rounded-xl bg-white/70 ring-1 ring-kh-border/40 px-3 py-2.5">
      <div className="flex items-center gap-3">
        {/* Die ganze Zeile öffnet die namentliche Abgabeliste. Das war vorher
            nicht zu erkennen — daneben standen zwei deutliche Symbole zum
            Bearbeiten und Löschen, und der Rest sah nach reiner Anzeige aus.
            Deshalb ein sichtbarer Hinweis statt einer versteckten Fläche. */}
        <button
          onClick={toggle}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-3 text-left group"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-extrabold text-[10px] flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee, ${hw.subject_color}99)` }}
          >
            {hw.subject_short}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-kh-dark truncate">{hw.title}</div>
            <div className="text-[11.5px] text-kh-muted font-medium">
              {due.dateOnlyLabel} · {hw.done_count}/{hw.member_count} erledigt
              {hw.confirmed_count > 0 && ` · ${hw.confirmed_count} bestätigt`}
            </div>
          </div>
          <span className="flex items-center gap-0.5 text-[11.5px] font-bold text-kh-teal flex-shrink-0 mr-1">
            <span className="max-sm:hidden">{open ? 'schließen' : 'wer hat abgegeben?'}</span>
            <span className="msym text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
          </span>
        </button>
        <button onClick={onEdit} aria-label="Bearbeiten" className="msym text-[18px] text-kh-muted hover:text-kh-teal transition-colors">edit</button>
        <button onClick={onDelete} aria-label="Löschen" className="msym text-[18px] text-kh-muted hover:text-kh-red transition-colors">delete</button>
      </div>

      {open && (
        <div className="mt-2.5 pt-2.5 border-t border-kh-border/40 flex flex-wrap gap-1.5">
          {loadError ? (
            <span className="text-[12px] text-kh-red font-semibold">
              Konnte die Abgaben nicht laden: {loadError}
            </span>
          ) : students === null ? (
            <span className="text-[12px] text-kh-muted font-semibold">Lädt…</span>
          ) : students.map(s => (
            <StudentChip
              key={s.student_id}
              student={s}
              tone={s.done ? 'aktiv' : 'neutral'}
              classLabel={s.class_name}
              icon={s.done ? (s.confirmed ? 'verified' : 'check_circle') : undefined}
              title={`${s.full_name}${s.class_name ? ` · ${s.class_name}` : ''}${s.done ? (s.confirmed ? ' · erledigt und bestätigt' : ' · erledigt') : ' · offen'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Anlegen/Bearbeiten einer Gruppen-Hausübung. Bewusst schlanker als das
 *  Klassen-Formular: Fach und Empfängerkreis stehen durch die Gruppe fest. */
function GroupHomeworkModal({
  group, edit, onClose, onSaved, pending,
}: {
  group: Group
  edit: GroupHw | null
  onClose: () => void
  onSaved: () => void
  pending: boolean
}) {
  const [title, setTitle] = useState(edit?.title ?? '')
  const [dueDate, setDueDate] = useState(edit?.due_date ?? EARLIEST_DUE())
  const [details, setDetails] = useState(edit?.details ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim() || !dueDate || saving) return
    setSaving(true)
    setError(null)
    try {
      if (edit) await updateGroupHomework(edit.batch_id, title, dueDate, details)
      else await createGroupHomework(group.id, title, dueDate, details)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center pt-[74px] px-4 pb-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="modal-panel w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-kh-dark">
              {edit ? 'Hausübung bearbeiten' : 'Neue Hausübung'}
            </h2>
            <p className="text-xs text-kh-muted font-semibold mt-0.5 truncate">
              {group.name} · {group.subject}
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="Schließen" icon="close" size="sm" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Aufgabe</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Übungsblatt S. 42, Nr. 1–6"
              className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">
              Details <span className="font-semibold text-kh-muted">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={details}
              onChange={e => setDetails(e.target.value)}
              className="w-full rounded-xl border border-kh-border px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal transition resize-y"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-kh-dark mb-1.5 block">Fällig am</label>
            <DatePicker value={dueDate} min={edit ? todayISO() : EARLIEST_DUE()} onChange={setDueDate} />
          </div>

          {/* Sagt ausdrücklich, was beim Speichern passiert: die Gruppen-HÜ
              landet bei den Kindern als HÜ ihrer jeweiligen Klasse. */}
          <p className="text-[11.5px] text-kh-muted font-semibold leading-snug">
            Geht an alle Kinder der Gruppe — in jeder Klasse erscheint sie als gewöhnliche
            Hausübung mit dem Vermerk „{group.name}".
          </p>

          {error && (
            <div className="bg-kh-red-light text-kh-red text-sm font-semibold rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            onClick={save}
            disabled={saving || pending || !title.trim()}
            className="w-full gradient-teal text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-60"
          >
            {saving
              ? <span className="msym animate-spin text-lg">progress_activity</span>
              : <><span className="msym text-lg">check</span> {edit ? 'Änderungen speichern' : 'Hausübung posten'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
