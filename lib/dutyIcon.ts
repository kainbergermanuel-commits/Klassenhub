/** Ordnet einem Dienstnamen ein passendes Material-Symbol zu (Keyword-basiert,
 *  damit auch frei formulierte Dienstnamen wie "Tafel sauber machen" treffen).
 *  Einzige Quelle für Dienst-Icons — DutyCard und DutyModule teilen sie. */
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
