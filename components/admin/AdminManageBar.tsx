'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminResetPassword, adminDeleteUser, adminUpdateTeacherClasses } from '@/app/actions/adminManagement'

interface Class { id: string; name: string; school: string }

export default function AdminManageBar({
  profileId,
  fullName,
  classes = [],
  assignedClassIds = [],
  primaryClassId: initialPrimaryClassId,
  currentUserId,
}: {
  profileId: string
  fullName: string
  classes?: Class[]
  assignedClassIds?: string[]
  primaryClassId?: string
  currentUserId?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState<'reset' | 'delete' | 'classes' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingClasses, setEditingClasses] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(assignedClassIds)
  const [primaryClassId, setPrimaryClassId] = useState<string>(initialPrimaryClassId ?? '')
  const [classError, setClassError] = useState<string | null>(null)
  const [classSaved, setClassSaved] = useState(false)

  async function handleReset() {
    setLoading('reset')
    try {
      const { password } = await adminResetPassword(profileId)
      setNewPassword(password)
    } catch {}
    setLoading(null)
  }

  async function handleEditClasses() {
    setOpen(false)
    setSelectedClassIds(assignedClassIds)
    setPrimaryClassId(initialPrimaryClassId ?? '')
    setEditingClasses(true)
  }

  async function handleSaveClasses() {
    setLoading('classes')
    setClassError(null)
    try {
      await adminUpdateTeacherClasses(profileId, selectedClassIds, primaryClassId)
      router.refresh()
      setClassSaved(true)
      setTimeout(() => { setClassSaved(false); setEditingClasses(false) }, 1200)
    } catch (e) {
      setClassError((e as Error).message ?? 'Unbekannter Fehler')
    }
    setLoading(null)
  }

  function toggleClass(id: string) {
    setSelectedClassIds(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      if (id === primaryClassId && !next.includes(id)) {
        setPrimaryClassId('')
      }
      return next
    })
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading('delete')
    try {
      await adminDeleteUser(profileId)
      router.refresh()
    } catch {}
    setLoading(null)
  }

  if (newPassword) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="text-[10px] text-kh-muted font-semibold">Neues Passwort</div>
        <div className="font-mono text-[13px] font-bold text-kh-dark bg-kh-page rounded-lg px-2.5 py-1 border border-kh-border">{newPassword}</div>
        <button onClick={() => setNewPassword(null)} className="text-[10px] text-kh-muted hover:text-kh-dark font-semibold">
          OK
        </button>
      </div>
    )
  }

  if (editingClasses) {
    if (classSaved) {
      return (
        <div className="flex items-center gap-1.5 text-kh-green font-semibold text-[12px]">
          <span className="msym text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Gespeichert
        </div>
      )
    }

    return (
      <div className="flex flex-col items-end gap-1.5 max-w-[160px]">
        <div className="flex w-full items-center mb-0.5">
          <div className="text-[10px] text-kh-muted font-bold uppercase tracking-wide flex-1">Klassen</div>
          <div className="text-[10px] text-kh-muted font-bold uppercase tracking-wide w-6 text-center">KV</div>
        </div>
        <div className="flex flex-col gap-0.5 w-full">
          {classes.map(c => (
            <div key={c.id} className="flex items-center">
              <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedClassIds.includes(c.id)}
                  onChange={() => toggleClass(c.id)}
                  className="w-3.5 h-3.5 accent-kh-teal shrink-0"
                />
                <span className="text-[12px] font-semibold text-kh-dark truncate">{c.name}</span>
              </label>
              <div className="w-6 flex justify-center">
                <input
                  type="radio"
                  name={`primary-${profileId}`}
                  checked={primaryClassId === c.id}
                  onChange={() => setPrimaryClassId(c.id)}
                  disabled={!selectedClassIds.includes(c.id)}
                  className="w-3.5 h-3.5 accent-kh-teal shrink-0 disabled:opacity-20"
                />
              </div>
            </div>
          ))}
          <div className="flex items-center mt-0.5">
            <span className="text-[11px] font-medium text-kh-muted flex-1 text-right pr-1.5">Kein KV</span>
            <div className="w-6 flex justify-center">
              <input
                type="radio"
                name={`primary-${profileId}`}
                checked={primaryClassId === ''}
                onChange={() => setPrimaryClassId('')}
                className="w-3.5 h-3.5 accent-kh-teal shrink-0"
              />
            </div>
          </div>
        </div>
        {classError && (
          <div className="text-[11px] text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-2 py-1 w-full">
            {classError}
          </div>
        )}
        <div className="flex gap-1.5 mt-0.5">
          <button
            onClick={() => setEditingClasses(false)}
            className="text-[11px] font-bold text-kh-muted hover:text-kh-dark px-2.5 py-1 rounded-lg hover:bg-kh-page transition"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSaveClasses}
            disabled={loading === 'classes'}
            className="text-[11px] font-bold text-white bg-kh-teal px-2.5 py-1 rounded-lg hover:bg-kh-dark transition disabled:opacity-60"
          >
            {loading === 'classes' ? '…' : 'Speichern'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setConfirmDelete(false) }} />
      )}
      <button
        onClick={() => { setOpen(o => !o); setConfirmDelete(false) }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-kh-page transition text-kh-muted"
      >
        <span className="msym text-[20px]">more_vert</span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 bg-white border border-kh-border rounded-2xl shadow-lg py-1.5 z-20 min-w-[180px]">
          {classes.length > 0 && (
            <button
              onClick={handleEditClasses}
              className="w-full text-left px-4 py-2 text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition flex items-center gap-2"
            >
              <span className="msym text-[16px]">group</span>
              Klassen bearbeiten
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={loading === 'reset'}
            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition flex items-center gap-2 disabled:opacity-60"
          >
            <span className="msym text-[16px]">lock_reset</span>
            {loading === 'reset' ? 'Wird zurückgesetzt…' : 'Passwort zurücksetzen'}
          </button>
          {currentUserId !== profileId && (
            <button
              onClick={handleDelete}
              disabled={loading === 'delete'}
              className={`w-full text-left px-4 py-2 text-[13px] font-semibold transition flex items-center gap-2 disabled:opacity-60 ${
                confirmDelete ? 'text-kh-red bg-kh-red-light' : 'text-kh-muted hover:bg-kh-page'
              }`}
            >
              <span className="msym text-[16px]">delete</span>
              {loading === 'delete' ? 'Wird gelöscht…' : confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
