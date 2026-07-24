'use client'

import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import { Ring, Sparkline } from '@/components/home/statParts'

/* ─── Typen (server-seitig in streaks/page.tsx befüllt) ──────────────────────── */

export interface AdvKpis {
  activeCount: number
  totalCount: number
  questsDone: number
  questsTotal: number
  /** Quests protokolliert diese Woche minus Vorwoche (aus der Trend-Serie). */
  questsTrend: number
  riddlesSolved: number
  riddlesKids: number
  goalDone: number
  goalTarget: number
}
export interface AdvTrendPoint { label: string; quests: number; riddles: number; hw: number }
export interface AdvBucket { label: string; count: number }
export interface AdvWahlpfadOption { key: string; label: string; count: number }
export interface AdvWahlpfad { title: string | null; options: AdvWahlpfadOption[]; notChosen: number }
export interface AdvSplitter { awakened: number; total: number; found: boolean; signs: { label: string; awake: boolean }[] }
export interface AdvChild {
  id: string
  full_name: string
  avatar_color: string
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
  questsDone: number
  questsTotal: number
  riddlesSolved: number
  streak: number
  pathLabel: string | null
  trend: number[]
  idle: boolean
}
export interface AdventureData {
  worldName: string
  guideName: string
  kpis: AdvKpis
  trend: AdvTrendPoint[]
  flameBuckets: AdvBucket[]
  questBuckets: AdvBucket[]
  wahlpfad: AdvWahlpfad
  splitter: AdvSplitter
  children: AdvChild[]
}

/* ─── Kategorien (Filter) ─────────────────────────────────────────────────────
 * Steuern, welche Cockpit-Karten und Matrix-Spalten sichtbar sind. „Beteiligung"
 * (aktive Abenteurer) und der Wochen-Trend bleiben immer sichtbar — sie sind der
 * Rahmen, nicht eine Kategorie. */
type Cat = 'quests' | 'riddles' | 'flame' | 'wahlpfade' | 'klassenziel'
const CATS: { key: Cat; label: string; color: string }[] = [
  { key: 'quests', label: 'Quests', color: '#0F8A82' },
  { key: 'riddles', label: 'Rätsel', color: '#C98A2B' },
  { key: 'flame', label: 'Flamme', color: '#E06B57' },
  { key: 'wahlpfade', label: 'Wahlpfade', color: '#5965B8' },
  { key: 'klassenziel', label: 'Klassenziel', color: '#2E9C6E' },
]
const PATH_COLORS = ['#5965B8', '#C98A2B', '#0F8A82', '#E06B57']

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

export default function TeacherAdventurePanel({ data }: { data: AdventureData }) {
  const [view, setView] = useState<'overview' | 'kids'>('overview')
  const [search, setSearch] = useState('')
  const [cats, setCats] = useState<Set<Cat>>(new Set(CATS.map(c => c.key)))
  const on = (c: Cat) => cats.has(c)
  const toggle = (c: Cat) =>
    setCats(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c); else next.add(c)
      return next
    })

  const { active, idle } = useMemo(() => {
    const f = search.trim().toLowerCase()
    const match = (c: AdvChild) => c.full_name.toLowerCase().includes(f)
    return {
      active: data.children.filter(c => !c.idle && match(c)),
      idle: data.children.filter(c => c.idle && match(c)),
    }
  }, [data.children, search])

  const k = data.kpis

  return (
    <div className="grid lg:grid-cols-[210px_1fr] gap-5 items-start">
      {/* ── Filterleiste ── */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-7">
        <div className="kh-card p-4">
          <h3 className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-3">Kategorien</h3>
          <div className="flex flex-col gap-0.5">
            {CATS.map(c => (
              <label key={c.key} className="flex items-center gap-2.5 py-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={on(c.key)} onChange={() => toggle(c.key)} className="sr-only peer" />
                <span
                  className="w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ borderColor: on(c.key) ? c.color : '#E4DDCF', background: on(c.key) ? c.color : 'transparent' }}
                >
                  {on(c.key) && <span className="msym text-[13px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                </span>
                <span className="text-[13px] font-semibold text-kh-dark flex-1">{c.label}</span>
                <i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: c.color }} />
              </label>
            ))}
          </div>
        </div>

        <div className="kh-card p-4">
          <h3 className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted mb-2.5">Kind suchen</h3>
          <div className="flex items-center gap-2 rounded-xl border border-kh-border/70 bg-[#FAF8F3] px-2.5 py-2">
            <span className="msym text-[16px] text-kh-muted/70">search</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setView('kids') }}
              placeholder="Name …"
              className="w-full bg-transparent border-0 outline-none text-[13px] text-kh-dark placeholder:text-kh-muted/60"
            />
          </div>
          <p className="text-[10.5px] text-kh-muted font-medium mt-2.5 leading-snug">Sortierung nach Name — bewusst keine Rangliste.</p>
        </div>
      </aside>

      {/* ── Hauptbereich ── */}
      <div className="flex flex-col gap-5 min-w-0">
        {/* Kopf + Umschalter */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-kh-muted">Abenteuer-Nutzung</p>
            <h2 className="text-[21px] font-extrabold text-kh-dark tracking-tight leading-tight">Auf einen Blick</h2>
            <p className="text-[12.5px] text-kh-muted font-medium mt-0.5">
              Wie die Klasse {data.worldName} erlebt · anonym, ohne Vergleich
            </p>
          </div>
          <div
            className="ml-auto inline-flex overflow-hidden rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #FBF7EE 0%, #FFFFFF 100%)',
              boxShadow: '0 1px 2px rgba(20,40,45,.05), 0 10px 24px rgba(20,40,45,.14)',
            }}
          >
            <Tab active={view === 'overview'} onClick={() => setView('overview')} icon="dashboard">Überblick</Tab>
            <Tab active={view === 'kids'} onClick={() => setView('kids')} icon="groups">
              Kinder <span className="ml-1 rounded-full bg-kh-page px-1.5 text-[11px] font-bold tabular-nums text-kh-dark">{data.children.length}</span>
            </Tab>
          </div>
        </div>

        {view === 'overview' ? (
          <>
            {/* KPI-Reihe */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <KpiCard icon="groups" iconColor="#0F8A82" label="Aktive Abenteurer"
                value={`${k.activeCount}`} small={`/ ${k.totalCount}`}
                ring={{ pct: pct(k.activeCount, k.totalCount), color: '#0F8A82', text: `${pct(k.activeCount, k.totalCount)}%` }}
                foot={`${pct(k.activeCount, k.totalCount)}% mit Aktivität diese Woche`} />

              {on('quests') && (
                <KpiCard icon="explore" iconColor="#0F8A82" label="Quests erledigt"
                  value={`${k.questsDone}`} small={`/ ${k.questsTotal}`}
                  spark={{ values: data.trend.map(t => t.quests), color: '#0F8A82', max: Math.max(...data.trend.map(t => t.quests), 1) }}
                  foot={<><TrendPill delta={k.questsTrend} /> vs. Vorwoche</>} />
              )}

              {on('riddles') && (
                <KpiCard icon="extension" iconColor="#C98A2B" label="Rätsel gelöst"
                  value={`${k.riddlesSolved}`}
                  spark={{ values: data.trend.map(t => t.riddles), color: '#C98A2B', max: Math.max(...data.trend.map(t => t.riddles), 1) }}
                  foot={<><b className="text-kh-amber font-extrabold">{k.riddlesKids}</b> Kinder mit ≥1 Rätsel</>} />
              )}

              {on('klassenziel') && (
                <KpiCard icon="track_changes" iconColor="#2E9C6E" label="Klassenziel"
                  value={`${pct(k.goalDone, k.goalTarget)}`} small="%"
                  ring={{ pct: pct(k.goalDone, k.goalTarget), color: '#2E9C6E', text: `${pct(k.goalDone, k.goalTarget)}%` }}
                  foot={`${k.goalDone} / ${k.goalTarget} Schritte`} />
              )}
            </div>

            {/* Trend + Flammen-Verteilung */}
            <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
              <Card icon="show_chart" iconBg="#E0F0EE" iconColor="#0F8A82" title="Aktivität über die Wochen">
                <TrendChart data={data.trend} show={{ quests: on('quests'), riddles: on('riddles'), hw: true }} />
              </Card>

              {on('flame') && (
                <Card icon="local_fire_department" iconBg="#FDECEA" iconColor="#E06B57" title="Flammen-Längen" hint="anonym">
                  <HBars buckets={data.flameBuckets} colors={['#c4b9a4', '#E8A98F', '#E06B57', '#C98A2B', '#2E9C6E']} />
                </Card>
              )}
            </div>

            {/* Dreier-Grid: Quest-Erfüllung, Wahlpfade, Splitter */}
            <div className="grid md:grid-cols-3 gap-4">
              {on('quests') && (
                <Card icon="explore" iconBg="#E0F0EE" iconColor="#0F8A82" title="Quest-Erfüllung">
                  <HBars buckets={data.questBuckets} colors={['#c4b9a4', '#5DBDB4', '#0F8A82']} />
                  <p className="text-[11px] text-kh-muted font-medium mt-3">Wie viele der Wochen-Quests die Kinder geschafft haben.</p>
                </Card>
              )}

              {on('wahlpfade') && (
                <Card icon="alt_route" iconBg="#E6E8F6" iconColor="#5965B8" title="Wahlpfade">
                  <WahlpfadDonut w={data.wahlpfad} />
                </Card>
              )}

              {on('klassenziel') && (
                <Card icon="auto_awesome" iconBg="#F8ECD6" iconColor="#C98A2B" title="Splitter-Zeichen">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-extrabold text-kh-dark tabular-nums leading-none">{data.splitter.awakened}</span>
                    <span className="text-kh-muted font-bold text-[13px]">/ {data.splitter.total} erwacht</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {data.splitter.signs.map(s => (
                      <span key={s.label}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border"
                        style={s.awake
                          ? { background: '#F8ECD6', color: '#C98A2B', borderColor: 'transparent' }
                          : { background: '#FAF8F3', color: '#6E7E80', borderColor: '#E4DDCF' }}>
                        {s.label}{s.awake && ' ✦'}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-kh-muted font-medium mt-3.5">Erwacht automatisch, sobald die Klasse eine Welt abschließt.</p>
                </Card>
              )}
            </div>
          </>
        ) : (
          /* ── Kinder-Matrix ── */
          <div className="kh-card p-1.5">
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <span className="w-8 h-8 rounded-[10px] bg-kh-teal/12 flex items-center justify-center flex-shrink-0">
                <span className="msym text-[18px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </span>
              <h2 className="font-extrabold text-[14.5px] text-kh-dark">Kinder im Abenteuer</h2>
              <span className="ml-auto text-[11px] text-kh-muted font-medium">Sortiert nach Name · kein Ranking</span>
            </div>

            <MatrixHeader cats={cats} />
            {active.map(c => <MatrixRow key={c.id} c={c} cats={cats} />)}

            {idle.length > 0 && (
              <>
                <div className="flex items-center gap-3 px-3.5 pt-4 pb-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-kh-muted">Diese Woche noch nicht gestartet</h3>
                  <span className="flex-1 h-px bg-kh-border/70" />
                  <span className="rounded-full bg-[#FAF8F3] text-kh-muted px-2 py-0.5 text-[11px] font-bold tabular-nums">{idle.length}</span>
                </div>
                {idle.map(c => <MatrixRow key={c.id} c={c} cats={cats} />)}
              </>
            )}

            {active.length === 0 && idle.length === 0 && (
              <p className="text-[13px] text-kh-muted font-medium text-center py-8">Kein Kind gefunden.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Bausteine ──────────────────────────────────────────────────────────────── */

/** Umschalter im selben schlanken Stil wie der Stundenplan-Tab (siehe
 *  app/(app)/stundenplan/page.tsx): Verlaufs-Unterstrich statt gefüllter
 *  Fläche für den aktiven Zustand — Icons und der Kinder-Zähler bleiben. */
function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold transition-colors ${
        active ? 'text-[#2F86C5]' : 'text-kh-muted hover:text-kh-dark'
      }`}
      style={active
        ? {
            backgroundImage: 'linear-gradient(90deg, #2F86C5 0%, #56AEE6 100%)',
            backgroundSize: '100% 3px',
            backgroundPosition: 'bottom',
            backgroundRepeat: 'no-repeat',
          }
        : undefined}
    >
      <span className="msym text-[16px]">{icon}</span>{children}
    </button>
  )
}

function Card({ icon, iconBg, iconColor, title, hint, children }: {
  icon: string; iconBg: string; iconColor: string; title: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="kh-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <span className="msym text-[16px]" style={{ color: iconColor, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </span>
        <h2 className="font-extrabold text-[14px] text-kh-dark">{title}</h2>
        {hint && <span className="ml-auto text-[11px] text-kh-muted font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function KpiCard({ icon, iconColor, label, value, small, ring, spark, foot }: {
  icon: string; iconColor: string; label: string; value: string; small?: string
  ring?: { pct: number; color: string; text: string }
  spark?: { values: number[]; color: string; max: number }
  foot: React.ReactNode
}) {
  return (
    <div className="kh-card p-4 relative overflow-hidden">
      <div className={`flex items-center gap-1.5 text-[11.5px] font-bold text-kh-muted ${ring ? 'pr-11' : ''}`}>
        <span className="msym text-[15px] flex-shrink-0" style={{ color: iconColor }}>{icon}</span>
        <span className="min-w-0">{label}</span>
      </div>
      <div className="mt-2 text-[30px] font-extrabold text-kh-dark tracking-tight leading-none tabular-nums">
        {value}{small && <span className="text-[15px] font-bold text-kh-muted ml-0.5">{small}</span>}
      </div>
      {ring && (
        <div className="absolute right-3 top-3 scale-[0.72] origin-top-right">
          <Ring pct={ring.pct} color={ring.color}><span className="text-[13px] font-extrabold text-kh-dark tabular-nums">{ring.text}</span></Ring>
        </div>
      )}
      {spark && <div className="mt-2.5"><Sparkline values={spark.values} color={spark.color} max={spark.max} /></div>}
      <div className="text-[11.5px] font-semibold text-kh-muted mt-2.5 flex items-center gap-1">{foot}</div>
    </div>
  )
}

function TrendPill({ delta }: { delta: number }) {
  if (delta === 0) return <span className="font-bold text-kh-muted">±0</span>
  const up = delta > 0
  const color = up ? '#2E9C6E' : '#C2564B'
  return (
    <span className="inline-flex items-center font-extrabold" style={{ color }}>
      <span className="msym text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{up ? 'arrow_upward' : 'arrow_downward'}</span>
      {Math.abs(delta)}
    </span>
  )
}

/** Horizontale Verteilungs-Balken mit sichtbarer Anzahl (Lehrer-Klarheit,
 *  nicht hover-versteckt wie DistributionStrip in der schmalen Nav). */
function HBars({ buckets, colors }: { buckets: AdvBucket[]; colors: string[] }) {
  const max = Math.max(...buckets.map(b => b.count), 1)
  return (
    <div className="flex flex-col gap-2">
      {buckets.map((b, i) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="w-[52px] flex-shrink-0 text-[11.5px] font-bold text-kh-muted">{b.label}</span>
          <div className="flex-1 h-[22px] rounded-[7px] bg-[#FAF8F3] overflow-hidden">
            <div className="h-full rounded-[7px] flex items-center pl-2.5 text-[11px] font-extrabold text-white"
              style={{ width: `${Math.max(b.count === 0 ? 0 : 12, (b.count / max) * 100)}%`, background: colors[i] ?? '#0F8A82', transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)' }}>
              {b.count > 0 && b.count}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TrendChart({ data, show }: { data: AdvTrendPoint[]; show: { quests: boolean; riddles: boolean; hw: boolean } }) {
  const w = 560, h = 170, pad = 14
  const max = Math.max(1, ...data.flatMap(d => [show.quests ? d.quests : 0, show.riddles ? d.riddles : 0, show.hw ? d.hw : 0]))
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * w
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2)
  const path = (key: keyof AdvTrendPoint) => data.map((d, i) => `${x(i)},${y(d[key] as number)}`).join(' ')
  const series: { key: keyof AdvTrendPoint; color: string; label: string; vis: boolean }[] = [
    { key: 'quests', color: '#0F8A82', label: 'Quests', vis: show.quests },
    { key: 'riddles', color: '#C98A2B', label: 'Rätsel', vis: show.riddles },
    { key: 'hw', color: '#E06B57', label: 'Bestätigte HÜ', vis: show.hw },
  ]
  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
        {[0.2, 0.5, 0.8].map(f => <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="#E4DDCF" strokeWidth={1} />)}
        {series.filter(s => s.vis).map(s => (
          <g key={s.key}>
            <polyline points={path(s.key)} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <circle cx={x(data.length - 1)} cy={y(data[data.length - 1][s.key] as number)} r={3.5} fill={s.color} />
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10.5px] font-bold text-kh-muted mt-2">
        {data.map(d => <span key={d.label}>{d.label}</span>)}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3">
        {series.filter(s => s.vis).map(s => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-kh-muted">
            <i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function WahlpfadDonut({ w }: { w: AdvWahlpfad }) {
  const total = w.options.reduce((s, o) => s + o.count, 0)
  const R = 15.9, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex items-center gap-4">
      <svg width="92" height="92" viewBox="0 0 42 42" className="flex-shrink-0">
        <circle cx="21" cy="21" r={R} fill="none" stroke="#FAF8F3" strokeWidth="7" />
        {total > 0 && w.options.map((o, i) => {
          const frac = o.count / total
          const seg = (
            <circle key={o.key} cx="21" cy="21" r={R} fill="none" stroke={PATH_COLORS[i % PATH_COLORS.length]} strokeWidth="7"
              strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 21 21)" />
          )
          acc += frac
          return seg
        })}
        <text x="21" y="20.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#15363F">{total}</text>
        <text x="21" y="26.5" textAnchor="middle" fontSize="3.3" fontWeight="700" fill="#6E7E80">gewählt</text>
      </svg>
      <div className="flex flex-col gap-2 text-[12.5px] min-w-0">
        {w.options.map((o, i) => (
          <div key={o.key} className="flex items-center gap-2 font-bold">
            <i className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: PATH_COLORS[i % PATH_COLORS.length] }} />
            <span className="truncate text-kh-dark">{o.label}</span><b className="ml-auto tabular-nums">{o.count}</b>
          </div>
        ))}
        {w.notChosen > 0 && <span className="text-[11.5px] text-kh-muted font-medium">{w.notChosen} noch nicht gewählt</span>}
        {!w.title && <span className="text-[11.5px] text-kh-muted font-medium">Diese Woche kein Wahlpfad aktiv.</span>}
      </div>
    </div>
  )
}

function MatrixHeader({ cats }: { cats: Set<Cat> }) {
  return (
    <div className="grid items-center gap-3 px-3.5 py-2 border-b border-kh-border/70 text-[10px] font-extrabold uppercase tracking-wide text-kh-muted"
      style={{ gridTemplateColumns: matrixCols(cats) }}>
      <span>Kind</span>
      {cats.has('quests') && <span>Quests</span>}
      {cats.has('riddles') && <span className="max-md:hidden">Rätsel</span>}
      {cats.has('flame') && <span>Flamme</span>}
      {cats.has('wahlpfade') && <span className="max-md:hidden">Wahlpfad · Trend</span>}
    </div>
  )
}

function matrixCols(cats: Set<Cat>) {
  const c = ['1.6fr']
  if (cats.has('quests')) c.push('0.9fr')
  if (cats.has('riddles')) c.push('minmax(0,0.8fr)')
  if (cats.has('flame')) c.push('0.7fr')
  if (cats.has('wahlpfade')) c.push('1.2fr')
  return c.join(' ')
}

function MatrixRow({ c, cats }: { c: AdvChild; cats: Set<Cat> }) {
  return (
    <div className={`grid items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[#FAF8F3] ${c.idle ? 'opacity-70' : ''}`}
      style={{ gridTemplateColumns: matrixCols(cats) }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={c.full_name} color={c.avatar_color} seed={c.avatar_seed} hairColor={c.avatar_hair_color} skinColor={c.avatar_skin_color} size={32} />
        <span className="font-bold text-[13.5px] text-kh-dark truncate">{c.full_name}</span>
      </div>

      {cats.has('quests') && (
        <div className="flex items-center gap-2">
          <MiniQuestRing done={c.questsDone} total={c.questsTotal} />
          <span className="text-[12.5px] font-bold text-kh-muted tabular-nums">{c.questsDone}/{c.questsTotal}</span>
        </div>
      )}

      {cats.has('riddles') && (
        <div className="max-md:hidden">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F3] border border-kh-border/70 px-2 py-0.5 text-[11.5px] font-bold text-kh-muted">
            <span className="msym text-[13px] text-kh-amber">extension</span>{c.riddlesSolved}
          </span>
        </div>
      )}

      {cats.has('flame') && (
        <div className="flex items-center gap-1.5">
          <span className="msym text-[16px]" style={{ color: c.streak > 0 ? '#E06B57' : '#c4b9a4', fontVariationSettings: c.streak > 0 ? "'FILL' 1" : "'FILL' 0" }}>local_fire_department</span>
          <span className="text-[13px] font-extrabold tabular-nums" style={{ color: c.streak > 0 ? '#E06B57' : '#a9b1b1' }}>{c.streak}</span>
        </div>
      )}

      {cats.has('wahlpfade') && (
        <div className="max-md:hidden flex items-center gap-3 min-w-0">
          {c.idle ? (
            <span className="rounded-full bg-[#FDECEA] text-kh-red px-2.5 py-0.5 text-[10.5px] font-extrabold">noch nicht gestartet</span>
          ) : (
            <>
              {c.pathLabel
                ? <span className="rounded-full bg-[#E6E8F6] text-kh-violet px-2.5 py-0.5 text-[11px] font-bold truncate">{c.pathLabel}</span>
                : <span className="text-[11px] text-kh-muted/70 font-semibold">—</span>}
              <div className="w-[64px] flex-shrink-0"><Sparkline values={c.trend} color={c.avatar_color} max={Math.max(...c.trend, 1)} /></div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MiniQuestRing({ done, total }: { done: number; total: number }) {
  const r = 11, C = 2 * Math.PI * r, off = C - (total > 0 ? done / total : 0) * C
  return (
    <svg width="28" height="28" viewBox="0 0 30 30" className="flex-shrink-0">
      <circle cx="15" cy="15" r={r} fill="none" stroke="#FAF8F3" strokeWidth="4" />
      <circle cx="15" cy="15" r={r} fill="none" stroke="#0F8A82" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 15 15)" />
    </svg>
  )
}
