'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { todayISO, dueInfo, isActionable } from '@/lib/date'
import { dueDateFor } from '@/lib/homework'
import type { HomeworkWithStatus } from '@/lib/types'
import { toggleHomeworkCompletion } from '@/app/actions/toggleHomeworkCompletion'
import HomeworkDetails from '@/components/homework/HomeworkDetails'
import { getSeasonTheme, guideShortName, isCollectiveGuide } from '@/lib/seasonTheme'

const TODAY = todayISO()

interface Props {
  homework: HomeworkWithStatus[]
  userId: string
  /** Season-Key für die Guide-Stimme im Leer-Zustand (Game-Fiction-Hebel). */
  season?: string
}

function Row({ hw, userId }: { hw: HomeworkWithStatus; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [done, setDone] = useState(hw.done)
  // Feier-Mikromoment: läuft NUR beim Erledigen, nie beim Zurücknehmen.
  // Der Timer setzt das Flag zurück, damit die Animation nach einem
  // Zurücknehmen erneut abspielen kann (eine Klasse, die stehen bleibt,
  // würde beim zweiten Mal nichts mehr auslösen).
  const [celebrate, setCelebrate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canToggle = isActionable(dueDateFor(hw), TODAY)

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(false), 900)
    return () => clearTimeout(t)
  }, [celebrate])

  async function toggle() {
    if (!canToggle) return
    const next = !done
    setDone(next)
    setCelebrate(next)
    setError(null)
    try {
      await toggleHomeworkCompletion(hw.id, next)
      startTransition(() => router.refresh())
    } catch {
      // Zurückrollen statt still zu lügen: sonst steht der Haken, obwohl
      // in der Datenbank nichts angekommen ist.
      setDone(!next)
      setCelebrate(false)
      setError('Nicht gespeichert. Nochmal tippen.')
    }
  }

  const due = dueInfo(dueDateFor(hw))
  const statusColor = error ? '#C95040' : done ? '#2E9C6E' : due.color
  const statusText = error ?? (done ? 'Erledigt' : due.label)

  return (
    <div className={`flex items-center gap-3 rounded-xl bg-[#FAF8F3] px-3 py-2.5 overflow-hidden ${celebrate ? 'animate-hw-row' : ''}`}>
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${hw.subject_color}ee 0%, ${hw.subject_color}99 100%)` }}
      >
        {hw.subject_short}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] truncate" style={{ color: done ? '#7C8A89' : '#15363F' }}>
          {/* Der Strich sitzt auf einem inline-Element, damit er über den Text
              läuft und nicht über die volle Spaltenbreite. Während der
              Animation zeichnet ihn die CSS-Klasse, danach übernimmt das
              normale line-through. */}
          <span
            className={celebrate ? 'animate-hw-strike' : undefined}
            style={{ textDecoration: done && !celebrate ? 'line-through' : 'none' }}
          >
            {hw.title}
          </span>
        </div>
        <div
          className="flex items-center gap-1 text-xs font-semibold mt-0.5"
          style={{ color: statusColor }}
          title={due.tooltip}
        >
          <span className="msym text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>{error ? 'error' : 'event'}</span>
          {statusText}{error ? '' : ` · ${hw.subject}`}
        </div>
        {/* Eine Zeile Vorschau, aufklappbar — die Startseiten-Zeile ist
            dichter als die große Karte auf /hausaufgaben. */}
        {hw.details && <HomeworkDetails text={hw.details} clamp={1} className="mt-1" />}
      </div>
      {!done && due.warn && (
        <span className="msym text-[23px] flex-shrink-0" title={due.tooltip} style={{ fontVariationSettings: "'FILL' 1", background: 'linear-gradient(135deg, #FF6B6B 0%, #E03030 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>warning</span>
      )}
      <button
        onClick={toggle}
        disabled={!canToggle}
        aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all tap-sm disabled:cursor-not-allowed ${celebrate ? 'animate-hw-check' : ''}`}
        style={done
          ? { background: '#2E9C6E' }
          : canToggle
            ? { border: '2.5px solid #CBD5D3' }
            : { border: '2.5px solid #F5D5D0' }
        }
      >
        {done && <span className={`msym text-white text-[17px] ${celebrate ? 'animate-hw-check-icon' : ''}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>}
      </button>
    </div>
  )
}

export default function StudentOpenHomework({ homework, userId, season }: Props) {
  // Show only open, sorted by due_date ascending (most urgent first)
  const open = homework.filter(h => !h.done).sort((a, b) => a.due_date.localeCompare(b.due_date))
  // Guide-Vorname für den Leer-Zustand (z.B. "Bergführerin Vala" → "Vala").
  const guide = season ? getSeasonTheme(season).guide : null
  const guideName = guide ? guideShortName(guide) : null
  // Kollektiv-Guide („Alle Guides gemeinsam") braucht das Verb im Plural.
  const guideNod = guide && guideName
    ? (isCollectiveGuide(guide) ? 'Die Guides nicken dir zu' : `${guideName} nickt dir zu`)
    : null

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 shadow-[0_8px_16px_rgba(20,40,45,.10)]" style={{ background: 'linear-gradient(135deg, #FBF9F3 0%, #FEFEFC 100%)' }}>
      {open.length === 0 && (
        <img
          src="/images/ian-stauffer-bH7kZ0yazB0-unsplash.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.6 }}
        />
      )}
      <div className="relative flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 font-extrabold text-base text-kh-dark whitespace-nowrap min-w-0">
          <span className="msym text-[20px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
          <span className="truncate">Meine Hausübungen</span>
        </h2>
        <Link href="/hausaufgaben" className="text-sm font-semibold text-kh-teal hover:underline flex-shrink-0">Alle</Link>
      </div>
      {open.length === 0 ? (
        <div className="relative flex flex-col items-start justify-end pt-14 pb-4 px-1 gap-1.5 min-h-[300px]">
          <p
            className="text-[19px] font-extrabold text-kh-dark"
            style={{ textShadow: '0 1px 3px rgba(255,255,255,.9), 0 0 12px rgba(255,255,255,.8)' }}
          >
            Alles erledigt!
          </p>
          <p
            className="text-sm font-bold text-kh-dark/70"
            style={{ textShadow: '0 1px 3px rgba(255,255,255,.9), 0 0 10px rgba(255,255,255,.8)' }}
          >
            {guideNod ? `${guideNod}: „Alles erledigt, genieß die Pause."` : 'Keine offenen Hausübungen'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {open.map(hw => <Row key={hw.id} hw={hw} userId={userId} />)}
        </div>
      )}
    </div>
  )
}
