// ============================================================
// Gangaufsichten — Pausen-Slots + Zeitberechnung
// ------------------------------------------------------------
// Eine Aufsicht findet in einer PAUSE statt, nicht in einer Stunde. Die Pausen
// leiten sich direkt aus den Stundenbeginn-Zeiten (SLOT_TIMES, identisch zu
// TimetableGrid/HeuteAgenda) ab: eine Unterrichtseinheit dauert LESSON_MIN
// Minuten, danach beginnt die Pause bis zum Beginn der nächsten Stunde.
//
//   break_slot 0  → 7:45–8:00   (vor der 1. Stunde, lang)
//   break_slot N  → Pause NACH der N. Stunde (vor Stunde N+1)
//
// "Lang" = ≥ LONG_MIN Minuten (die beiden Aufsichten 7:45–8:00 und 9:45–10:00),
// alles andere sind die kurzen 5-Minuten-Pausen zwischen den Stunden.
// ============================================================

/** Stundenbeginn-Zeiten wie im Stundenplan (TimetableGrid/HeuteAgenda). */
const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']
/** Dauer einer Unterrichtseinheit in Minuten. */
const LESSON_MIN = 50
/** Beginn der Aufsicht vor der ersten Stunde. */
const PRE_SCHOOL_START = '7:45'
/** Ab dieser Pausenlänge (Minuten) gilt eine Aufsicht als "lang". */
const LONG_MIN = 10

/** Höchster sinnvoller break_slot — eine Pause "nach der N. Stunde" braucht die
 *  Startzeit der Folgestunde, also gibt es sie nur bis zur vorletzten Stunde. */
export const MAX_BREAK_SLOT = SLOT_TIMES.length - 1 // 9

export interface SupervisionBreak {
  /** 0 = vor der 1. Stunde; N = Pause nach der N. Stunde. */
  slot: number
  /** Beginn, z.B. "9:45". */
  start: string
  /** Ende, z.B. "10:00". */
  end: string
  /** true bei den langen Aufsichten (7:45–8:00, 9:45–10:00). */
  long: boolean
  /** z.B. "Vor der 1. Stunde" / "Nach der 2. Stunde". */
  label: string
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function fromMin(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

/** Zeitfenster + Länge einer Aufsichts-Pause aus ihrem break_slot ableiten. */
export function supervisionBreak(slot: number): SupervisionBreak {
  if (slot <= 0) {
    return { slot: 0, start: PRE_SCHOOL_START, end: SLOT_TIMES[0], long: true, label: 'Vor der 1. Stunde' }
  }
  const s = Math.min(slot, MAX_BREAK_SLOT)
  const breakStart = toMin(SLOT_TIMES[s - 1]) + LESSON_MIN // Ende der s. Stunde
  const breakEnd = toMin(SLOT_TIMES[s]) // Beginn der (s+1). Stunde
  return {
    slot: s,
    start: fromMin(breakStart),
    end: fromMin(breakEnd),
    long: breakEnd - breakStart >= LONG_MIN,
    label: `Nach der ${s}. Stunde`,
  }
}
