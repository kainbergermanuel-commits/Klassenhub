interface Person {
  full_name: string
  avatar_color?: string | null
}

interface AvatarStackProps {
  people: Person[]
  max?: number
  ring?: string
  size?: number
}

export default function AvatarStack({ people, max = 4, ring = '#ffffff', size = 30 }: AvatarStackProps) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length

  return (
    <div className="flex items-center">
      {shown.map((p, i) => {
        const seed = encodeURIComponent(p.full_name)
        const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`
        return (
          <div
            key={i}
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{
              width: size, height: size,
              background: p.avatar_color || '#0F8A82',
              boxShadow: `0 0 0 2.5px ${ring}`,
              marginLeft: i === 0 ? 0 : -size * 0.32,
              zIndex: i,
            }}
          >
            <img src={url} alt={p.full_name} width={size} height={size} style={{ width: size, height: size }} />
          </div>
        )
      })}
      {extra > 0 && (
        <div
          className="rounded-full flex items-center justify-center font-bold text-kh-dark bg-white/90"
          style={{
            width: size, height: size,
            fontSize: size * 0.34,
            boxShadow: `0 0 0 2.5px ${ring}`,
            marginLeft: -size * 0.32,
            zIndex: shown.length,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
