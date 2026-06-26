import { useId } from 'react'

interface ProgressRingProps {
  done: number
  total: number
  size?: number
  stroke?: number
}

export default function ProgressRing({ done, total, size = 56, stroke = 5 }: ProgressRingProps) {
  const gradId = useId()
  const r = (size - stroke * 1.6) / 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(done / total, 1) : 0
  const dash = pct * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECE6D9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F8A82" />
          <stop offset="100%" stopColor="#3DB5AC" />
        </linearGradient>
      </defs>
    </svg>
  )
}
