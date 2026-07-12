import Avatar from '@/components/ui/Avatar'
import { getSeasonTheme } from '@/lib/seasonTheme'
import type { Guild, GuildQuestResult } from '@/lib/guilds'

export interface GuildMember {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

interface Props {
  guild: Guild
  members: GuildMember[]
  quest: GuildQuestResult
  season: string
}

/** Kooperative Gilden-Quest: erfüllt, wenn ALLE Mitglieder mitziehen —
 *  bewusst kein Innen-Vergleich (wer hat schon, wer noch nicht), nur der
 *  gemeinsame Fortschritt. Siehe Gamification-Plan: Wettbewerb zwischen
 *  Gruppen, Kooperation innerhalb. */
export default function GuildQuestCard({ guild, members, quest, season }: Props) {
  const theme = getSeasonTheme(season)
  const narrative = quest.template.narrative.replace('{guide}', theme.guide)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="msym text-[19px] text-kh-violet" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
        <h2 className="font-extrabold text-base text-kh-dark">{guild.name}</h2>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {members.map(m => (
          <div key={m.id} title={m.full_name} className="flex-shrink-0">
            <Avatar name={m.full_name} color={m.avatar_color} seed={m.avatar_seed} hairColor={m.avatar_hair_color} skinColor={m.avatar_skin_color} size={26} />
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-[#FAF8F3] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`msym text-[18px] flex-shrink-0 ${quest.done ? 'text-kh-green' : 'text-kh-muted/50'}`}
            style={{ fontVariationSettings: `'FILL' ${quest.done ? 1 : 0}` }}
          >
            {quest.done ? 'task_alt' : 'radio_button_unchecked'}
          </span>
          <span className="font-semibold text-[14px] text-kh-dark flex-1 truncate">{quest.template.title}</span>
          <span className="text-[11px] font-bold text-kh-muted flex-shrink-0">{quest.membersMet}/{quest.total}</span>
        </div>
        <p className="text-[12px] text-kh-muted mt-1 pl-[26px]">{narrative}</p>
        <div className="mt-2 pl-[26px] flex gap-1">
          {Array.from({ length: quest.total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < quest.membersMet ? 'bg-kh-violet' : 'bg-kh-border/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
