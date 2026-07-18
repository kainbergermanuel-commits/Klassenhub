'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import AvatarPickerModal from '@/components/ui/AvatarPickerModal'
import { gendered } from '@/lib/gender'
import { STREAKS_SUBLINKS } from '@/lib/streaksNav'
import type { Profile, Class } from '@/lib/types'

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: number
  /** Beginnt eine neue Gruppe — dezentes Label davor (bzw. Trennlinie, wenn eingeklappt) */
  section?: string
}

interface SidebarProps {
  profile: Profile
  klass: Class | null
  navItems: NavItem[]
  teacherClasses?: Class[]
  activeClassId?: string | null
  isPreview?: boolean
}

export default function Sidebar({ profile, klass, navItems, teacherClasses = [], activeClassId, isPreview = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(!isPreview && profile.role === 'student' && !profile.avatar_seed)
  const [collapsed, setCollapsed] = useState(false)
  const [switchingClass, setSwitchingClass] = useState(false)

  const showClassSwitcher = profile.role === 'teacher' && teacherClasses.length > 1

  async function handleSwitchClass(classId: string) {
    if (switchingClass || classId === activeClassId) return
    setSwitchingClass(true)
    await fetch('/api/active-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    })
    router.refresh()
    setSwitchingClass(false)
  }

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
    profile.role === 'teacher' ? 'Lehrperson'
    : profile.role === 'parent' ? 'Elternteil'
    : klass ? `Klasse ${klass.name}` : gendered('Schüler', profile.gender)

  return (
    <>
      <aside className={`hidden md:flex flex-col flex-shrink-0 border-r border-kh-border/60 bg-[#FBF9F4] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[256px]'}`}>
        {/* Wordmark + Einklappen */}
        <div className={`relative px-[18px] pt-5 pb-8 flex items-center ${collapsed ? 'flex-col gap-2.5' : 'justify-center'}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[9px] gradient-teal flex items-center justify-center text-white flex-shrink-0">
              <span className="msym text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            {!collapsed && <span className="font-extrabold text-[15px] text-kh-dark tracking-tight">KlassenHub</span>}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-7 h-7 flex items-center justify-center rounded-full text-kh-border hover:text-kh-muted hover:bg-[#EDEDEC] transition-colors flex-shrink-0 ${collapsed ? '' : 'absolute right-[18px] top-5'}`}
            title={collapsed ? 'Ausklappen' : 'Einklappen'}
          >
            <span className="msym text-[18px] transition-transform duration-300" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              chevron_left
            </span>
          </button>
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
              <div className="flex items-center gap-1 justify-center mt-2.5">
                <div className="font-bold text-[15px] text-kh-dark leading-tight">{profile.full_name}</div>
                {profile.is_admin && (
                  <span className="msym text-[15px] text-kh-teal" title="Administrator" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                )}
              </div>
              <div className="text-xs text-kh-muted font-medium mt-0.5">
                {roleLabel}{profile.role !== 'student' && klass ? ` · ${klass.name}` : ''}
              </div>
            </>
          )}
        </div>

        {/* Klassen-Umschalter (nur bei mehreren Klassen) */}
        {showClassSwitcher && (
          <div className={`mb-2 ${collapsed ? 'px-2' : 'px-3.5'}`}>
            {collapsed ? (
              <div className="flex flex-col gap-1 items-center">
                {teacherClasses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSwitchClass(c.id)}
                    title={c.name}
                    className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all ${
                      c.id === activeClassId
                        ? 'gradient-teal text-white shadow-sm'
                        : 'text-kh-muted/60 hover:text-kh-muted hover:bg-kh-border/30'
                    }`}
                  >
                    {c.name.slice(0, 2)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1 px-1 flex-wrap">
                {teacherClasses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSwitchClass(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold transition-all ${
                      c.id === activeClassId
                        ? 'gradient-teal text-white shadow-sm'
                        : 'text-kh-muted/60 hover:text-kh-muted hover:bg-kh-border/20'
                    }`}
                  >
                    <span className="msym text-[14px]" style={{ fontVariationSettings: `'FILL' ${c.id === activeClassId ? 1 : 0}` }}>
                      group
                    </span>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className={`flex flex-col gap-0.5 flex-1 ${collapsed ? 'px-2' : 'px-3.5'}`}>
          {navItems.map(item => {
            const isStreaksItem = item.href === '/streaks'
            const onStreaksFamily = isStreaksItem && pathname.startsWith('/streaks')
            // Unterseiten von "Abenteuer" (durchblätterbar, jederzeit erreichbar).
            const onSubPage = isStreaksItem && pathname.startsWith('/streaks/')
            const active = pathname === item.href
            // Auf einer Unterseite bekommt "Abenteuer" nur noch eine dezente
            // grüne Markierung statt der vollen Pille — die Pille wandert auf
            // den aktiven Unterlink (siehe unten).
            const halfActive = onSubPage
            return (
              <div key={item.href}>
                {item.section && (
                  collapsed ? (
                    <div className="h-px bg-kh-border/50 mx-2 my-2" />
                  ) : (
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-kh-muted/60 px-3.5 pt-3.5 pb-1">
                      {item.section}
                    </div>
                  )
                )}
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-3 py-2.5 rounded-xl overflow-hidden transition-all duration-200 ${
                    collapsed ? 'justify-center px-2' : 'px-3.5'
                  } ${
                    active
                      ? 'text-kh-dark shadow-sm'
                      : halfActive
                      ? 'text-kh-teal'
                      : 'text-kh-muted hover:bg-[#EDEDEC] hover:-translate-y-[2.5px] hover:shadow-sm'
                  }`}
                  style={active ? { background: 'linear-gradient(to bottom right, #C2E6DF 0%, #E4F3F0 100%)' } : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3.8px]" style={{ background: 'linear-gradient(to top, #0F8A82 0%, #3DB5AC 100%)' }} />
                  )}
                  <span
                    className={`msym text-[20.5px] transition-all duration-200 flex-shrink-0 ${
                      active || halfActive ? '' : 'text-[#9AA6A7] group-hover:text-[#6E7E80]'
                    }`}
                    style={{
                      fontVariationSettings: `'FILL' ${active || halfActive ? 1 : 0}`,
                      color: active || halfActive ? '#0F8A82' : undefined,
                    }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className={`flex-1 text-[14px] ${active ? 'font-bold' : 'font-semibold'}`}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge ? (
                    <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center gradient-amber text-white shadow-[0_2px_6px_rgba(201,138,43,.4)]">
                      {item.badge}
                    </span>
                  ) : null}
                  {collapsed && item.badge ? (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-kh-amber" />
                  ) : null}
                </Link>

                {/* Aufklappbares Untermenü: Abenteuer-Unterseiten, nur sichtbar,
                    solange man auf einer /streaks-Seite ist. Eigene, kleinere
                    Pille, wenn aktiv — analog zu den Hauptlinks, aber kompakter. */}
                {!collapsed && onStreaksFamily && STREAKS_SUBLINKS.map(sub => {
                  const subActive = pathname === sub.href
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`relative flex items-center gap-2 py-1.5 px-3 ml-[30px] mr-1 rounded-lg text-[12.5px] transition-all duration-200 overflow-hidden ${
                        subActive
                          ? 'text-kh-dark font-bold shadow-sm'
                          : 'text-kh-muted hover:text-kh-dark hover:bg-[#EDEDEC] font-semibold'
                      }`}
                      style={subActive ? { background: 'linear-gradient(to bottom right, #C2E6DF 0%, #E4F3F0 100%)' } : undefined}
                    >
                      {subActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ background: 'linear-gradient(to top, #0F8A82 0%, #3DB5AC 100%)' }} />
                      )}
                      <span
                        className="msym text-[15px] flex-shrink-0"
                        style={{ fontVariationSettings: `'FILL' ${subActive ? 1 : 0}`, color: subActive ? '#0F8A82' : undefined }}
                      >
                        {sub.icon}
                      </span>
                      {sub.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Einstellungen + Abmelden */}
        <div className={`mt-auto mb-4 flex justify-center gap-1 ${collapsed ? 'flex-col items-center' : ''}`}>
          <Link
            href="/einstellungen"
            title="Einstellungen"
            aria-label="Einstellungen"
            className={`flex flex-col items-center gap-0.5 py-2 ${collapsed ? 'px-2' : 'px-3'} rounded-xl transition-colors ${
              pathname === '/einstellungen' ? 'text-kh-teal' : 'text-kh-muted hover:text-kh-dark hover:bg-[#EDEDEC]'
            }`}
          >
            <span className="msym text-[20px]" style={{ fontVariationSettings: `'FILL' ${pathname === '/einstellungen' ? 1 : 0}` }}>settings</span>
            {!collapsed && <span className="text-[10px] font-semibold">Einstellungen</span>}
          </Link>
          <button
            onClick={handleLogout}
            title="Abmelden"
            aria-label="Abmelden"
            className={`flex flex-col items-center gap-0.5 py-2 ${collapsed ? 'px-2' : 'px-3'} rounded-xl text-kh-muted hover:text-kh-red hover:bg-red-50 transition-colors`}
          >
            <span className="msym text-[20px]">power_settings_new</span>
            {!collapsed && <span className="text-[10px] font-semibold">Abmelden</span>}
          </button>
        </div>
      </aside>

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
