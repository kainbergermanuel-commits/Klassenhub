/** Ordnet einem Dienstnamen ein passendes Material-Symbol zu (Keyword-basiert,
 *  damit auch frei formulierte Dienstnamen wie "Tafel sauber machen" treffen).
 *
 *  EINZIGE Quelle für Dienst-Icons: Startseiten-Modul, Dienste-Seite und das
 *  Zuweisen-Modal ziehen alle hier. Vorher hielt DutyWeek eine eigene Map —
 *  fünf der sechs Standarddienste hatten dadurch auf der Startseite ein
 *  anderes Icon als auf der Dienste-Seite, frei benannte Dienste dort pauschal
 *  einen Stern. */
export function dutyIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('tafel')) return 'co_present'
  if (n.includes('boden') || n.includes('wisch') || n.includes('saug') || n.includes('putz') || n.includes('säuber') || n.includes('sauber')) return 'mop'
  if (n.includes('lüft') || n.includes('luft') || n.includes('fenster')) return 'window'
  if (n.includes('blume') || n.includes('gieß') || n.includes('pflanz')) return 'potted_plant'
  if (n.includes('ordner') || n.includes('austeil') || n.includes('material') || n.includes('heft')) return 'folder'
  if (n.includes('müll') || n.includes('abfall') || n.includes('entleer') || n.includes('papier')) return 'delete'
  if (n.includes('tisch')) return 'table_restaurant'
  if (n.includes('garderobe') || n.includes('jacke')) return 'checkroom'
  if (n.includes('licht') || n.includes('lampe')) return 'lightbulb'
  if (n.includes('tür')) return 'door_front'
  return 'cleaning_services'
}

/** Die sechs Standarddienste — Auswahlliste im Modal, Vorlage für die
 *  Zufallsverteilung und Schlüssel für die Erklärtexte. Eine Liste statt
 *  bisher dreier (DutyWeek, AddDutyModal, cron-auto-duties.sql). */
export const STANDARD_DUTIES = [
  'Tafel wischen',
  'Boden säubern',
  'Lüften',
  'Blumen gießen',
  'Ordner austeilen',
  'Müll entleeren',
] as const

/** Kindgerechte Erklärung je Standarddienst. Wird allen Rollen gezeigt:
 *  Eltern und Lehrer:innen sollen dasselbe lesen können wie das Kind. */
export const DUTY_DESCRIPTIONS: Record<string, string> = {
  'Tafel wischen': 'Nimm den nassen Schwamm und wisch die Tafel nach jeder Stunde sauber, damit beim nächsten Mal wieder Platz ist.',
  'Boden säubern': 'Schau, ob unter den Tischen Papier oder Dreck liegt, und kehr alles mit dem Besen zusammen, bevor ihr geht.',
  'Lüften': 'Öffne in jeder Pause die Fenster für ein paar Minuten, damit frische Luft ins Klassenzimmer kommt.',
  'Blumen gießen': 'Gieß alle Pflanzen im Klassenzimmer – aber nicht zu viel! Die Erde soll leicht feucht, nicht nass sein.',
  'Ordner austeilen': 'Hol die Klassenordner aus dem Regal und leg jedem Schüler seinen Ordner auf den Tisch, bevor es losgeht.',
  'Müll entleeren': 'Nimm den Mistkübel, leere ihn in den großen Mülleimer auf dem Gang und stell den leeren Kübel wieder hin.',
}
