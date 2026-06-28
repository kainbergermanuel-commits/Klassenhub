import Link from 'next/link'

export interface DutyEntry {
  name: string
  names: string[]
}

/** Ordnet einem Dienstnamen ein passendes Material-Symbol zu (Keyword-basiert). */
function dutyIcon(name: string): string {
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

export default function DutyCard({ title, entries }: { title: string; entries: DutyEntry[] }) {
  return (
    <Link
      href="/dienste"
      className="gradient-violet rounded-[20px] p-[18px] text-white flex flex-col gap-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full"
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="msym text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>cleaning_services</span>
      </div>

      <div className="mt-1">
        <div className="font-extrabold text-[17px] leading-tight">{title}</div>
        {entries.length === 0 ? (
          <div className="text-[13px] font-semibold text-white/85 mt-1">Noch keine Dienste vergeben</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
            {entries.map(e => (
              <div key={e.name} className="flex items-center gap-1.5 min-w-0" title={e.name}>
                <span className="msym text-[16px] text-white/90 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {dutyIcon(e.name)}
                </span>
                <span className="text-[12px] font-semibold text-white/90 truncate">{e.names.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
