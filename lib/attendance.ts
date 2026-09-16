/** Anwesenheit: kleine, geteilte Regeln.
 *
 *  Seit den Teilabwesenheiten ist NICHT mehr jede Zeile in `attendance` ein
 *  Fehltag — eine Zeile mit status 'anwesend' bedeutet: das Kind war da, kam
 *  aber zu spät und/oder ging früher. Überall, wo Fehltage gezählt werden,
 *  muss deshalb vorher gefiltert werden. */

/** Zählt diese Zeile als Fehltag? */
export function isAbsence(entry: { status: string }): boolean {
  return entry.status !== 'anwesend'
}

/** Kurzes Etikett für eine Teilabwesenheit, z. B. „Zu spät · ab der 5. weg" */
export function partialLabel(entry: { late: boolean; gone_from_slot: number | null }): string {
  const parts: string[] = []
  if (entry.late) parts.push('Zu spät')
  if (entry.gone_from_slot != null) parts.push(`ab der ${entry.gone_from_slot}. weg`)
  return parts.join(' · ')
}
