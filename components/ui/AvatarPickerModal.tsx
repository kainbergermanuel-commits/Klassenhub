'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { avatarUrl } from '@/components/ui/Avatar'
import { saveAvatarSeed } from '@/app/actions/saveAvatarSeed'
import type { Gender } from '@/lib/types'

const GENDER_OPTIONS: { value: Gender | null; label: string; icon: string }[] = [
  { value: 'm', label: 'Männlich', icon: 'male' },
  { value: 'f', label: 'Weiblich', icon: 'female' },
  { value: null, label: 'Keine Angabe', icon: 'block' },
]

const SEEDS = [
  'Felix', 'Anna', 'Lukas', 'Sophie', 'Max', 'Emma', 'Noah', 'Mia',
  'Lena', 'Jonas', 'Laura', 'Ben', 'Lisa', 'Tim', 'Julia', 'Leon',
  'Lea', 'Finn', 'Hannah', 'Paul', 'Marie', 'Elias', 'Sara', 'Nico',
  'Maja', 'Tom', 'Nora', 'Jan', 'Klara', 'David', 'Johanna', 'Moritz',
  'Charlotte', 'Simon', 'Amelie', 'Tobias', 'Elena', 'Fabian', 'Zoe', 'Philipp',
]

const HAIR_COLORS = [
  { label: 'Schwarz',     value: '1a1008' },
  { label: 'Dunkelbraun', value: '3b1f0e' },
  { label: 'Auburn',      value: '8b3a2a' },
  { label: 'Braun',       value: '7c4a1e' },
  { label: 'Hellbraun',   value: 'a0692a' },
  { label: 'Kupfer',      value: 'c1692a' },
  { label: 'Blond',       value: 'd4a843' },
  { label: 'Hellblond',   value: 'f0d080' },
  { label: 'Grau',        value: '9ca3af' },
  { label: 'Weiß',        value: 'f3f4f6' },
  { label: 'Rot',         value: 'b94040' },
  { label: 'Rosa',        value: 'e879a0' },
  { label: 'Lila',        value: '7c3aed' },
  { label: 'Blau',        value: '3b82f6' },
  { label: 'Grün',        value: '16a34a' },
]

const SKIN_COLORS = [
  { label: 'Hell',        value: 'fce8d0' },
  { label: 'Elfenbein',   value: 'f2d3b1' },
  { label: 'Sand',        value: 'ecad80' },
  { label: 'Beige',       value: 'd4956a' },
  { label: 'Tan',         value: 'ae5d29' },
  { label: 'Braun',       value: '7d3e1a' },
  { label: 'Dunkel',      value: '3d1c0a' },
]

function ColorDropdown({
  label,
  current,
  colors,
  onSelect,
}: {
  label: string
  current: string | null
  colors: { label: string; value: string }[]
  onSelect: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-kh-border bg-[#FAF8F3] hover:bg-[#F0EDE5] transition-colors text-sm font-semibold text-kh-dark"
      >
        {current ? (
          <span className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0" style={{ background: `#${current}` }} />
        ) : (
          <span className="w-4 h-4 rounded-full border border-kh-border bg-white relative overflow-hidden flex-shrink-0">
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="block w-[1.5px] h-full bg-red-400 rotate-45 origin-center" />
            </span>
          </span>
        )}
        {label}
        <span className="msym text-[16px] text-kh-muted">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-10 bg-white rounded-2xl shadow-xl border border-kh-border" style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 28px)', gap: 10 }}>
            <button
              onClick={() => onSelect(null)}
              className={`rounded-full border-2 bg-white relative overflow-hidden transition-colors ${
                current === null ? 'border-kh-teal' : 'border-kh-border hover:border-kh-muted'
              }`}
              style={{ width: 28, height: 28 }}
              title="Standard"
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="block w-[1.5px] h-full bg-red-400 rotate-45 origin-center" />
              </span>
            </button>
            {colors.map(c => (
              <button
                key={c.value}
                onClick={() => onSelect(c.value)}
                className={`rounded-full border-2 transition-colors ${
                  current === c.value ? 'border-kh-teal' : 'border-transparent hover:border-kh-muted'
                }`}
                style={{ width: 28, height: 28, background: `#${c.value}` }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  currentSeed: string | null
  currentHairColor: string | null
  currentSkinColor: string | null
  currentGender?: Gender | null
  /** Geschlechts-Auswahl anzeigen (nur sinnvoll für Schüler:innen). */
  showGender?: boolean
  userName: string
  color: string
  onClose: () => void
}

export default function AvatarPickerModal({ currentSeed, currentHairColor, currentSkinColor, currentGender = null, showGender = false, userName, color, onClose }: Props) {
  const [selected, setSelected] = useState(currentSeed ?? userName)
  const [hairColor, setHairColor] = useState<string | null>(currentHairColor)
  const [skinColor, setSkinColor] = useState<string | null>(currentSkinColor)
  const [gender, setGender] = useState<Gender | null>(currentGender)
  const [, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      await saveAvatarSeed(selected, hairColor, skinColor, gender)
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-kh-dark">Profil bearbeiten</h2>
          <button onClick={onClose} className="msym text-2xl text-kh-muted hover:text-kh-dark transition-colors">close</button>
        </div>

        {/* Preview + color pickers */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-md flex-shrink-0" style={{ background: color }}>
            <img src={avatarUrl(selected, hairColor, skinColor)} alt="Vorschau" className="w-full h-full" />
          </div>
          <div className="flex flex-col gap-2">
            <ColorDropdown label="Haarfarbe" current={hairColor} colors={HAIR_COLORS} onSelect={setHairColor} />
            <ColorDropdown label="Hautfarbe"  current={skinColor} colors={SKIN_COLORS}  onSelect={setSkinColor} />
          </div>
        </div>

        {/* Geschlecht (nur Schüler:innen) — passt gender-spezifische Texte an */}
        {showGender && (
          <div className="mb-5">
            <p className="text-[11px] font-bold text-kh-muted uppercase tracking-wider mb-2">Geschlecht</p>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map(opt => {
                const active = gender === opt.value
                return (
                  <button
                    key={opt.label}
                    onClick={() => setGender(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-0.5 py-2 rounded-xl text-[12.5px] font-bold border transition-colors ${
                      active ? 'border-kh-teal bg-kh-teal-light text-kh-dark' : 'border-kh-border bg-[#FAF8F3] text-kh-muted hover:bg-[#F0EDE5]'
                    }`}
                  >
                    <span className={`msym text-[16px] w-[18px] flex items-center justify-center flex-shrink-0 ${opt.value === 'f' || opt.value === 'm' ? '-mr-0.5' : ''}`}>{opt.icon}</span>
                    <span className={opt.value === null ? 'text-[11px]' : ''}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Avatar grid */}
        <p className="text-[11px] font-bold text-kh-muted uppercase tracking-wider mb-2">Gesicht</p>
        <div className="max-h-[240px] overflow-y-auto scrollbar-kh -mx-1">
          <div className="grid grid-cols-8 gap-1.5 p-3">
            {SEEDS.map(seed => {
              const active = selected === seed
              return (
                <button
                  key={seed}
                  onClick={() => setSelected(seed)}
                  className={`rounded-full overflow-hidden transition-all ${
                    active ? 'ring-2 ring-kh-teal ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ background: color }}
                  title={seed}
                >
                  <img src={avatarUrl(seed)} alt={seed} className="w-full h-full" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-kh-border text-sm font-bold text-kh-muted hover:bg-[#F6F3ED] transition-colors">
            Abbrechen
          </button>
          <button onClick={confirm} className="flex-1 py-3 rounded-full gradient-teal text-white text-sm font-bold hover:opacity-90 transition-opacity">
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
