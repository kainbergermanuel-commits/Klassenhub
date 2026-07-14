import type { JourneyTheme } from '@/lib/seasonTheme'

/** Kindgerechtes Info-Overlay zum Guide: kurze Vorstellung + Kurzanleitung,
 *  wie die Reise funktioniert. Rein informativ, kein neuer Mechanismus.
 *  Wiederverwendet von ReiseOverview und WeeklyQuestCard. */
export default function GuideInfoOverlay({ theme, onClose }: { theme: JourneyTheme; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#FAF8F3] flex items-center justify-center hover:bg-kh-border/40 transition-colors"
          aria-label="Schließen"
        >
          <span className="msym text-[18px] text-kh-muted">close</span>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="msym text-[20px] text-kh-amber" aria-hidden="true">{theme.icon}</span>
          <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted">{theme.name}</p>
        </div>
        <h2 className="text-[20px] font-extrabold text-kh-dark tracking-tight mb-3">{theme.guide}</h2>

        <p className="text-[13.5px] text-kh-dark/85 leading-snug mb-4">
          {theme.guide} begleitet die Klasse diesen Monat auf der Reise durch „{theme.name}“ — Etappe für Etappe,
          immer dann, wenn genug Hausübungen eltern-bestätigt erledigt sind.
        </p>

        <p className="text-[11px] font-bold uppercase tracking-wide text-kh-muted mb-2">So funktioniert die Reise</p>
        <ul className="flex flex-col gap-2.5 mb-1">
          <li className="flex items-start gap-2.5">
            <span className="msym text-[16px] text-kh-teal flex-shrink-0 mt-0.5" aria-hidden="true">task_alt</span>
            <span className="text-[13px] text-kh-dark/85 leading-snug">Jede erledigte, eltern-bestätigte Hausübung zählt für das Klassenziel.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="msym text-[16px] text-kh-teal flex-shrink-0 mt-0.5" aria-hidden="true">route</span>
            <span className="text-[13px] text-kh-dark/85 leading-snug">Ist genug zusammengekommen, öffnet sich die nächste Etappe mit einer neuen Story.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="msym text-[16px] text-kh-teal flex-shrink-0 mt-0.5" aria-hidden="true">lock</span>
            <span className="text-[13px] text-kh-dark/85 leading-snug">Gesperrte Etappen verraten noch nichts — die Klasse muss sie sich gemeinsam erspielen.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="msym text-[16px] text-kh-teal flex-shrink-0 mt-0.5" aria-hidden="true">flag</span>
            <span className="text-[13px] text-kh-dark/85 leading-snug">Am Ende der Season wartet die letzte Etappe — dann geht die Reise im nächsten Monat woanders weiter.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
