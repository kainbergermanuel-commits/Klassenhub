import type { Attendance } from '@/lib/types'

interface Props {
  entries: Attendance[]
  emptyText: string
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Read-only-Liste der eigenen Abwesenheiten (Schüler:innen-Sicht). */
export default function StudentList({ entries, emptyText }: Props) {
  return (
    <section className="kh-card p-5">
      <h2 className="font-extrabold text-[16px] text-kh-dark mb-3">Meine Abwesenheiten</h2>
      {entries.length === 0 && (
        <div className="text-kh-muted text-[14px] py-6 text-center">{emptyText}</div>
      )}
      <div className="space-y-1.5">
        {entries.map(e => {
          const pending = !e.confirmed_at
          const chip = pending
            ? { label: 'Gemeldet', color: '#C98A2B', bg: '#F8ECD6' }
            : e.status === 'entschuldigt'
              ? { label: 'Entschuldigt', color: '#2E9C6E', bg: '#DDF0E7' }
              : { label: 'Unentschuldigt', color: '#E06B57', bg: '#FDECEA' }
          return (
            <div key={e.id} className="kh-card-flat px-3.5 py-2.5 flex items-center gap-3">
              <div className="flex-1 font-bold text-[14px] text-kh-dark">{fmtDate(e.date)}</div>
              <span className="px-2.5 py-1 rounded-full text-[11.5px] font-bold" style={{ color: chip.color, background: chip.bg }}>
                {chip.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
