'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import AvatarPickerModal from '@/components/ui/AvatarPickerModal'
import { gendered } from '@/lib/gender'
import type { Profile, Class } from '@/lib/types'

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: number
}

interface Props {
  profile: Profile
  klass: Class | null
  navItems: NavItem[]
}

export default function MobileHeader({ profile, klass, navItems }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const roleLabel =
    profile.role === 'teacher' ? 'Lehrperson'
    : profile.role === 'parent' ? 'Elternteil'
    : gendered('Schüler', profile.gender)

  async function handleLogout() {
    const supabase = createClient()
    await Promise.all([
      supabase.auth.signOut(),
      fetch('/api/preview-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: null }) }),
    ])
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      {/* Header */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-kh-border/60">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-kh-muted hover:bg-kh-page transition-colors flex-shrink-0"
          aria-label="Menü öffnen"
        >
          <span className="msym text-[24px]">menu</span>
        </button>
        <div className="w-px h-5 bg-kh-border/60 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-[15px] text-kh-dark leading-tight">KlassenHub</div>
          <div className="text-[11.5px] text-kh-muted font-medium truncate">
            {klass ? `${klass.name} · ${klass.school}` : roleLabel}
          </div>
        </div>
        <div className="w-8 h-8 flex-shrink-0">
          <Avatar
            name={profile.full_name}
            color={profile.avatar_color}
            seed={profile.avatar_seed}
            hairColor={profile.avatar_hair_color}
            skinColor={profile.avatar_skin_color}
            size={32}
          />
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-[#FBF9F4] flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header im Drawer */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[9px] gradient-teal flex items-center justify-center text-white flex-shrink-0">
              <span className="msym text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <span className="font-extrabold text-[15px] text-kh-dark tracking-tight">KlassenHub</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-kh-muted hover:bg-[#EDEDEC] transition-colors"
          >
            <span className="msym text-[20px]">close</span>
          </button>
        </div>

        {/* Profil */}
        <div className="flex items-center gap-3 px-5 pb-5 border-b border-kh-border/60">
          <button onClick={() => setShowPicker(true)} className="relative group focus:outline-none flex-shrink-0">
            <Avatar
              name={profile.full_name}
              color={profile.avatar_color}
              seed={profile.avatar_seed}
              hairColor={profile.avatar_hair_color}
              skinColor={profile.avatar_skin_color}
              size={44}
            />
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
              <span className="msym text-white text-[16px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
            </div>
          </button>
          <div className="min-w-0">
            <div className="font-bold text-[14px] text-kh-dark leading-tight truncate flex items-center gap-1">
              {profile.full_name}
              {profile.is_admin && (
                <span className="msym text-[14px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              )}
            </div>
            <div className="text-[12px] text-kh-muted font-medium">
              {roleLabel}{klass ? ` · ${klass.name}` : ''}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 pt-3 flex-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  active
                    ? 'bg-kh-teal-light text-kh-dark'
                    : 'text-kh-muted hover:bg-[#EDEDEC]'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3.8px] gradient-teal rounded-l-xl" />
                )}
                <span
                  className="msym text-[22px] flex-shrink-0"
                  style={{
                    fontVariationSettings: `'FILL' ${active ? 1 : 0}`,
                    color: active ? '#0F8A82' : undefined,
                  }}
                >
                  {item.icon}
                </span>
                <span className={`flex-1 text-[14px] ${active ? 'font-bold' : 'font-semibold'}`}>
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

        {/* Logout */}
        <div className="p-4 border-t border-kh-border/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-kh-muted hover:text-kh-red hover:bg-red-50 transition-colors"
          >
            <span className="msym text-[20px]">power_settings_new</span>
            <span className="text-[14px] font-semibold">Abmelden</span>
          </button>
        </div>
      </div>
      {showPicker && (
        <AvatarPickerModal
          currentSeed={profile.avatar_seed}
          currentHairColor={profile.avatar_hair_color}
          currentSkinColor={profile.avatar_skin_color}
          currentGender={profile.gender}
          showGender={profile.role === 'student'}
          userName={profile.full_name}
          color={profile.avatar_color}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
