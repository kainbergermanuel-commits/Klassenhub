interface Props {
  name: string
  color: string
  seed?: string | null
  hairColor?: string | null
  skinColor?: string | null
  size?: number
  className?: string
}

export function avatarUrl(seed: string, hairColor?: string | null, skinColor?: string | null) {
  let url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`
  if (hairColor) url += `&hairColor=${hairColor.replace('#', '')}`
  if (skinColor) url += `&skinColor=${skinColor.replace('#', '')}`
  return url
}

export default function Avatar({ name, color, seed, hairColor, skinColor, size = 36, className = '' }: Props) {
  if (!seed) {
    return (
      <div
        className={`rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${className}`}
        style={{ width: size, height: size, background: '#E8E4DC', minWidth: size }}
      >
        <span
          className="msym select-none"
          style={{ fontSize: size * 0.65, color: '#B8B0A4', lineHeight: 1, fontVariationSettings: "'FILL' 1" }}
        >
          person
        </span>
      </div>
    )
  }

  const url = avatarUrl(seed, hairColor, skinColor)

  return (
    <div
      className={`rounded-full flex-shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, background: color, minWidth: size }}
    >
      <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size }} />
    </div>
  )
}
