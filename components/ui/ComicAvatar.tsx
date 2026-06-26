import type { Gender } from '@/lib/types'

interface Props {
  gender: Gender | null
  color: string
  size?: number
  className?: string
}

function darken(hex: string, amount = 45): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`
}

export default function ComicAvatar({ gender, color, size = 64, className = '' }: Props) {
  const hair = darken(color)
  const skin = '#FDDBB4'
  const eye = '#3A2820'

  if (gender === 'f') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <circle cx="32" cy="32" r="32" fill={color} />
        {/* Long hair base (behind face) */}
        <ellipse cx="32" cy="46" rx="17" ry="20" fill={hair} />
        {/* Top hair */}
        <ellipse cx="32" cy="22" rx="15" ry="13" fill={hair} />
        {/* Side hair strands */}
        <ellipse cx="16" cy="42" rx="5" ry="10" fill={hair} />
        <ellipse cx="48" cy="42" rx="5" ry="10" fill={hair} />
        {/* Face */}
        <ellipse cx="32" cy="38" rx="13" ry="15" fill={skin} />
        {/* Eyes */}
        <ellipse cx="27" cy="35" rx="3" ry="3.5" fill="white" />
        <ellipse cx="37" cy="35" rx="3" ry="3.5" fill="white" />
        <circle cx="27.5" cy="35.5" r="2" fill={eye} />
        <circle cx="37.5" cy="35.5" r="2" fill={eye} />
        <circle cx="28" cy="35" r="0.7" fill="white" />
        <circle cx="38" cy="35" r="0.7" fill="white" />
        {/* Lashes */}
        <line x1="24" y1="31.5" x2="25" y2="30" stroke={eye} strokeWidth="1" strokeLinecap="round"/>
        <line x1="27" y1="31" x2="27" y2="29.5" stroke={eye} strokeWidth="1" strokeLinecap="round"/>
        <line x1="30" y1="31.5" x2="31" y2="30" stroke={eye} strokeWidth="1" strokeLinecap="round"/>
        <line x1="34" y1="31.5" x2="33" y2="30" stroke={eye} strokeWidth="1" strokeLinecap="round"/>
        <line x1="37" y1="31" x2="37" y2="29.5" stroke={eye} strokeWidth="1" strokeLinecap="round"/>
        <line x1="40" y1="31.5" x2="39" y2="30" stroke={eye} strokeWidth="1" strokeLinecap="round"/>
        {/* Cheeks */}
        <ellipse cx="22" cy="41" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.5" />
        <ellipse cx="42" cy="41" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.5" />
        {/* Mouth */}
        <path d="M 27 44.5 Q 32 49 37 44.5" stroke="#C07070" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="32" cy="32" r="32" fill={color} />
      {/* Short hair block on top */}
      <ellipse cx="32" cy="22" rx="15" ry="11" fill={hair} />
      <rect x="17" y="20" width="30" height="8" fill={hair} />
      {/* Side short hair */}
      <rect x="17" y="28" width="3.5" height="7" rx="1.5" fill={hair} />
      <rect x="43.5" y="28" width="3.5" height="7" rx="1.5" fill={hair} />
      {/* Face */}
      <ellipse cx="32" cy="40" rx="13" ry="15" fill={skin} />
      {/* Ears */}
      <ellipse cx="19" cy="40" rx="2.5" ry="3" fill={skin} />
      <ellipse cx="45" cy="40" rx="2.5" ry="3" fill={skin} />
      {/* Eyes */}
      <ellipse cx="27" cy="37" rx="3" ry="3.5" fill="white" />
      <ellipse cx="37" cy="37" rx="3" ry="3.5" fill="white" />
      <circle cx="27.5" cy="37.5" r="2" fill={eye} />
      <circle cx="37.5" cy="37.5" r="2" fill={eye} />
      <circle cx="28" cy="37" r="0.7" fill="white" />
      <circle cx="38" cy="37" r="0.7" fill="white" />
      {/* Eyebrows */}
      <path d="M 24 33 Q 27 31.5 30 33" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M 34 33 Q 37 31.5 40 33" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Cheeks */}
      <ellipse cx="22" cy="42" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.4" />
      <ellipse cx="42" cy="42" rx="4" ry="2.5" fill="#F4A0A0" opacity="0.4" />
      {/* Mouth */}
      <path d="M 27.5 46 Q 32 50.5 36.5 46" stroke="#C07070" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}
