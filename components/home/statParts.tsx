'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

/** Prozent-Anteil, gerundet, 0 bei Nenner 0. */
export const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

/* ─── Motion-Helfer ────────────────────────────────────────────────────────── */

/** Respektiert die System-Einstellung "Bewegung reduzieren". */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Gibt beim ersten Frame 0 zurück, danach den Zielwert — damit Ringe und Balken
 * beim Laden von 0 auf ihren Wert wachsen (vorher stand der Endwert sofort da,
 * die CSS-Transition lief also nie).
 */
function useGrowIn(target: number) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (reduced) { setValue(target); return }
    const id = requestAnimationFrame(() => setValue(target))
    return () => cancelAnimationFrame(id)
  }, [target, reduced])
  return reduced ? target : value
}

/** Zählt eine Zahl in ~700 ms hoch (ease-out), respektiert Reduced Motion. */
function useCountUp(target: number, duration = 700) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  const frame = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (reduced) { setValue(target); return }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration, reduced])
  return reduced ? target : value
}

/* ─── Tooltip ──────────────────────────────────────────────────────────────── */

/**
 * Erklär-Tooltip über einer Kachel/Zeile. Bewusst erst ab `md` (Zeigergeräte)
 * und bei Tastatur-Fokus — auf Touch würde er mit dem Tap auf den
 * darunterliegenden Link kollidieren. Öffnet nach oben und über die volle
 * Breite des Auslösers, damit er in der schmalen rechten Nav nie überläuft.
 */
export function StatTooltip({
  title, body, children,
}: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-0 right-0 z-30 mb-1.5
          opacity-0 translate-y-1
          hidden md:block
          group-hover/tip:opacity-100 group-hover/tip:translate-y-0
          group-focus-within/tip:opacity-100 group-focus-within/tip:translate-y-0
          motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-out
        "
      >
        <div className="rounded-xl bg-kh-dark/95 backdrop-blur-sm px-3 py-2 shadow-[0_6px_20px_rgba(20,40,45,.28)]">
          <div className="text-[11.5px] font-bold text-white leading-snug">{title}</div>
          <div className="text-[11px] text-white/75 leading-snug mt-0.5">{body}</div>
        </div>
        <div className="absolute -bottom-1 left-5 w-2.5 h-2.5 rotate-45 bg-kh-dark/95" />
      </div>
    </div>
  )
}

/* ─── Kennzahl-Bausteine ───────────────────────────────────────────────────── */

/** Kompakter Ring (SVG) für die zwei Haupt-Kennzahlen. */
export function Ring({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const grown = useGrowIn(Math.min(100, Math.max(0, pct)))
  const dash = (grown / 100) * circ
  return (
    <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
      <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#EFE9DC" strokeWidth={6} />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1000ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  )
}

/**
 * Mini-Verlauf der letzten Messpunkte (z. B. Abgabequote der letzten HÜ).
 * Fläche + Linie + betonter letzter Punkt — beantwortet "wird es besser oder
 * schlechter?", was eine einzelne Prozentzahl nicht kann.
 */
export function Sparkline({ values, color, max = 100 }: { values: number[]; color: string; max?: number }) {
  const reduced = usePrefersReducedMotion()
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (values.length < 2) return null
  // Feste 0–100-Skala statt Skalierung aufs eigene Maximum: sonst sähen 40/45/50
  // genauso aus wie 90/95/100 und die Linie wäre über Renderings nicht vergleichbar.
  const w = 100, h = 26, pad = 3
  const x = (i: number) => (i / (values.length - 1)) * w
  const y = (v: number) => h - pad - (Math.min(v, max) / max) * (h - pad * 2)
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = values[values.length - 1]
  const gid = `spark-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-[26px] overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline
        points={line} fill="none" stroke={color} strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={reduced ? undefined : {
          strokeDasharray: 200,
          strokeDashoffset: drawn ? 0 : 200,
          transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      <circle cx={x(values.length - 1)} cy={y(last)} r={2.6} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Anonyme Verteilung (z. B. Reise-Längen der Klasse). Bewusst ohne Namen und
 * ohne Reihenfolge der Kinder — zeigt die Streuung, nicht wer vorne liegt.
 */
export function DistributionStrip({
  buckets, color,
}: { buckets: { label: string; count: number }[]; color: string }) {
  const max = Math.max(...buckets.map(b => b.count), 1)
  return (
    <div className="flex items-end gap-1 h-full">
      {buckets.map((b, i) => (
        <div key={b.label} className="flex-1 flex flex-col items-center gap-1 group/bar">
          <span className="text-[9.5px] font-bold text-kh-muted leading-none opacity-0 group-hover/bar:opacity-100 motion-safe:transition-opacity">
            {b.count}
          </span>
          <BucketBar pct={(b.count / max) * 100} color={color} delay={i * 60} dim={b.count === 0} />
          <span className="text-[9px] font-medium text-kh-muted leading-none">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

function BucketBar({ pct, color, delay, dim }: { pct: number; color: string; delay: number; dim: boolean }) {
  const grown = useGrowIn(pct)
  return (
    <div className="w-full h-7 flex items-end rounded-[4px] bg-[#EFE9DC]/70 overflow-hidden">
      <div
        className="w-full rounded-[4px]"
        style={{
          height: `${Math.max(dim ? 0 : 8, grown)}%`,
          background: color,
          opacity: dim ? 0.25 : 1,
          transition: `height 800ms ${delay}ms cubic-bezier(0.22,1,0.36,1)`,
        }}
      />
    </div>
  )
}

/**
 * Etappen-Kette der Reise: erreichte Meilensteine gefüllt, der nächste betont.
 * Zeigt dem Kind, wie weit es noch ist, statt nur die nackte Streak-Zahl.
 */
export function MilestoneDots({
  milestones, current, color,
}: { milestones: number[]; current: number; color: string }) {
  const nextIdx = milestones.findIndex(m => m > current)
  return (
    <div className="flex items-center gap-1">
      {milestones.map((m, i) => {
        const reached = current >= m
        const isNext = i === nextIdx
        return (
          <div key={m} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full h-1 rounded-full"
              style={{
                background: reached ? color : '#EFE9DC',
                opacity: reached ? 1 : isNext ? 0.55 : 0.35,
              }}
            />
            <span
              className="text-[9px] font-bold leading-none tabular-nums"
              style={{ color: reached || isNext ? color : '#A9A093' }}
            >
              {m}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Auf-/Abwärts-Chip gegenüber dem Vergleichszeitraum (in Prozentpunkten). */
export function TrendChip({ delta }: { delta: number }) {
  if (delta === 0) return null
  const up = delta > 0
  const color = up ? '#0F8A82' : '#C2564B'
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[10px] font-bold leading-none"
      style={{ color, background: `${color}18` }}
    >
      <span className="msym text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {up ? 'arrow_upward' : 'arrow_downward'}
      </span>
      {Math.abs(delta)}
    </span>
  )
}

/** Prominente Kachel mit Ring, für die zwei Haupt-Kennzahlen. */
export function RingTile({
  href, icon, iconColor, ringColor, pct, value, suffix, small, label, trend, footer,
}: {
  href: string; icon: string; iconColor: string; ringColor: string
  pct: number; value: number; suffix?: string; small: string; label: string
  trend?: number
  footer?: React.ReactNode
}) {
  const counted = useCountUp(value)
  return (
    <Link
      href={href}
      className="
        group/tile block rounded-2xl bg-white p-3.5 border border-kh-border/50
        hover:border-kh-teal/40 hover:shadow-[0_4px_14px_rgba(20,40,45,.08)] motion-safe:hover:-translate-y-px
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kh-teal/50
        motion-safe:transition-all motion-safe:duration-200
      "
    >
      <div className="flex items-center gap-3">
        <Ring pct={pct} color={ringColor}>
          <span className="msym text-[19px]" style={{ color: iconColor, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[19px] font-extrabold text-kh-dark tracking-tight tabular-nums">
              {counted}{suffix}
            </span>
            <span className="text-[12px] font-semibold text-kh-muted">{small}</span>
            {trend !== undefined && <TrendChip delta={trend} />}
          </div>
          <div className="text-[11.5px] font-medium text-kh-muted mt-0.5">{label}</div>
        </div>
        <span className="msym text-[16px] text-transparent group-hover/tile:text-kh-muted/60 motion-safe:transition-colors flex-shrink-0">
          chevron_right
        </span>
      </div>
      {footer && <div className="mt-2 pt-2 border-t border-kh-border/40">{footer}</div>}
    </Link>
  )
}

/** Kompakte Zeile mit optionalem Balken, für Erinnerungen/Termine/Dienste. */
export function BarRow({
  href, icon, iconColor, barColor, label, value, pct, accent,
}: {
  href: string; icon: string; iconColor: string; barColor: string
  label: string; value: string; pct: number | null
  /** Hebt eine Zeile hervor, die eine Handlung erwartet (z. B. offene Bestätigungen). */
  accent?: boolean
}) {
  const grown = useGrowIn(pct === null ? 0 : Math.min(100, pct))
  return (
    <Link
      href={href}
      className="
        group/row flex items-center gap-3 rounded-xl px-3 py-2.5
        hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kh-teal/40
        motion-safe:transition-colors
      "
    >
      <span
        className="msym text-[18px] flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center motion-safe:transition-transform motion-safe:group-hover/row:scale-105"
        style={{ color: iconColor, background: `${iconColor}1a`, fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-kh-dark truncate">{label}</span>
          <span
            className="text-[13px] font-extrabold flex-shrink-0 tabular-nums"
            style={accent ? { color: '#C98A2B' } : undefined}
          >
            {value}
          </span>
        </div>
        {pct !== null && (
          <div className="relative w-full h-1.5 rounded-full bg-[#EFE9DC] overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full"
              style={{ width: `${grown}%`, background: barColor, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

/** Rückblick-Chip im Platinum-Metallic-Look. */
export function RecapChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  const counted = useCountUp(value)
  return (
    <div
      className="flex flex-col items-center text-center rounded-xl px-1.5 py-2.5 border border-white/70 shadow-[0_1px_4px_rgba(80,95,110,.1)] motion-safe:transition-transform motion-safe:hover:-translate-y-px"
      style={{ background: 'linear-gradient(160deg, #F8F9FB 0%, #E3E7EC 52%, #CED4DB 100%)' }}
    >
      <span className="msym text-[17px]" style={{ color: '#556472', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      <span className="text-[17px] font-extrabold leading-tight mt-0.5 tabular-nums" style={{ color: '#38434E' }}>{counted}</span>
      <span className="text-[10px] font-medium leading-tight" style={{ color: '#66727E' }}>{label}</span>
    </div>
  )
}

/** Abschnitts-Überschrift innerhalb des Panels. `action` ist optional (z.B.
 *  ein kleiner Umschalter am rechten Rand) — ohne sie unverändert zum
 *  bisherigen Verhalten, da ein einzelnes Flex-Kind von `justify-between`
 *  nicht beeinflusst wird. */
export function SectionLabel({
  icon, children, action,
}: { icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5 px-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="msym text-[16px] text-kh-muted flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <h3 className="text-[11px] font-bold text-kh-muted uppercase tracking-wide truncate">{children}</h3>
      </div>
      {action}
    </div>
  )
}
