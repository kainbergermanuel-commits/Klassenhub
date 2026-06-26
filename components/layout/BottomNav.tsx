'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: number
}

export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden sticky bottom-0 z-50 bg-white border-t border-[#EAE4D8] flex px-2 pb-4 pt-2">
      {items.map(item => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-1 relative py-1"
          >
            <div className="relative flex items-center justify-center">
              {active && (
                <span className="absolute inset-0 -m-1.5 rounded-full gradient-teal opacity-15 scale-110" />
              )}
              <span
                className="msym text-[25px] relative z-10 transition-all duration-200"
                style={{
                  fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 500`,
                  color: active ? '#0F8A82' : '#8A9A9C',
                  opacity: active ? 1 : 0.6,
                }}
              >
                {item.icon}
              </span>
              {item.badge ? (
                <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-[#E06B57] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span
              className={`text-[11px] transition-all duration-200 ${active ? 'font-bold' : 'font-semibold opacity-60'}`}
              style={{ color: active ? '#0F8A82' : '#8A9A9C' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
