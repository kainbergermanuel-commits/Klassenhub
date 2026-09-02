'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSubject, updateSubject, deleteSubject } from '@/app/actions/adminSubjects'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface Subject {
  id: string
  label: string
  short: string
  color: string
  sort_order: number
}

/** Admin-CRUD für den Fächer-Katalog (siehe supabase/add-subjects-catalog.sql)
 *  — Quelle für die Fächerauswahl im Stundenplan-Feature (Lehrer-Vorlage +
 *  Kind-Ansicht). Jede Zeile ist sofort inline editierbar, kein separater
 *  Bearbeiten-Modus — passt zur Größe des Katalogs (überschaubare Liste). */
export default function SubjectsEditor({ initial }: { initial: Subject[] }) {
  const router = useRouter()
  const [subjects, setSubjects] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newShort, setNewShort] = useState('')
  const [newColor, setNewColor] = useState('#0F8A82')
  const { confirm, dialog } = useConfirm()

  function patchLocal(id: string, patch: Partial<Subject>) {
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }

  function saveEdit(s: Subject) {
    setError(null)
    startTransition(async () => {
      try {
        await updateSubject(s.id, { label: s.label, short: s.short, color: s.color })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler beim Speichern.')
      }
    })
  }

  // Farbwahl: onBlur ist beim nativen Color-Picker unzuverlässig (macOS öffnet
  // ein eigenes Panel → der Input blurred sofort BEIM ÖFFNEN mit dem alten
  // Wert, und nach dem Wählen kommt kein zweiter Blur mehr — die Änderung
  // würde nie gespeichert). Daher: debounced Save direkt auf onChange; der
  // Timer fängt das kontinuierliche Feuern beim Ziehen im Picker ab. Die Ref
  // liefert dem Timer den jeweils aktuellen Zeilen-Stand (Label/Kürzel könnten
  // sich zwischenzeitlich geändert haben) ohne Side-Effect im State-Updater.
  const subjectsRef = useRef(subjects)
  subjectsRef.current = subjects
  const colorTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  function changeColor(id: string, color: string) {
    patchLocal(id, { color })
    const timers = colorTimers.current
    const existing = timers.get(id)
    if (existing) clearTimeout(existing)
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      const s = subjectsRef.current.find(x => x.id === id)
      if (s) saveEdit({ ...s, color })
    }, 500))
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Fach entfernen?',
      message: 'Bereits im Stundenplan eingetragene Stunden mit diesem Fach bleiben als Text stehen, verlieren aber ihre Farbe und ihr Kürzel.',
      confirmLabel: 'Entfernen',
      tone: 'danger',
      icon: 'delete',
    })
    if (!ok) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteSubject(id)
        setSubjects(prev => prev.filter(s => s.id !== id))
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler beim Entfernen.')
      }
    })
  }

  function add() {
    if (!newLabel.trim() || !newShort.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await createSubject({ label: newLabel.trim(), short: newShort.trim(), color: newColor })
        setNewLabel('')
        setNewShort('')
        setNewColor('#0F8A82')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler beim Anlegen.')
      }
    })
  }

  return (
    <div>
      {dialog}
      <div className="flex flex-col gap-2 mb-5">
        {subjects.map(s => (
          <div key={s.id} className="flex items-center gap-2.5 bg-[#FAF8F3] rounded-xl px-3 py-2.5">
            <input
              type="color"
              value={s.color}
              onChange={e => changeColor(s.id, e.target.value)}
              className="w-8 h-8 rounded-lg border border-kh-border/60 cursor-pointer flex-shrink-0"
              aria-label={`Farbe für ${s.label}`}
            />
            <input
              type="text"
              value={s.label}
              onChange={e => patchLocal(s.id, { label: e.target.value })}
              onBlur={() => saveEdit(subjects.find(x => x.id === s.id)!)}
              className="min-w-0 flex-1 bg-white rounded-lg border border-kh-border/60 px-2.5 py-1.5 text-[13px] font-semibold text-kh-dark focus:border-kh-teal focus:outline-none"
              placeholder="Name"
            />
            <input
              type="text"
              value={s.short}
              onChange={e => patchLocal(s.id, { short: e.target.value })}
              onBlur={() => saveEdit(subjects.find(x => x.id === s.id)!)}
              className="w-20 flex-shrink-0 bg-white rounded-lg border border-kh-border/60 px-2.5 py-1.5 text-[13px] font-semibold text-kh-dark focus:border-kh-teal focus:outline-none"
              placeholder="Kürzel"
            />
            <button
              onClick={() => remove(s.id)}
              disabled={pending}
              className="flex-shrink-0 msym text-[18px] text-kh-muted hover:text-kh-red transition-colors disabled:opacity-40"
              aria-label={`${s.label} entfernen`}
            >
              delete
            </button>
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-[13px] text-kh-muted font-medium">Noch keine Fächer angelegt.</p>
        )}
      </div>

      {error && <p className="text-[12.5px] font-semibold text-kh-red mb-3">{error}</p>}

      <div className="flex items-center gap-2.5 pt-4 border-t border-kh-border">
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-8 h-8 rounded-lg border border-kh-border/60 cursor-pointer flex-shrink-0"
          aria-label="Farbe für neues Fach"
        />
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Neues Fach (Name)"
          className="min-w-0 flex-1 bg-white rounded-lg border border-kh-border/60 px-2.5 py-1.5 text-[13px] font-semibold text-kh-dark focus:border-kh-teal focus:outline-none"
        />
        <input
          type="text"
          value={newShort}
          onChange={e => setNewShort(e.target.value)}
          placeholder="Kürzel"
          className="w-20 flex-shrink-0 bg-white rounded-lg border border-kh-border/60 px-2.5 py-1.5 text-[13px] font-semibold text-kh-dark focus:border-kh-teal focus:outline-none"
        />
        <button
          onClick={add}
          disabled={pending || !newLabel.trim() || !newShort.trim()}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full gradient-teal text-white text-[13px] font-bold hover:brightness-105 transition-[filter,opacity] duration-150 tap disabled:opacity-40"
        >
          <span className="msym text-[15px]">add</span>
          Hinzufügen
        </button>
      </div>
    </div>
  )
}
