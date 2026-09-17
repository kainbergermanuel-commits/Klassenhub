'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteGroupHomework, updateGroupHomework } from '@/app/actions/learningGroups'
import { useRouter } from 'next/navigation'
import { todayISO, addDaysISO, dueInfo, isOver, isActionable } from '@/lib/date'
import type { HomeworkWithStatus, Role } from '@/lib/types'
import type { SubjectOption } from '@/lib/subjectsCatalog'
import { dueDateFor, extensionDays } from '@/lib/homework'
import { confirmHomeworkCompletion } from '@/app/actions/confirmHomeworkCompletion'
import DatePicker from '@/components/ui/DatePicker'
import HomeworkDetails from './HomeworkDetails'
import SubjectPicker from './SubjectPicker'
import StudentExclusionPicker from './StudentExclusionPicker'
import HomeworkStudentsPopup from './HomeworkStudentsPopup'
import { toggleHomeworkCompletion } from '@/app/actions/toggleHomeworkCompletion'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface Props {
  hw: HomeworkWithStatus
  role: Role
  userId: string
  /** Nur für Eltern: ID des verknüpften Kindes, die der Bestätigen-Knopf an
   *  die Server-Action übergibt. Fehlt sie, wird kein Knopf angeboten. */
  childId?: string | null
  /** Fächer-Katalog für den Bearbeiten-Dialog. Bisher ließ sich das Fach nur
   *  beim Anlegen setzen, nicht mehr korrigieren. */
  subjects?: SubjectOption[]
}

const TODAY = todayISO()
const TOMORROW = addDaysISO(1)
const DETAILS_MAX = 500

function getStatus(hw: HomeworkWithStatus, done: boolean, role: Role) {
  // Maßgeblich ist die für DIESES Kind geltende Frist — bei eingesetztem
  // Zeitkristall die verlängerte. Ohne Verlängerung identisch zu due_date,
  // für alle anderen ändert sich dadurch nichts.
  const due = dueDateFor(hw)
  if (done) {
    // Erledigt, aber noch nicht von den Eltern bestätigt: für Flamme und
    // Klassenziel zählt erst die Bestätigung, das darf die Karte nicht
    // verschweigen. `confirmed` ist undefined, wo der Status nicht geladen
    // wird — dann bleibt es beim bisherigen grünen „Erledigt".
    if (hw.confirmed === false) return {
      pillLabel: 'Wartet auf Bestätigung', pillIcon: 'hourglass_top', pillColor: '#C98A2B', pillBg: '#F8ECD6',
      metaColor: '#C98A2B', cardBg: '#fff', cardBorder: 'none', canToggle: isActionable(due, TODAY),
    }
    return {
      pillLabel: 'Erledigt', pillIcon: 'check_circle', pillColor: '#2E9C6E', pillBg: '#DDF0E7',
      metaColor: '#2E9C6E', cardBg: '#fff', cardBorder: 'none', canToggle: isActionable(due, TODAY),
    }
  }
  if (isOver(due, TODAY)) {
    if (role === 'teacher') return {
      pillLabel: 'Abgeschlossen', pillIcon: 'event_available', pillColor: '#6E7E80', pillBg: '#ECE6D9',
      metaColor: '#6E7E80', cardBg: '#fff', cardBorder: 'none', canToggle: false,
    }
    return {
      pillLabel: 'Versäumt', pillIcon: 'error', pillColor: '#C95040', pillBg: '#FDECEA',
      metaColor: '#C0473A', cardBg: '#FEF5F3', cardBorder: '1px solid #F5D5D0', canToggle: false,
    }
  }
  if (due === TOMORROW) return {
    pillLabel: 'Morgen', pillIcon: 'schedule', pillColor: '#C98A2B', pillBg: '#F8ECD6',
    metaColor: '#C98A2B', cardBg: '#fff', cardBorder: 'none', canToggle: true,
  }
  return {
    pillLabel: 'Offen', pillIcon: 'event', pillColor: '#6E7E80', pillBg: '#ECE6D9',
    metaColor: '#6E7E80', cardBg: '#fff', cardBorder: 'none', canToggle: true,
  }
}

export default function HomeworkCard({ hw, role, userId, childId, subjects = [] }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState(hw.done)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(hw.title)
  const [editDate, setEditDate] = useState(hw.due_date)
  const [editSubject, setEditSubject] = useState(hw.subject)
  const [editDetails, setEditDetails] = useState(hw.details ?? '')
  const [editExcluded, setEditExcluded] = useState<string[]>(hw.excluded_student_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [optimisticConfirmed, setOptimisticConfirmed] = useState(hw.confirmed === true)
  const [confirming, setConfirming] = useState(false)
  // Feier-Mikromoment beim Abhaken (siehe .animate-hw-* in app/globals.css).
  // Nur beim Erledigen, nie beim Zurücknehmen; der Timer erlaubt das
  // erneute Abspielen nach einem Zurücknehmen.
  const [celebrate, setCelebrate] = useState(false)
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(false), 900)
    return () => clearTimeout(t)
  }, [celebrate])

  const status = getStatus({ ...hw, confirmed: hw.confirmed === undefined ? undefined : optimisticConfirmed }, optimisticDone, role)

  if (deleted) return null

  async function toggleDone() {
    if (role !== 'student' || !status.canToggle) return
    const next = !optimisticDone
    const prevConfirmed = optimisticConfirmed
    setOptimisticDone(next)
    setCelebrate(next)
    // Häkchen entfernt = Erledigung gelöscht, damit ist auch eine frühere
    // Bestätigung weg. Veteranen werden serverseitig sofort mitbestätigt.
    setOptimisticConfirmed(false)
    setActionError(null)
    try {
      const { autoConfirmed } = await toggleHomeworkCompletion(hw.id, next)
      if (next && autoConfirmed) setOptimisticConfirmed(true)
      startTransition(() => router.refresh())
    } catch {
      // Zurückrollen. Ohne das zeigte die Karte weiter „erledigt", während
      // die Datenbank nichts davon weiß — der schlimmste stille Fehler im
      // Feature, weil das Kind sich darauf verlässt.
      setOptimisticDone(!next)
      setOptimisticConfirmed(prevConfirmed)
      setCelebrate(false)
      setActionError('Konnte nicht gespeichert werden. Bitte erneut versuchen.')
    }
  }

  /** Felder beim ÖFFNEN aus den aktuellen Daten setzen, nicht nur einmal beim
   *  Mounten. Sonst taucht ein abgebrochener Entwurf beim nächsten Öffnen
   *  wieder auf, und Änderungen einer anderen Lehrperson wären nicht zu sehen. */
  function openEdit() {
    setEditTitle(hw.title)
    setEditDate(hw.due_date)
    setEditSubject(hw.subject)
    setEditDetails(hw.details ?? '')
    setEditExcluded(hw.excluded_student_ids ?? [])
    setActionError(null)
    setEditing(true)
  }

  async function deleteHw() {
    const ok = await confirm({
      title: 'Hausübung löschen?',
      message: hw.group_batch_id
        ? `„${hw.title}" wird für alle Kinder der Gruppe „${hw.group_label ?? 'Lerngruppe'}" entfernt, auch in den anderen Klassen. Das lässt sich nicht rückgängig machen.`
        : `„${hw.title}" wird für die ganze Klasse entfernt. Das lässt sich nicht rückgängig machen.`,
      confirmLabel: 'Löschen',
      tone: 'danger',
      icon: 'delete',
    })
    if (!ok) return
    // Erst löschen, dann ausblenden. Umgekehrt verschwände die Karte auch
    // dann, wenn die Löschung an RLS scheitert, und käme erst beim nächsten
    // Laden wieder — ein stiller Fehler.
    // Gruppen-HÜ liegt als je eine Zeile pro beteiligter Klasse vor. Sie
    // darf nur als Ganzes verschwinden — sonst bliebe sie bei der halben
    // Gruppe stehen. Deshalb über die geprüfte Funktion, nicht über delete().
    if (hw.group_batch_id) {
      try { await deleteGroupHomework(hw.group_batch_id) }
      catch { setActionError('Löschen fehlgeschlagen. Bitte erneut versuchen.'); return }
      setDeleted(true)
      startTransition(() => router.refresh())
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('homework').delete().eq('id', hw.id)
    if (error) { setActionError('Löschen fehlgeschlagen. Bitte erneut versuchen.'); return }
    setDeleted(true)
    startTransition(() => router.refresh())
  }

  async function confirmForChild() {
    if (!childId || confirming) return
    setConfirming(true)
    setActionError(null)
    try {
      await confirmHomeworkCompletion(hw.id, childId)
      setOptimisticConfirmed(true)
      startTransition(() => router.refresh())
    } catch {
      setActionError('Bestätigen fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setConfirming(false)
    }
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editDate) return
    setSaving(true)
    setActionError(null)
    // Gruppen-HÜ: Titel, Frist und Details gelten für alle Klassenhälften
    // gemeinsam. Fach und Empfängerkreis stehen durch die Gruppe fest und
    // sind hier deshalb nicht änderbar.
    if (hw.group_batch_id) {
      try {
        await updateGroupHomework(hw.group_batch_id, editTitle.trim(), editDate, editDetails)
      } catch {
        setSaving(false)
        setActionError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
        return
      }
      setSaving(false)
      setEditing(false)
      startTransition(() => router.refresh())
      return
    }

    const supabase = createClient()
    // Fach nur mitschreiben, wenn es im Katalog gefunden wird — sonst blieben
    // subject_short und subject_color inkonsistent zum Namen.
    const picked = subjects.find(x => x.label === editSubject)
    const { error } = await supabase.from('homework').update({
      title: editTitle.trim(),
      due_date: editDate,
      details: editDetails.trim() || null,
      // Ausdrücklich mitschreiben, nicht weglassen: ein Update ohne dieses
      // Feld liesse eine versehentlich gesetzte Ausnahme für immer stehen,
      // ein implizites null würde sie stillschweigend aufheben. Beides wäre
      // aus der Oberfläche heraus nicht nachvollziehbar.
      excluded_student_ids: editExcluded.length > 0 ? editExcluded : null,
      ...(picked && picked.label !== hw.subject
        ? { subject: picked.label, subject_short: picked.short, subject_color: picked.color }
        : {}),
    }).eq('id', hw.id)
    setSaving(false)
    if (error) { setActionError('Speichern fehlgeschlagen. Bitte erneut versuchen.'); return }
    setEditing(false)
    startTransition(() => router.refresh())
  }

  const due = dueInfo(dueDateFor(hw))
  const extraDays = extensionDays(hw)
  // Für Lehrer ist eine vergangene HÜ nicht "überfällig", sondern schlicht
  // gelaufen, und eine erledigte braucht keinen Countdown mehr.
  const showRelative = !optimisticDone && !(role === 'teacher' && due.over)
  const dueText = showRelative ? due.label : due.dateOnlyLabel

  return (
    <>
      {dialog}
      <div
        className={`rounded-2xl p-4 flex gap-3 items-start shadow-[0_8px_16px_rgba(20,40,45,.10)] ${celebrate ? 'animate-hw-card' : ''}`}
        style={{
          background: `linear-gradient(to bottom right, #ffffff 0%, #ffffff 55%, ${hw.subject_color}29 100%)`,
          border: status.cardBorder,
        }}
      >
        {/* Subject badge */}
        <div
          className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center font-extrabold text-[15px] flex-shrink-0 text-white"
          style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
        >
          {hw.subject_short}
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-[7px] uppercase tracking-[.3px]"
            style={{ color: status.pillColor, background: status.pillBg }}
          >
            <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{status.pillIcon}</span>
            {status.pillLabel}
          </span>

          <div className="font-bold text-[15.5px] mt-2" style={{ color: optimisticDone ? '#7C8A89' : '#15363F' }}>
            {/* Strich auf einem inline-Element, damit er über den Text läuft
                und nicht über die volle Breite (siehe globals.css). */}
            <span
              className={celebrate ? 'animate-hw-strike' : undefined}
              style={{ textDecoration: optimisticDone && !celebrate ? 'line-through' : 'none' }}
            >
              {hw.title}
            </span>
          </div>
          <div
            className="flex items-center gap-1 text-[12.5px] font-semibold mt-0.5"
            style={{ color: showRelative ? due.color : status.metaColor }}
            title={due.tooltip}
          >
            <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 0" }}>event</span>
            {dueText} · {hw.subject}
            {showRelative && due.warn && (
              <span className="msym text-[15px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            )}
          </div>

          {extraDays > 0 && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11.5px] font-bold text-[#4A6FA5] bg-[#EAF0FA] border border-[#D3E0F2] px-2.5 py-1 rounded-lg">
              <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
              Zeitkristall · Frist um {extraDays} {extraDays === 1 ? 'Tag' : 'Tage'} verlängert
            </span>
          )}

          {actionError && (
            <div className="mt-2 text-[12px] font-semibold text-kh-red bg-kh-red-light rounded-lg px-2.5 py-1.5">
              {actionError}
            </div>
          )}

          {/* attachment_name war ein toter Zweig: die Spalte existiert, wurde
              aber nie beschrieben und hatte keine Datei zum Öffnen. Entfernt
              am 2026-08-29; die Spalte bleibt in der Datenbank bestehen. */}

          {/* Herkunft aus einer Lerngruppe. Steht als Text in der Zeile
              (homework.group_label), kostet also keine zusätzliche Abfrage —
              und macht für Kind, Eltern und Klassenlehrperson sichtbar,
              dass diese HÜ nicht von der Klasse kommt. */}
          {hw.group_label && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11.5px] font-bold text-[#5B6F7A] bg-[#EDF3F6] border border-[#D8E5EC] px-2.5 py-1 rounded-lg">
              <span className="msym text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
              {hw.group_label}
            </span>
          )}

          {hw.details && <HomeworkDetails text={hw.details} clamp={2} className="mt-2" />}
        </div>

        {/* Student: toggle */}
        {role === 'student' && (
          <button
            onClick={toggleDone}
            disabled={!status.canToggle && !optimisticDone}
            aria-label={optimisticDone ? 'Als offen markieren' : 'Als erledigt markieren'}
            className={`flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all tap-sm disabled:opacity-30 disabled:cursor-not-allowed ${celebrate ? 'animate-hw-check' : ''}`}
            style={optimisticDone
              ? { background: '#2E9C6E' }
              : status.canToggle
                ? { border: '2.5px solid #CBD5D3' }
                : { border: '2.5px solid #F5D5D0' }
            }
          >
            {optimisticDone && (
              <span className={`msym text-white text-[19px] ${celebrate ? 'animate-hw-check-icon' : ''}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>
            )}
          </button>
        )}

        {/* Parent: Bestätigen-Knopf, solange die Erledigung offen ist —
            sonst nur der Status. Ruft dieselbe Server-Action wie die
            Sammelliste auf der Startseite; die Meilenstein-Jubelanzeige
            bleibt bewusst dort, damit sie nur an einer Stelle gepflegt wird. */}
        {/* Eltern: NUR der Bestätigen-Knopf, kein Status-Badge. Den Status
            trägt bereits die Pille oben links — ein zweites Mal rechts war
            reine Doppelung. */}
        {role === 'parent' && optimisticDone && hw.confirmed === false && !optimisticConfirmed && childId && (
          <button
            onClick={confirmForChild}
            disabled={confirming}
            className="flex-shrink-0 flex items-center gap-1 gradient-teal text-white text-[11.5px] font-bold px-3 py-1.5 rounded-full hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-50"
          >
            <span className="msym text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {confirming ? 'progress_activity' : 'check_circle'}
            </span>
            Bestätigen
          </button>
        )}

        {/* Teacher: count + edit/delete */}
        {role === 'teacher' && (
          <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-kh-teal">{hw.completion_count ?? 0} gemacht</span>
                {/* Kein Auge bei einer Gruppen-HÜ: kontrolliert wird sie dort,
                    wo die Gruppe lebt (/gruppen, bei der Lehrperson, die sie
                    unterrichtet). Hier sässe sonst jemand vor einer Liste, die
                    er nicht kontrolliert — und sähe dafür Kinder fremder
                    Klassen. Der Zähler bleibt: er zählt die Kinder DIESER
                    Klasse und ist damit richtig. */}
                {!hw.group_batch_id && (
                  <HomeworkStudentsPopup hw={hw} />
                )}
              </div>
              {hw.confirmed_count !== undefined && (
                <span className="text-[10.5px] font-semibold text-kh-muted whitespace-nowrap">
                  davon {hw.confirmed_count} bestätigt
                </span>
              )}
              {/* Ohne diesen Hinweis wirkt "12 gemacht" bei 16 Kindern nach
                  vier Versäumnissen, obwohl zwei die HÜ nie bekommen haben. */}
              {(hw.excluded_student_ids?.length ?? 0) > 0 && (
                <span className="text-[10.5px] font-semibold text-kh-muted whitespace-nowrap">
                  {hw.excluded_student_ids!.length} ausgenommen
                </span>
              )}
            </div>
            <div className="flex gap-1.5 text-[#B6C0BE]">
              <button onClick={openEdit} aria-label="Hausübung bearbeiten" className="msym text-[19px] hover:text-kh-teal transition-colors">edit</button>
              <button onClick={deleteHw} aria-label="Hausübung löschen" className="msym text-[19px] hover:text-kh-red transition-colors">delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-kh-dark">HÜ bearbeiten</h2>
              <button onClick={() => setEditing(false)} aria-label="Schließen" className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Titel"
                className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark outline-none focus:border-kh-teal transition-colors"
              />
              {subjects.length > 0 && !hw.group_batch_id && (
                <SubjectPicker subjects={subjects} value={editSubject} onChange={setEditSubject} />
              )}
              {hw.group_batch_id && (
                // Fach und Empfängerkreis stehen bei einer Gruppen-HÜ durch die
                // Gruppe fest. Sie hier änderbar zu machen hiesse, sie in einer
                // Klasse anders zu setzen als in der anderen.
                <p className="text-[11.5px] font-semibold text-kh-muted leading-snug bg-[#F6F3ED] rounded-xl px-3 py-2">
                  Hausübung der Lerngruppe „{hw.group_label ?? 'Lerngruppe'}". Änderungen gelten
                  für alle Kinder der Gruppe, auch in den anderen Klassen. Fach und Gruppe
                  werden in der Gruppenverwaltung festgelegt.
                </p>
              )}
              <div>
                <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5" htmlFor={`hw-details-${hw.id}`}>
                  Details (optional)
                </label>
                <textarea
                  id={`hw-details-${hw.id}`}
                  rows={3}
                  maxLength={DETAILS_MAX}
                  value={editDetails}
                  onChange={e => setEditDetails(e.target.value)}
                  placeholder="Was genau ist zu tun? Was mitbringen?"
                  className="w-full border border-kh-border rounded-xl px-4 py-3 text-base font-medium text-kh-dark placeholder:text-kh-muted outline-none focus:border-kh-teal transition-colors resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-kh-muted uppercase tracking-wider block mb-1.5">Fällig am</label>
                <DatePicker value={editDate} min={TOMORROW} onChange={setEditDate} />
              </div>
              {/* Bestehende Ausnahmen gleich sichtbar, sonst ändert man sie
                  beim Bearbeiten versehentlich nicht mit. Bei einer Gruppen-HÜ
                  ergibt sich der Kreis aus der Gruppe — dort wäre die Liste
                  eine Falle, weil sie nur die eine Klassenhälfte beträfe. */}
              {!hw.group_batch_id && (
              <StudentExclusionPicker
                classId={hw.class_id}
                value={editExcluded}
                onChange={setEditExcluded}
                defaultOpen={(hw.excluded_student_ids?.length ?? 0) > 0}
              />
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
                Abbrechen
              </button>
              <button
                onClick={saveEdit}
                disabled={!editTitle.trim() || !editDate || saving}
                className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-40"
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
