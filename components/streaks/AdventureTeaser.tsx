import { daysUntilAdventure, ADVENTURE_START } from '@/lib/adventureStart'
import { GUIDE_PORTRAIT } from '@/lib/seasonTheme'
import { SEASON_ART } from '@/components/streaks/seasonArt'

/** Countdown-Teaser für die erste Schulwoche: das Abenteuer ist noch zu
 *  (siehe lib/adventureStart.ts), Vala kündigt es an. Bewusst OHNE Link und
 *  ohne Button — der ganze Sinn der Sperre ist, dass es in Woche 1 nichts zum
 *  Antippen gibt. Optisch dasselbe Story-Glas-Muster wie die StoryHeroCard,
 *  damit die Kinder die Karte am Starttag wiedererkennen.
 *  Vala ist gesetzt, weil sie im September ohnehin die Welt führt
 *  (Bergexpedition, Icon `landscape` in lib/seasonTheme.ts). */
export default function AdventureTeaser() {
  const days = daysUntilAdventure()
  const Art = SEASON_ART['landscape']
  const portrait = GUIDE_PORTRAIT['landscape']

  const startLabel = new Date(`${ADVENTURE_START}T00:00:00`).toLocaleDateString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Der Countdown wird zum Schluss hin persönlicher statt nur kleiner.
  const headline = days <= 1 ? 'Morgen geht es los' : `Noch ${days} Tage`
  const sub = days <= 1
    ? 'Vala hat das Basislager fertig eingerichtet.'
    : 'dann bricht die Klasse gemeinsam auf.'

  return (
    <div className="relative z-20 mx-auto w-full max-w-[560px] min-h-[220px] sm:min-h-[250px] flex items-stretch rounded-2xl shadow-[0_8px_16px_rgba(20,40,45,.10)]">
      {/* Hintergrund-Ebene mit eigenem Clipping, damit Vala oben überragen kann */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#EFEAE0] to-[#FAF8F3]">
        {Art && (
          <div className="absolute inset-0 pointer-events-none select-none">
            <Art />
          </div>
        )}
      </div>

      {portrait && (
        <div className="relative z-10 -ml-3 w-[34%] min-w-[92px] max-w-[150px] sm:w-[40%] sm:min-w-[150px] sm:max-w-[220px] flex-shrink-0 self-stretch pointer-events-none">
          <img
            src={portrait}
            alt="Bergführerin Vala"
            className="absolute -top-9 left-[-8px] w-[124%] h-[calc(100%+36px)] sm:-top-10 sm:left-[-16px] sm:w-[142%] sm:h-[calc(100%+40px)] object-contain object-bottom"
          />
        </div>
      )}

      <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center px-4 py-5">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-kh-muted">
          Das Abenteuer beginnt am {startLabel}
        </p>
        <p className="mt-1 text-[19px] sm:text-[22px] font-extrabold text-kh-dark leading-tight tracking-tight">
          {headline}
        </p>
        <p className="text-[13px] font-semibold text-kh-dark/70 leading-snug">
          {sub}
        </p>
        <p className="mt-2.5 text-[13px] text-kh-dark leading-snug italic">
          „Noch stehen die Zelte nicht, und auf der Karte fehlt die halbe Route.
          Lasst mir die paar Tage, dann zeige ich euch, wohin wir gehen.“
        </p>
      </div>
    </div>
  )
}
