'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetPassword, deleteUser } from '@/app/actions/userManagement'

export default function KlasseManageBar({ profileId, fullName }: { profileId: string; fullName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState<'reset' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleReset() {
    setLoading('reset')
    try {
      const { password } = await resetPassword(profileId)
      setNewPassword(password)
    } catch {}
    setLoading(null)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading('delete')
    try {
      await deleteUser(profileId)
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
        <div className="absolute right-0 top-9 bg-white border border-kh-border rounded-2xl shadow-lg py-1.5 z-20 min-w-[160px]">
          <button
            onClick={handleReset}
            disabled={loading === 'reset'}
            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition flex items-center gap-2 disabled:opacity-60"
          >
            <span className="msym text-[16px]">lock_reset</span>
            {loading === 'reset' ? 'Wird zurückgesetzt…' : 'Passwort zurücksetzen'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading === 'delete'}
            className={`w-full text-left px-4 py-2 text-[13px] font-semibold transition flex items-center gap-2 disabled:opacity-60 ${
              confirmDelete ? 'text-kh-red bg-kh-red-light' : 'text-kh-muted hover:bg-kh-page'
            }`}
          >
            <span className="msym text-[16px]">delete</span>
            {loading === 'delete' ? 'Wird gelöscht…' : confirmDelete ? `Wirklich löschen?` : 'Löschen'}
          </button>
        </div>
      )}
    </div>
  )
}
