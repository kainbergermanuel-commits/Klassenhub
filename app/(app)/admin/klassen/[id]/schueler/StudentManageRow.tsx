'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import {
  adminRenameStudent,
  adminMoveStudent,
  adminResetPassword,
  adminDeleteUser,
} from '@/app/actions/adminManagement'

interface Student {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

interface Props {
  student: Student
  classId: string
  otherClasses: { id: string; name: string }[]
}

type Mode = null | 'rename' | 'move' | 'reset' | 'delete'

export default function StudentManageRow({ student: s, classId, otherClasses }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState(s.full_name)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function close() { setMode(null); setOpen(false) }

  async function run(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn(); router.refresh(); close() } catch {}
    setLoading(false)
  }

  return (
    <div className={`bg-white rounded-2xl px-4 py-3 shadow-sm ${mode ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar
          name={s.full_name}
          color={s.avatar_color}
          seed={s.avatar_seed}
          hairColor={s.avatar_hair_color}
          skinColor={s.avatar_skin_color}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14px] text-kh-dark truncate">{s.full_name}</div>
        </div>
        <div className="relative">
          {open && <div className="fixed inset-0 z-10" onClick={close} />}
          <button
            onClick={() => setOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-kh-page transition text-kh-muted"
          >
            <span className="msym text-[20px]">more_vert</span>
          </button>
          {open && (
            <div className="absolute right-0 top-9 bg-white border border-kh-border rounded-2xl shadow-lg py-1.5 z-20 min-w-[190px]">
              {[
                { key: 'rename', icon: 'edit',       label: 'Umbenennen' },
                { key: 'reset',  icon: 'lock_reset',  label: 'Passwort zurücksetzen' },
                ...(otherClasses.length > 0 ? [{ key: 'move', icon: 'swap_horiz', label: 'Klasse wechseln' }] : []),
                { key: 'delete', icon: 'delete',      label: 'Löschen' },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => { setOpen(false); setMode(item.key as Mode) }}
                  className={`w-full text-left px-4 py-2 text-[13px] font-semibold flex items-center gap-2 hover:bg-kh-page transition ${item.key === 'delete' ? 'text-kh-muted' : 'text-kh-dark'}`}
                >
                  <span className="msym text-[16px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline panels */}
      {mode === 'rename' && (
        <div className="mt-3 pt-3 border-t border-kh-border flex gap-2 items-center">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run(() => adminRenameStudent(s.id, newName)); if (e.key === 'Escape') close() }}
            autoFocus
            className="flex-1 rounded-xl border border-kh-border px-3 py-2 text-sm font-medium text-kh-dark focus:outline-none focus:ring-2 focus:ring-kh-teal/40 focus:border-kh-teal"
          />
          <button onClick={() => run(() => adminRenameStudent(s.id, newName))} disabled={loading} className="text-[12px] font-bold text-white bg-kh-teal px-3 py-2 rounded-xl hover:bg-kh-dark transition disabled:opacity-60">
            {loading ? '…' : 'OK'}
          </button>
          <button onClick={close} className="text-[12px] font-bold text-kh-muted hover:text-kh-dark px-2 py-2 rounded-xl hover:bg-kh-page transition">Abbrechen</button>
        </div>
      )}

      {mode === 'reset' && !newPassword && (
        <div className="mt-3 pt-3 border-t border-kh-border flex gap-2 justify-end">
          <button onClick={close} className="text-[12px] font-bold text-kh-muted hover:text-kh-dark px-3 py-2 rounded-xl hover:bg-kh-page transition">Abbrechen</button>
          <button
            onClick={async () => {
              setLoading(true)
              try { const { password } = await adminResetPassword(s.id); setNewPassword(password) } catch {}
              setLoading(false)
            }}
            disabled={loading}
            className="text-[12px] font-bold text-white bg-kh-teal px-3 py-2 rounded-xl hover:bg-kh-dark transition disabled:opacity-60"
          >
            {loading ? '…' : 'Passwort zurücksetzen'}
          </button>
        </div>
      )}

      {mode === 'reset' && newPassword && (
        <div className="mt-3 pt-3 border-t border-kh-border flex items-center justify-between gap-3">
          <div className="text-xs text-kh-muted font-semibold">Neues Passwort</div>
          <div className="font-mono text-sm font-bold text-kh-dark bg-kh-page rounded-lg px-3 py-1 border border-kh-border">{newPassword}</div>
          <button onClick={close} className="text-[11px] font-bold text-kh-muted hover:text-kh-dark">OK</button>
        </div>
      )}

      {mode === 'move' && (
        <div className="mt-3 pt-3 border-t border-kh-border">
          <div className="text-xs text-kh-muted font-semibold mb-2">In welche Klasse verschieben?</div>
          <div className="flex flex-col gap-1.5">
            {otherClasses.map(c => (
              <button
                key={c.id}
                onClick={() => run(() => adminMoveStudent(s.id, c.id))}
                disabled={loading}
                className="text-left px-3 py-2 rounded-xl border border-kh-border text-sm font-semibold text-kh-dark hover:border-kh-teal hover:bg-kh-teal-light transition disabled:opacity-60"
              >
                Klasse {c.name}
              </button>
            ))}
            <button onClick={close} className="text-[12px] font-bold text-kh-muted hover:text-kh-dark px-2 py-1 text-left">Abbrechen</button>
          </div>
        </div>
      )}

      {mode === 'delete' && (
        <div className="mt-3 pt-3 border-t border-kh-border flex gap-2 justify-end items-center">
          <span className="text-xs text-kh-muted font-semibold flex-1">Account wirklich löschen?</span>
          <button onClick={close} className="text-[12px] font-bold text-kh-muted hover:text-kh-dark px-3 py-2 rounded-xl hover:bg-kh-page transition">Abbrechen</button>
          <button
            onClick={() => run(() => adminDeleteUser(s.id))}
            disabled={loading}
            className="text-[12px] font-bold text-white bg-kh-red px-3 py-2 rounded-xl hover:opacity-80 transition disabled:opacity-60"
          >
            {loading ? '…' : 'Löschen'}
          </button>
        </div>
      )}
    </div>
  )
}
