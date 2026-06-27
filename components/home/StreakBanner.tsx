import { flameCount } from '@/lib/streak'

interface Props {
  streak: number
  pendingMilestone: number | null
}

export default function StreakBanner({ streak, pendingMilestone }: Props) {
  if (streak === 0) return null
  const flames = flameCount(streak)

  return (
    <div className={`rounded-[20px] p-4 flex items-center gap-4 relative overflow-hidden`} style={{ background: pendingMilestone ? 'linear-gradient(to left, #FFFBEE 0%, #FDE68A 100%)' : 'linear-gradient(to left, #F0FAF9 0%, #B2DFDB 100%)', boxShadow: pendingMilestone ? 'inset 0 0 0 1px #F0C040' : 'inset 0 0 0 1px rgba(0,150,136,0.3)' }}>
      <svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full pointer-events-none select-none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Fade from left (opaque) to transparent ~50% */}
            <linearGradient id="waveLeftFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={pendingMilestone ? '#FFF3CD' : '#E0F2F1'} stopOpacity="1" />
              <stop offset="50%" stopColor={pendingMilestone ? '#FFF3CD' : '#E0F2F1'} stopOpacity="0" />
            </linearGradient>
            <mask id="waveLeftMask">
              <rect width="400" height="80" fill="white" />
              <rect width="400" height="80" fill="url(#waveLeftFade)" />
            </mask>
            {/* Wave belly shape — big swooping curve from bottom-left to top-right */}
            <clipPath id="waveClip">
              <path d="M100 90 C160 90, 200 30, 280 18 C330 10, 370 2, 410 -5 L410 90 Z" />
            </clipPath>
          </defs>
          <g mask="url(#waveLeftMask)">
            {/* Wave body */}
            <path d="M100 90 C160 90, 200 30, 280 18 C330 10, 370 2, 410 -5 L410 90 Z"
              fill={pendingMilestone ? '#E6AC00' : '#38B2A0'} opacity="0.22" />
            {/* Fine radiating stripes */}
            <g clipPath="url(#waveClip)">
              {Array.from({ length: 32 }).map((_, i) => (
                <line key={i}
                  x1={200} y1={130}
                  x2={200 + Math.cos(-0.65 + i * 0.075) * 280}
                  y2={130 + Math.sin(-0.65 + i * 0.075) * 280}
                  stroke={pendingMilestone ? '#7A5200' : '#00695C'}
                  strokeWidth="3.5"
                  strokeOpacity={0.09}
                />
              ))}
              {/* White highlights every 3rd stripe */}
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={i}
                  x1={200} y1={130}
                  x2={200 + Math.cos(-0.63 + i * 0.225) * 280}
                  y2={130 + Math.sin(-0.63 + i * 0.225) * 280}
                  stroke="white"
                  strokeWidth="2"
                  strokeOpacity={0.22}
                />
              ))}
            </g>
            {/* Wave edge — thin and precise */}
            <path d="M100 90 C160 90, 200 30, 280 18 C330 10, 370 2, 410 -5"
              fill="none" stroke={pendingMilestone ? '#C8960A' : '#26A69A'} strokeWidth="1.2" opacity="0.5" />
            <path d="M108 90 C168 90, 207 33, 286 21 C335 13, 374 5, 410 0"
              fill="none" stroke="white" strokeWidth="0.7" opacity="0.55" />
          </g>
        </svg>
      <div className="flex items-center flex-shrink-0 select-none">
        {flames > 0
          ? Array.from({ length: flames }).map((_, i) => <img key={i} src="/flame.svg" alt="" className="w-9 h-9" style={{ marginLeft: i === 0 ? 0 : '-10px' }} />)
          : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              {/* Cover */}
              <rect x="6" y="3" width="20" height="26" rx="2" fill="#4DB6AC" />
              {/* Spine */}
              <rect x="6" y="3" width="4" height="26" rx="1" fill="#00897B" />
              {/* Spiral rings */}
              {[7, 11, 15, 19, 23].map(y => (
                <ellipse key={y} cx="10" cy={y} rx="2" ry="1.5" fill="none" stroke="white" strokeWidth="1.2" />
              ))}
              {/* Lines */}
              <line x1="14" y1="10" x2="23" y2="10" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              <line x1="14" y1="14" x2="23" y2="14" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              <line x1="14" y1="18" x2="23" y2="18" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              <line x1="14" y1="22" x2="20" y2="22" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            </svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-extrabold text-[16px] ${pendingMilestone ? 'text-[#8A6200]' : 'text-kh-dark'}`}>
          {streak} HÜ in Folge erledigt!
        </div>
        {pendingMilestone ? (
          <div className="text-[12.5px] font-semibold text-[#A07800] mt-0.5">
            Meilenstein erreicht · Warte auf Bestätigung deiner Eltern
          </div>
        ) : (
          <div className="text-[12.5px] font-semibold text-kh-teal mt-0.5">
            Weiter so — nächster Meilenstein bei {Math.ceil(streak / 5) * 5} HÜ
          </div>
        )}
      </div>
    </div>
  )
}
