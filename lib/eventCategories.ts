export type EventCategory = 'ausflug' | 'elternabend' | 'pruefung' | 'frei' | 'sonstiges'

export const EVENT_CATEGORIES: { value: EventCategory; label: string; icon: string; color: string }[] = [
  { value: 'ausflug',     label: 'Ausflug',      icon: 'directions_bus', color: '#2F86C5' },
  { value: 'elternabend', label: 'Elternabend',  icon: 'groups',         color: '#5965B8' },
  { value: 'pruefung',    label: 'Prüfung',      icon: 'edit_note',      color: '#C95040' },
  { value: 'frei',        label: 'Schulfrei',    icon: 'beach_access',   color: '#2E9C6E' },
  { value: 'sonstiges',   label: 'Sonstiges',    icon: 'event',          color: '#6E7E80' },
]

export function eventCategoryMeta(category: string) {
  return EVENT_CATEGORIES.find(c => c.value === category) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1]
}
