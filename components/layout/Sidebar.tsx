'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ComicAvatar from '@/components/ui/ComicAvatar'
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const initials = profile.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel =
    profile.role === 'teacher' ? 'Lehrkraft' : profile.role === 'parent' ? 'Elternteil' : 'Schüler:in'

  return (
    <>
      <aside className="hidden md:flex flex-col w-[256px] flex-shrink-0 border-r border-kh-border/60 bg-[#FBF9F4]">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 px-6 pt-6 pb-5">
          <div className="w-9 h-9 rounded-[11px] gradient-teal flex items-center justify-center text-white flex-shrink-0">
            <span className="msym text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <span className="font-extrabold text-[18px] text-kh-dark tracking-tight">KlassenHub</span>
        </div>

        {/* Profile */}
        <div className="flex flex-col items-center text-center px-5 pb-5">
          <button
            onClick={() => setShowPicker(true)}
            className="relative group focus:outline-none"
            title="Avatar ändern"
          >
            {profile.avatar_seed || (!profile.gender) ? (
              <Avatar
                name={profile.full_name}
                color={profile.avatar_color}
                seed={profile.avatar_seed}
                hairColor={profile.avatar_hair_color}
                skinColor={profile.avatar_skin_color}
                size={64}
                className="shadow-sm"
              />
            ) : (
              <ComicAvatar gender={profile.gender} color={profile.avatar_color} size={64} className="rounded-full shadow-sm" />
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
              <span className="msym text-white text-[20px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
            </div>
          </button>
          <div className="font-bold text-[15px] text-kh-dark mt-2.5 leading-tight">{profile.full_name}</div>
          <div className="text-xs text-kh-muted font-medium mt-0.5">
            {roleLabel}{klass ? ` · ${klass.name}` : ''}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3.5 flex-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-kh-teal-light text-kh-dark'
                    : 'text-kh-muted hover:bg-[#F6F3ED]'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full gradient-teal" />
                )}
                <span
                  className="msym text-[22px] transition-all duration-200"
                  style={{
                    fontVariationSettings: `'FILL' ${active ? 1 : 0}`,
                    color: active ? '#0F8A82' : undefined,
                  }}
                >
                  {item.icon}
                </span>
                <span className={`flex-1 text-[14.5px] ${active ? 'font-bold' : 'font-semibold'}`}>
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-kh-amber-light text-kh-amber">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 mx-3.5 mb-4 px-3.5 py-2.5 rounded-xl text-kh-muted hover:bg-red-50 hover:text-kh-red transition-all duration-200 text-sm font-semibold"
        >
          <span className="msym text-xl">logout</span>
          Abmelden
        </button>
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
