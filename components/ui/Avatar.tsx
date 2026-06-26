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
  const url = avatarUrl(seed ?? name, hairColor, skinColor)

  return (
    <div
      className={`rounded-full flex-shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, background: color, minWidth: size }}
    >
      <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size }} />
    </div>
  )
}
