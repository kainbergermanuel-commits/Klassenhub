'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { TodoWithStatus, Role } from '@/lib/types'

interface Props {
  todos: TodoWithStatus[]
  role: Role
  userId: string
  classId: string
  weekStart: string
  studentCount: number
}

export default function TodoList({ todos: initial, role, userId, classId, weekStart, studentCount }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [items, setItems] = useState(initial)
  const [input, setInput] = useState('')

  const done = items.filter(t => t.done)
  const open = items.filter(t => !t.done)

  const totalSlots = items.length * studentCount
  const totalDone = role === 'teacher'
    ? items.reduce((s, t) => s + (t.completion_count ?? 0), 0)
    : done.length
  const totalPossible = role === 'teacher' ? totalSlots : items.length
  const progress = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

  async function addTodo() {
    if (role !== 'teacher') return
    const title = input.trim()
    if (!title) return
    setInput('')
    const supabase = createClient()
    const { data } = await supabase
      .from('todos')
      .insert({ class_id: classId, title, week_start: weekStart, created_by: userId })
      .select()
      .single()
    if (data) setItems(prev => [...prev, { ...data, done: false, completion_count: 0 }])
    startTransition(() => router.refresh())
  }

  async function deleteTodo(id: string) {
    if (role !== 'teacher') return
    setItems(prev => prev.filter(t => t.id !== id))
    const supabase = createClient()
    await supabase.from('todos').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  async function toggleDone(id: string) {
    if (role !== 'student') return
    const todo = items.find(t => t.id === id)
    if (!todo) return
    const next = !todo.done
    setItems(prev => prev.map(t => t.id === id ? { ...t, done: next } : t))
    const supabase = createClient()
    if (next) {
      await supabase.from('todo_completions').upsert({ todo_id: id, student_id: userId })
    } else {
      await supabase.from('todo_completions').delete().match({ todo_id: id, student_id: userId })
    }
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {/* Progress */}
      <div className="kh-card p-5 mb-5">
        <div className="flex justify-between items-baseline mb-3">
          <span className="font-extrabold text-kh-dark text-base">
            {role === 'teacher' ? 'Aufgaben diese Woche' : 'Mein Fortschritt'}
          </span>
          <span className="font-extrabold text-kh-teal text-lg">
            {role === 'teacher' ? `${totalDone} / ${totalSlots}` : `${done.length} / ${items.length}`}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[#ECE6D9] overflow-hidden">
          <div
            className="h-full rounded-full gradient-teal transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-kh-muted font-medium mt-2">Setzt sich jeden Montag automatisch zurück</p>
      </div>

      {/* Teacher: add */}
      {role === 'teacher' && (
        <div className="flex gap-2 mb-5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="Neue Aufgabe für die Klasse…"
            className="flex-1 bg-white border border-kh-border rounded-full px-4 py-2.5 text-base font-medium text-kh-dark placeholder:text-[#B0BCBA] outline-none focus:border-kh-teal transition-colors"
          />
          <button
            onClick={addTodo}
            className="gradient-teal text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <span className="msym text-xl">add</span>
          </button>
        </div>
      )}

      {/* Open */}
      {open.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-2">Offen</div>
          <div className="flex flex-col gap-2">
            {open.map(todo => (
              <TodoRow key={todo.id} todo={todo} role={role} studentCount={studentCount} onToggle={toggleDone} onDelete={deleteTodo} />
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <div className="text-xs font-bold text-[#9AA6A4] uppercase tracking-[.6px] mb-2">Erledigt</div>
          <div className="flex flex-col gap-2">
            {done.map(todo => (
              <TodoRow key={todo.id} todo={todo} role={role} studentCount={studentCount} onToggle={toggleDone} onDelete={deleteTodo} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16 text-kh-muted">
          <span className="msym text-5xl block mb-3 text-kh-teal-light">checklist</span>
          <p className="font-medium">
            {role === 'teacher' ? 'Noch keine Aufgaben diese Woche gepostet.' : 'Die Lehrperson hat noch keine Aufgaben gepostet.'}
          </p>
        </div>
      )}
    </div>
  )
}

function TodoRow({ todo, role, studentCount, onToggle, onDelete }: {
  todo: TodoWithStatus
  role: Role
  studentCount: number
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 kh-card-flat px-4 py-3 group">
      {/* Checkbox — nur für Schüler klickbar */}
      <button
        onClick={() => role === 'student' && onToggle(todo.id)}
        disabled={role !== 'student'}
        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 disabled:cursor-default"
        style={todo.done
          ? { background: 'linear-gradient(135deg,#0F8A82,#3DB5AC)' }
          : { border: '2px solid #CBD5D3' }
        }
      >
        {todo.done && <span className="msym text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1,'wght' 700" }}>check</span>}
      </button>

      <span className={`flex-1 text-sm font-semibold transition-all duration-200 ${todo.done ? 'line-through text-kh-muted' : 'text-kh-dark'}`}>
        {todo.title}
      </span>

      {/* Lehrer: Erledigungszähler */}
      {role === 'teacher' && (
        <span className="text-xs font-bold text-kh-teal bg-kh-teal-light px-2.5 py-1 rounded-full flex-shrink-0">
          {todo.completion_count ?? 0}/{studentCount} erledigt
        </span>
      )}

      {/* Lehrer: löschen */}
      {role === 'teacher' && (
        <button
          onClick={() => onDelete(todo.id)}
          className="msym text-[18px] text-[#CBD5D3] hover:text-kh-red opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
        >
          close
        </button>
      )}

      {/* Elternteil: Status-Anzeige */}
      {role === 'parent' && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${todo.done ? 'bg-kh-green-light text-kh-green' : 'bg-[#ECE6D9] text-kh-muted'}`}>
          {todo.done ? 'Erledigt' : 'Offen'}
        </span>
      )}
    </div>
  )
}
