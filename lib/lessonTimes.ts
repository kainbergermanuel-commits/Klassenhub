// ============================================================
// Stundenzeiten — eine Quelle für Beginn und Ende jeder Stunde
// ------------------------------------------------------------
// Eine Unterrichtseinheit dauert LESSON_MIN Minuten, danach folgt die Pause bis
// zum Beginn der nächsten Stunde (siehe lib/supervisionSlots.ts).
// ============================================================

/** Stundenbeginn-Zeiten (Slot 1 … 10). */
export const SLOT_TIMES = ['8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35', '15:30', '16:25']
/** Dauer einer Unterrichtseinheit in Minuten. */
export const LESSON_MIN = 50

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function fmt(min: number) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

/** Beginn der Stunde, z.B. slotStart(1) → "8:00". */
export function slotStart(slot: number) {
  return SLOT_TIMES[slot - 1] ?? ''
}

/** Ende der Stunde, z.B. slotEnd(1) → "8:50". */
export function slotEnd(slot: number) {
  const start = SLOT_TIMES[slot - 1]
  return start ? fmt(toMin(start) + LESSON_MIN) : ''
}
