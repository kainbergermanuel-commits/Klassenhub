'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getSeasonTheme, isCollectiveGuide, GUIDE_PORTRAIT } from '@/lib/seasonTheme'
import { chooseQuestPath } from '@/app/actions/chooseQuestPath'
import { weeklyFocusTag } from '@/lib/quests'
import { QUEST_FOCUS_LABELS, resolveQuestNarrative } from '@/lib/questVault'
import Avatar from '@/components/ui/Avatar'
import GuideInfoOverlay from '@/components/streaks/GuideInfoOverlay'
import type { QuestResult } from '@/lib/quests'
import type { Guild, GuildMember, GuildQuestResult } from '@/lib/guilds'

interface Props {
  quests: QuestResult[]
  weekStart: string
  season: string
  /** Guide-Portrait neben dem Titel zeigen. Auf der Startseite aus, weil
   *  dort `StoryHeroCard` das Guide-Bild schon groß zeigt. */
  showGuidePortrait?: boolean
  /** Kooperative Gilden-Quest — wird als eigener Block unter den Solo-Quests
   *  gezeigt (früher eigene Card). Kooperation innerhalb, kein Innen-Vergleich. */
  guildSection?: { guild: Guild; members: GuildMember[]; quest: GuildQuestResult } | null
}

function ChoiceButtons({ questKey, weekStart, choices }: { questKey: string; weekStart: string; choices: NonNullable<QuestResult['template']['choices']> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(choiceKey: string) {
    startTransition(async () => {
      await chooseQuestPath(weekStart, questKey, choiceKey)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {choices.map(c => (
        <button
          key={c.key}
          onClick={() => choose(c.key)}
          disabled={pending}
          className="flex items-center justify-between gap-2 text-left rounded-xl bg-white border border-kh-border/60 px-3 py-2 hover:border-kh-teal transition-colors disabled:opacity-50"
        >
          <span className="min-w-0">
            <span className="block font-semibold text-[13px] text-kh-dark">{c.label}</span>
            <span className="block text-[11.5px] text-kh-muted">{c.narrative}</span>
          </span>
          <span className="msym text-[16px] text-kh-teal flex-shrink-0">chevron_right</span>
        </button>
      ))}
    </div>
  )
}

export default function WeeklyQuestCard({ quests, weekStart, season, showGuidePortrait = true, guildSection }: Props) {
  if (quests.length === 0 && !guildSection) return null
  const theme = getSeasonTheme(season)
  const focus = weeklyFocusTag(weekStart)
  const portrait = showGuidePortrait ? GUIDE_PORTRAIT[theme.icon] : undefined
  const guildNarrative = guildSection ? guildSection.quest.template.narrative.replace('{guide}', theme.guide) : ''
  // Beim Kollektiv-Guide („Alle Guides gemeinsam") gibt es weder Vornamen noch
  // Rollen-Titel — dann trägt die Kachel den vollen Namen und die Frage im Plural.
  const team = isCollectiveGuide(theme.guide)
  const guideParts = theme.guide.split(' ')
  const guideTitle = team ? 'Wer sind sie' : guideParts.slice(0, -1).join(' ')
  const guideName = team ? 'Die Guides' : guideParts[guideParts.length - 1]
  const [guideInfoOpen, setGuideInfoOpen] = useState(false)

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
        <h2 className="font-extrabold text-base text-kh-dark">Wochen-Quests</h2>
        {portrait && (
          <button
            type="button"
            onClick={() => setGuideInfoOpen(true)}
            className="flex items-center gap-2 ml-auto text-left"
          >
            <span className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-[0_2px_6px_rgba(20,40,45,.18)]">
              <img src={portrait} alt="" className="absolute top-0 left-1/2 -translate-x-1/2 h-[430%] w-auto max-w-none" />
            </span>
            <span className="flex flex-col items-start gap-1">
              <span className="text-[17px] font-extrabold text-kh-dark tracking-tight leading-tight">{guideName}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-kh-border/60 bg-white px-2 py-0.5 text-[10px] font-bold text-kh-muted">
                <span className="msym text-[12px] text-kh-teal" aria-hidden="true">info</span>
                {guideTitle}?
              </span>
            </span>
          </button>
        )}
      </div>

      {guideInfoOpen && (
        <GuideInfoOverlay theme={theme} onClose={() => setGuideInfoOpen(false)} />
      )}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-kh-teal bg-kh-teal/10 px-2 py-0.5 rounded-full">
          <span className="msym text-[12px]">bolt</span>
          Fokus: {QUEST_FOCUS_LABELS[focus]}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {quests.length > 0 && quests.map(q => {
          // Nach einer Wahlpfad-Entscheidung zeigt die Anleitung des GEWÄHLTEN
          // Pfads (nicht mehr den allgemeinen "wähle deinen Weg"-Text) —
          // sonst sieht man nach der Wahl nicht mehr, was zu tun ist.
          // Wahlpfad-Antworten (chosenChoice) bleiben guide-neutral formuliert
          // (konkrete Anleitung, kein Erzähltext), nur die Vorlage selbst
          // bekommt die guide-eigene Stimme.
          const narrative = q.chosenChoice
            ? q.chosenChoice.narrative
            : resolveQuestNarrative(q.template.narrative, q.template.narrativeByGuide, theme.icon, theme.guide)
          const isMeister = q.template.tier === 'meister'
          return (
            <div
              key={q.template.key}
              className={`rounded-xl px-3 py-2.5 ${isMeister ? 'bg-kh-amber/[0.07] border border-kh-amber/25' : 'bg-[#FAF8F3]'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`msym text-[18px] flex-shrink-0 ${q.done ? 'text-kh-green' : 'text-kh-muted/50'}`}
                  style={{ fontVariationSettings: `'FILL' ${q.done ? 1 : 0}` }}
                >
                  {q.done ? 'task_alt' : 'radio_button_unchecked'}
                </span>
                <span className="font-semibold text-[14px] text-kh-dark truncate">{q.template.title}</span>
                {isMeister && (
                  <span className="flex items-center gap-0.5 text-[9.5px] font-extrabold text-kh-amber bg-kh-amber/15 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    <span className="msym text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                    Meister
                  </span>
                )}
                {q.chosenChoice && (
                  <span className="text-[10px] font-bold text-kh-teal bg-kh-teal/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    {q.chosenChoice.label}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-kh-muted mt-1 pl-[26px]">{narrative}</p>

              {q.needsChoice && q.template.choices && (
                <div className="pl-[26px]">
                  <ChoiceButtons questKey={q.template.key} weekStart={weekStart} choices={q.template.choices} />
                </div>
              )}

              {!q.needsChoice && q.parts.length > 0 && (
                <div className="flex flex-col gap-1 mt-2 pl-[26px]">
                  {q.parts.map(p => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="text-[11px] text-kh-muted flex-1 truncate">{p.label}</span>
                      <div className="w-16 h-1.5 rounded-full bg-kh-border/50 overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full bg-kh-teal transition-[width] duration-500"
                          style={{ width: `${(p.progress.current / p.progress.target) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10.5px] font-bold text-kh-muted flex-shrink-0 w-9 text-right">
                        {p.progress.current}/{p.progress.target}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {guildSection && (
          <div className="mt-1 rounded-xl border border-kh-violet/20 bg-kh-violet/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="msym text-[16px] text-kh-violet" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-kh-violet">Gilde</span>
              <span className="font-extrabold text-[13px] text-kh-dark ml-0.5">{guildSection.guild.name}</span>
              <span className="flex items-center -space-x-1.5 ml-auto flex-shrink-0">
                {guildSection.members.map(m => (
                  <span key={m.id} title={m.full_name} className="ring-2 ring-white rounded-full">
                    <Avatar name={m.full_name} color={m.avatar_color} seed={m.avatar_seed} hairColor={m.avatar_hair_color} skinColor={m.avatar_skin_color} size={22} />
                  </span>
                ))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`msym text-[18px] flex-shrink-0 ${guildSection.quest.done ? 'text-kh-green' : 'text-kh-muted/50'}`}
                style={{ fontVariationSettings: `'FILL' ${guildSection.quest.done ? 1 : 0}` }}
              >
                {guildSection.quest.done ? 'task_alt' : 'radio_button_unchecked'}
              </span>
              <span className="font-semibold text-[14px] text-kh-dark flex-1 truncate">{guildSection.quest.template.title}</span>
              {/* Bewusst OHNE „X von Y Mitgliedern": in einer Dreier-Gilde mit
                  Avataren daneben ist aus „1/2" erschließbar, wer nicht mitzieht.
                  Das ist die einzige Stelle im System, an der ein Vergleich
                  beschämen kann, und sie sitzt ausgerechnet im kooperativen Teil.
                  Der Balken darunter zeigt den Fortschritt weiterhin, nur ohne
                  Personenbezug (Groves et al. 2018: Gruppenkontingenz gegen ein
                  Kriterium wirkt prosozial, sichtbare Einzelzuordnung kippt es). */}
              <span className="text-[11px] font-bold text-kh-muted flex-shrink-0">
                {guildSection.quest.done
                  ? 'geschafft'
                  : `noch ${Math.max(1, (guildSection.quest.required ?? guildSection.quest.total) - guildSection.quest.membersMet)}`}
              </span>
            </div>
            <p className="text-[12px] text-kh-muted mt-1 pl-[26px]">{guildNarrative}</p>
            <div className="mt-2 pl-[26px] flex gap-1">
              {Array.from({ length: guildSection.quest.total }).map((_, i) => (
                <div
                  key={i}
                  title={guildSection.quest.required && i === guildSection.quest.required - 1 ? 'Ab hier ist die Quest geschafft' : undefined}
                  className={`h-1.5 flex-1 rounded-full ${i < guildSection.quest.membersMet ? 'bg-kh-violet' : 'bg-kh-border/50'} ${
                    guildSection.quest.required && i === guildSection.quest.required - 1 ? 'ring-2 ring-kh-violet/40 ring-offset-1' : ''
                  }`}
                />
              ))}
            </div>
            {guildSection.quest.collected && (
              <div className="mt-1.5 pl-[26px] flex items-center gap-2">
                <span className="text-[10.5px] text-kh-muted flex-1">Gemeinsam gesammelt</span>
                <span className="text-[10.5px] font-bold text-kh-violet flex-shrink-0">
                  {guildSection.quest.collected.current}/{guildSection.quest.collected.target} HÜ
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
