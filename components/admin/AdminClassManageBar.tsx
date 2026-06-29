'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminRenameClass, adminDeleteClass } from '@/app/actions/adminManagement'

export default function AdminClassManageBar({ classId, name }: { classId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(name)
  const [loading, setLoading] = useState<'rename' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleRename() {
    if (!newName.trim() || newName.trim() === name) { setRenaming(false); return }
    setLoading('rename')
    try {
      await adminRenameClass(classId, newName.trim())
      router.refresh()
      setRenaming(false)
    } catch {}
    setLoading(null)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading('delete')
    try {
      await adminDeleteClass(classId)
      router.refresh()
    } catch {}
    setLoading(null)
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
          autoFocus
          className="border border-kh-teal rounded-lg px-2.5 py-1 text-base font-bold text-kh-dark focus:outline-none w-24"
        />
        <button
          onClick={handleRename}
          disabled={loading === 'rename'}
          className="text-[11px] font-bold text-white bg-kh-teal px-2.5 py-1 rounded-lg hover:bg-kh-dark transition disabled:opacity-60"
        >
          {loading === 'rename' ? '…' : 'OK'}
        </button>
        <button
          onClick={() => setRenaming(false)}
          className="text-[11px] font-bold text-kh-muted hover:text-kh-dark px-2 py-1 rounded-lg hover:bg-kh-page transition"
        >
          Abbrechen
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
        <div className="absolute right-0 top-9 bg-white border border-kh-border rounded-2xl shadow-lg py-1.5 z-20 min-w-[190px]">
          <Link
            href={`/admin/klassen/${classId}/schueler`}
            onClick={() => setOpen(false)}
            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition flex items-center gap-2"
          >
            <span className="msym text-[16px]">group</span>
            Schülerliste bearbeiten
          </Link>
          <button
            onClick={() => { setOpen(false); setNewName(name); setRenaming(true) }}
            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-kh-dark hover:bg-kh-page transition flex items-center gap-2"
          >
            <span className="msym text-[16px]">edit</span>
            Umbenennen
          </button>
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
        </div>
      )}
    </div>
  )
}
