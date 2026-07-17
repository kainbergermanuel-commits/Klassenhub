interface Props {
  /** Diese Woche von der ganzen Klasse gemeinsam erledigte Hausübungen
   *  (Sammel-Wert, kein Nenner). */
  total: number
  /** Davon heute dazugekommen (Momentum-/Liveness-Signal). */
  today: number
}

/** Wochen-Puls: die Neugestaltung des früheren Social-Proof-Banners.
 *
 *  Statt einer statischen deskriptiven Prozent-Norm ("X % deiner Klasse sind
 *  schon dabei"), die bei niedrigem Stand nachweislich ins Gegenteil kippt
 *  (Bumerang-Effekt negativer deskriptiver Normen — Schultz et al. 2007;
 *  Cialdini et al. 2006), zwei nicht-vergleichende Signale:
 *   • ein kollektiver, monoton steigender Sammel-Wert (kann nie "keiner macht
 *     mit" sagen, Zugehörigkeit statt Einzelvergleich — Hebel 1 / Prinzip 1),
 *   • ein Momentum-Signal ("heute kommen welche dazu"), das als dynamische
 *     Norm gerade bei niedrigem Ausgangsstand motiviert (Sparkman & Walton
 *     2017). Sprache einladend statt kontrollierend (kein "schließ dich an!" —
 *     SDT-Autonomieunterstützung, Prinzip 2). */
export default function WeekPulse({ total, today }: Props) {
  const empty = total === 0

  const icon = empty ? 'rocket_launch' : 'local_fire_department'
  const message = empty
    ? 'Eine neue Woche beginnt — die ersten Schritte zählen.'
    : today > 0
      ? <>Eure Klasse hat diese Woche schon <strong className="font-extrabold">{total}</strong>&nbsp;{total === 1 ? 'Hausübung' : 'Hausübungen'} gemeinsam geschafft — und heute kommen laufend welche dazu.</>
      : <>Eure Klasse hat diese Woche schon <strong className="font-extrabold">{total}</strong>&nbsp;{total === 1 ? 'Hausübung' : 'Hausübungen'} gemeinsam geschafft.</>

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F0FAF9] border border-kh-teal/20">
      <span className="msym text-[18px] text-kh-teal flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      <p className="text-[13px] font-semibold text-kh-dark">{message}</p>
    </div>
  )
}
