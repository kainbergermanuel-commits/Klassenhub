const DUTY_ICONS: Record<string, string> = {
  'Tafel wischen': 'water_drop',
  'Boden säubern': 'cleaning_services',
  'Lüften': 'air',
  'Blumen gießen': 'local_florist',
  'Ordner austeilen': 'folder_open',
  'Müll entleeren': 'delete',
}

export function dutyIcon(dutyName: string): string {
  return DUTY_ICONS[dutyName] ?? 'cleaning_services'
}
