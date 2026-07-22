import { Sparkline } from '@/components/home/statParts'

/* ─── Typen (server-seitig in streaks/page.tsx befüllt) ──────────────────────── */

export interface ChildAdventureData {
  role: 'student' | 'parent'
  /** Eigene Woche (Schüler:in) bzw. die des Kindes (Elternteil). */
  self: { questsDone: number; questsTotal: number; flame: number; riddles: number; activeThisWeek: boolean }
  /** Anonyme Flammen-Längen-Verteilung der Klasse + der eigene Bucket-Index.
   *  Der dezente „Vergleich": Streuung + „du bist hier", KEIN Rang. */
  classFlame: { buckets: { label: string; count: number }[]; selfIndex: number }
  /** Dynamische Norm: wie viele diese Woche schon mitziehen + heutiger Zuwachs. */
  participation: { active: number; total: number; todayAdded: number }
  /** Kollektiver Beitrag zur Klassenreise (Zugehörigkeit statt Einzelvergleich). */
  goal: { done: number; target: number; selfContribution: number } | null
  /** Eigene HÜ-Bestätigungen der letzten Wochen (Selbstvergleich, kein Peer). */
  selfTrend: number[]
}

const FLAME_COLORS = ['#c4b9a4', '#E8A98F', '#E06B57', '#C98A2B', '#2E9C6E']

/**
 * „Du & die Klasse" (Schüler) / „Ihr Kind & die Klasse" (Eltern).
 *
 * Literaturgestützter, bewusst dezenter Klassenbezug — KEINE Rangliste
 * (Prinzip 1, Evidenz g=.771 ohne vs. .358 mit Leaderboard):
 *  1. Eigene Woche (selbstbezogen, kein Vergleich).
 *  2. Anonyme Verteilung mit „du bist hier"-Marker → Zugehörigkeit zu einem
 *     Cluster statt Platzierung (SDT-Relatedness, deskriptive Norm ohne
 *     Bloßstellen).
 *  3. Wärmende, anerkennende Zeile → injunktive + deskriptive Norm gemeinsam
 *     verhindern den Bumerang bei Über-dem-Schnitt (Schultz et al. 2007).
 *  4. Dynamische Norm „immer mehr ziehen mit" (Sparkman & Walton 2017) +
 *     kollektiver Beitrag (Kooperation vor Wettbewerb).
 * Eltern bekommen dieselbe Substanz, aber sachlich statt gamifiziert (Prinzip 5).
 */
export default function ChildAdventureStats({ data }: { data: ChildAdventureData }) {
  const isStudent = data.role === 'student'
  const who = isStudent ? 'Du' : 'Ihr Kind'
  const { self, classFlame, participation, goal } = data
  const goalPct = goal && goal.target > 0 ? Math.round((goal.done / goal.target) * 100) : 0

  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-[10px] bg-kh-teal/12 flex items-center justify-center flex-shrink-0">
          <span className="msym text-[18px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
        </span>
        <div className="min-w-0">
          <h2 className="font-extrabold text-[15px] text-kh-dark leading-tight">{isStudent ? 'Du & die Klasse' : 'Ihr Kind & die Klasse'}</h2>
          <p className="text-[11.5px] text-kh-muted font-medium">Gemeinsam unterwegs — kein Wettrennen</p>
        </div>
      </div>

      {/* 1 · Eigene Woche */}
      <div className="grid grid-cols-3 gap-2.5">
        <SelfTile icon="explore" color="#0F8A82" bg="#E0F0EE" value={`${self.questsDone}/${self.questsTotal}`} label="Quests" />
        <SelfTile icon="local_fire_department" color="#E06B57" bg="#FDECEA" value={`${self.flame}`} label="Flamme" />
        <SelfTile icon="extension" color="#C98A2B" bg="#F8ECD6" value={`${self.riddles}`} label="Rätsel" />
      </div>

      {/* 2 · Dezenter Klassenbezug: anonyme Verteilung mit „hier"-Marker */}
      <div className="mt-5">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="msym text-[15px] text-kh-muted" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          <h3 className="text-[12px] font-bold text-kh-dark">Wo die Klasse gerade steht</h3>
          <span className="ml-auto text-[10.5px] text-kh-muted font-medium">anonym · keine Rangliste</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {classFlame.buckets.map((b, i) => {
            const isSelf = i === classFlame.selfIndex
            const max = Math.max(...classFlame.buckets.map(x => x.count), 1)
            return (
              <div key={b.label} className="flex items-center gap-2.5">
                <span className={`w-[50px] flex-shrink-0 text-[11px] font-bold ${isSelf ? 'text-kh-dark' : 'text-kh-muted'}`}>{b.label}</span>
                <div className={`flex-1 h-[20px] rounded-[7px] bg-[#FAF8F3] overflow-hidden ${isSelf ? 'ring-2 ring-kh-teal/50' : ''}`}>
                  <div className="h-full rounded-[7px]"
                    style={{ width: `${Math.max(b.count === 0 ? 0 : 10, (b.count / max) * 100)}%`, background: FLAME_COLORS[i], transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
                {isSelf && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-kh-teal text-white px-2 py-0.5 text-[10px] font-extrabold">
                    <span className="msym text-[12px]">arrow_left</span>{isStudent ? 'du' : 'hier'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3 · Wärmende, anerkennende Zeile (injunktiv) */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-kh-teal/[0.07] px-3.5 py-3">
        <span className="msym text-[18px] text-kh-teal flex-shrink-0 mt-px" style={{ fontVariationSettings: "'FILL' 1" }}>
          {self.activeThisWeek ? 'favorite' : 'waving_hand'}
        </span>
        <p className="text-[12.5px] text-kh-dark/90 font-medium leading-relaxed">{nudge(data)}</p>
      </div>

      {/* 4 · Kollektiver Beitrag + dynamische Norm */}
      {goal && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <h3 className="text-[12px] font-bold text-kh-dark">Euer Beitrag zur Klassenreise</h3>
            <span className="text-[11.5px] font-bold text-kh-muted tabular-nums">{goal.done} / {goal.target}</span>
          </div>
          <div className="relative w-full h-2 rounded-full bg-[#FAF8F3] overflow-hidden">
            <div className="h-full rounded-full bg-kh-teal" style={{ width: `${goalPct}%`, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
          <p className="text-[11.5px] text-kh-muted font-medium mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="msym text-[14px] text-kh-teal">hiking</span>
            {/* Null-Fall NICHT als „0 von 15" zeigen — eine niedrige deskriptive
                Norm kippt ins Gegenteil (Bumerang). Stattdessen First-Mover-
                Einladung (dynamische Norm, Sparkman & Walton 2017). */}
            {participation.active === 0 ? (
              <span>Diese Woche zieht gleich die erste Etappe los — {isStudent ? 'sei mit dabei' : 'ein guter Moment für den ersten Schritt'}.</span>
            ) : (
              <>
                <b className="text-kh-dark font-extrabold tabular-nums">{participation.active}</b> von {participation.total} sind diese Woche schon unterwegs
                {participation.todayAdded > 0 && <span className="text-kh-teal font-bold">· heute {participation.todayAdded} neue Schritte</span>}
              </>
            )}
            {goal.selfContribution > 0 && <span className="w-full text-kh-muted">{who} {isStudent ? 'hast' : 'hat'} diesen Monat <b className="text-kh-dark">{goal.selfContribution}</b> {goal.selfContribution === 1 ? 'Schritt' : 'Schritte'} beigetragen.</span>}
          </p>
          {data.selfTrend.filter(v => v > 0).length >= 2 && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10.5px] font-bold text-kh-muted flex-shrink-0">{isStudent ? 'deine' : 'die'} letzten Wochen</span>
              <div className="w-[90px]"><Sparkline values={data.selfTrend} color="#0F8A82" max={Math.max(...data.selfTrend, 1)} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SelfTile({ icon, color, bg, value, label }: { icon: string; color: string; bg: string; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-[#FAF8F3] px-2 py-3 flex flex-col items-center text-center gap-1">
      <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: bg }}>
        <span className="msym text-[17px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </span>
      <span className="text-[17px] font-extrabold text-kh-dark leading-none tabular-nums mt-0.5">{value}</span>
      <span className="text-[10.5px] font-semibold text-kh-muted leading-none">{label}</span>
    </div>
  )
}

/** Injunktive, wärmende Zeile — nie beschämend, immer einladend. Verhindert
 *  gemeinsam mit der deskriptiven Verteilung den Bumerang (Schultz et al. 2007). */
function nudge(d: ChildAdventureData): string {
  const top = d.classFlame.selfIndex >= 3
  if (d.role === 'parent') {
    if (!d.self.activeThisWeek) return 'Diese Woche ist noch kein Schritt dabei — oft genügt ein kleiner gemeinsamer Anstoß, um wieder loszuziehen.'
    if (top) return 'Ihr Kind zieht verlässlich mit und trägt die ganze Klasse ein Stück weiter. Schön zu sehen.'
    return 'Ihr Kind ist diese Woche mit dabei — jeder Schritt bringt die Klasse näher ans Ziel.'
  }
  if (!d.self.activeThisWeek) return 'Die Klasse ist schon losgezogen — komm dazu, dein erster Schritt diese Woche zählt genauso viel wie jeder andere.'
  if (top) return 'Du ziehst stark mit — dein Beitrag hilft der ganzen Klasse, dem Ziel näherzukommen. Danke, dass du dranbleibst.'
  return 'Schön, dass du mitziehst. Gemeinsam kommt ihr der Schatzkammer mit jedem Schritt näher.'
}
