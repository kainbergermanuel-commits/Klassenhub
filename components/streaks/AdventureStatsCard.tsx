import Avatar from '@/components/ui/Avatar'

interface StudentStat {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  questsDone: number
  questsTotal: number
  hwConfirmed: number
  riddlesSolved: number
}

/** Abenteuer-Statistik auf /streaks: pro Kind ein Zeilen-Snapshot dieser Woche
 *  (Quests, bestätigte HÜ diese Season, gelöste Rätsel) — schlichte Info statt
 *  Gamifizierung der Lehrkraft-/Eltern-Ansicht (Prinzip 5: nur Schüler:innen
 *  werden bespielt). Kein Ranking/Sortierung nach Leistung.
 *
 *  Wiederverwendet für beide Rollen: Lehrpersonen sehen die ganze Klasse
 *  (mehrere Zeilen), Eltern nur eine einzige Zeile — ihr eigenes Kind (die
 *  Filterung passiert bereits server-seitig in streaks/page.tsx, hier kommt
 *  für Eltern nie mehr als ein Eintrag an). */
export default function AdventureStatsCard({ students, title = 'Diese Woche im Überblick' }: { students: StudentStat[]; title?: string }) {
  if (students.length === 0) return null

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
        <h2 className="font-extrabold text-base text-kh-dark">{title}</h2>
      </div>
      <div className="flex flex-col gap-1.5">
        {students.map(s => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5">
            <Avatar name={s.full_name} color={s.avatar_color} seed={s.avatar_seed} hairColor={s.avatar_hair_color} skinColor={s.avatar_skin_color} size={30} />
            <span className="min-w-0 flex-1 font-semibold text-[13px] text-kh-dark truncate">{s.full_name}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Stat icon="explore" label={`${s.questsDone}/${s.questsTotal}`} title="Wochen-Quests erledigt (diese Woche)" />
              <Stat icon="task_alt" label={`${s.hwConfirmed}`} title="Hausübungen bestätigt (diese Woche)" />
              <Stat icon="extension" label={`${s.riddlesSolved}`} title="Rätsel gelöst (insgesamt)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ icon, label, title }: { icon: string; label: string; title: string }) {
  return (
    <span
      title={title}
      className="flex items-center gap-1 rounded-full bg-white border border-kh-border/60 px-2 py-1 text-[11px] font-bold text-kh-muted"
    >
      <span className="msym text-[13px] text-kh-teal">{icon}</span>
      {label}
    </span>
  )
}
