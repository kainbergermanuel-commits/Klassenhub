'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import AvatarPickerModal from '@/components/ui/AvatarPickerModal'
import type { Profile, Class } from '@/lib/types'

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: number
}

interface SidebarProps {
  profile: Profile
  klass: Class | null
  navItems: NavItem[]
}

export default function Sidebar({ profile, klass, navItems }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await Promise.all([
      supabase.auth.signOut(),
      fetch('/api/preview-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: null }) }),
    ])
    router.replace('/login')
    router.refresh()
  }

  const initials = profile.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel =
    profile.role === 'teacher' ? 'Lehrkraft' : profile.role === 'parent' ? 'Elternteil' : 'Schüler:in'

  return (
    <>
      <aside className={`hidden md:flex flex-col flex-shrink-0 border-r border-kh-border/60 bg-[#FBF9F4] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[256px]'}`}>
        {/* Wordmark */}
        <div className={`flex items-center gap-2.5 px-[18px] pt-6 pb-5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-[11px] gradient-teal flex items-center justify-center text-white flex-shrink-0">
            <span className="msym text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          {!collapsed && <span className="font-extrabold text-[18px] text-kh-dark tracking-tight">KlassenHub</span>}
        </div>

        {/* Profile */}
        <div className={`flex flex-col items-center text-center pb-5 ${collapsed ? 'px-2' : 'px-5'}`}>
          <button
            onClick={() => setShowPicker(true)}
            className="relative group focus:outline-none"
            title="Avatar ändern"
          >
            <Avatar
              name={profile.full_name}
              color={profile.avatar_color}
              seed={profile.avatar_seed}
              hairColor={profile.avatar_hair_color}
              skinColor={profile.avatar_skin_color}
              size={collapsed ? 40 : 64}
              className="shadow-sm"
            />
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
              <span className="msym text-white text-[20px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
            </div>
          </button>
          {!collapsed && (
            <>
              <div className="font-bold text-[15px] text-kh-dark mt-2.5 leading-tight">{profile.full_name}</div>
              <div className="text-xs text-kh-muted font-medium mt-0.5">
                {roleLabel}{klass ? ` · ${klass.name}` : ''}
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex flex-col gap-0.5 flex-1 ${collapsed ? 'px-2' : 'px-3.5'}`}>
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 py-2.5 rounded-xl overflow-hidden transition-all duration-200 ${
                  collapsed ? 'justify-center px-2' : 'px-3.5'
                } ${
                  active
                    ? 'bg-kh-teal-light text-kh-dark'
                    : 'text-kh-muted hover:shadow-sm'
                }`}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'linear-gradient(135deg, #EDEDEC 0%, #F6F3ED 100%)'
                    el.style.transform = 'translateY(-2.5px)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = ''
                    el.style.transform = ''
                  }
                }}
              >
                {active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3.8px] gradient-teal" />
                )}
                <span
                  className="msym text-[22px] transition-all duration-200 flex-shrink-0"
                  style={{
                    fontVariationSettings: `'FILL' ${active ? 1 : 0}`,
                    color: active ? '#0F8A82' : undefined,
                  }}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className={`flex-1 text-[14.5px] ${active ? 'font-bold' : 'font-semibold'}`}>
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-kh-amber-light text-kh-amber">
                    {item.badge}
                  </span>
                ) : null}
                {collapsed && item.badge ? (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-kh-amber" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`flex flex-col gap-1 mx-2 mb-4 ${collapsed ? 'items-center' : ''}`}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-kh-muted hover:bg-[#EDEDEC] transition-all duration-200 text-sm font-semibold w-full ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Ausklappen' : 'Einklappen'}
          >
            <span className="msym text-xl transition-transform duration-300" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              chevron_left
            </span>
            {!collapsed && <span>Einklappen</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-kh-muted hover:bg-red-50 hover:text-kh-red transition-all duration-200 text-sm font-semibold w-full ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Abmelden' : undefined}
          >
            <span className="msym text-xl">logout</span>
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      {showPicker && (
        <AvatarPickerModal
          currentSeed={profile.avatar_seed}
          currentHairColor={profile.avatar_hair_color}
          currentSkinColor={profile.avatar_skin_color}
          userName={profile.full_name}
          color={profile.avatar_color}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
