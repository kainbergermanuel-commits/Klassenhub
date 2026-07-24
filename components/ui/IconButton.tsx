import Link from 'next/link'
import type { ComponentProps } from 'react'

/** Einheitlicher Icon-Button für die ganze App: eckig, weiß, dünne Kontur,
 *  beim Hover ein *dezenter* Creme-Verlauf + Teal-Kontur — dieselbe Bildsprache
 *  wie die Umschalter-Kapseln (siehe feedback-toggle-chip-design). Ersetzt die
 *  vormals ~5 verschiedenen Hover-/Füll-/Radius-Varianten für Zurück-Buttons,
 *  Modal-Schließen, Pagination-Pfeile und andere reine Icon-Aktionen.
 *
 *  Zwei Größen: 'sm' (32px, z.B. Pagination/Modal-Schließen) und 'md' (36px,
 *  z.B. Zurück-Buttons in Seitenköpfen). */
const SIZES = {
  sm: { box: 'w-8 h-8', icon: 18 },
  md: { box: 'w-9 h-9', icon: 20 },
} as const

export type IconButtonSize = keyof typeof SIZES

/** Reine Klassen-Fassung — für Fälle, die kein <button> sein können/sollen
 *  (z.B. wenn der Look auf ein anderes Element übertragen werden muss). Der
 *  Link-Fall ist über die `href`-Prop der Komponente selbst abgedeckt. */
export function iconButtonClass(size: IconButtonSize = 'md', extra = ''): string {
  return `${SIZES[size].box} flex-shrink-0 rounded-lg bg-white border border-kh-border/60 flex items-center justify-center text-kh-muted transition-[color,border-color,background-image] duration-150 hover:text-kh-dark hover:border-kh-teal/45 hover:bg-gradient-to-b hover:from-[#FBF7EE] hover:to-white disabled:opacity-40 disabled:pointer-events-none ${extra}`
}

type CommonProps = {
  /** Material-Symbol-Name (z.B. "arrow_back", "close", "chevron_left"). */
  icon: string
  size?: IconButtonSize
  /** Icon-Größe in px überschreiben (Default: 18 bei sm, 20 bei md). */
  iconSize?: number
  className?: string
}

type AsButton = CommonProps & Omit<ComponentProps<'button'>, keyof CommonProps> & { href?: undefined }
type AsLink = CommonProps & Omit<ComponentProps<typeof Link>, keyof CommonProps> & { href: string }

/** Rendert ein <button> — oder ein <Link>, sobald `href` gesetzt ist. */
export default function IconButton(props: AsButton | AsLink) {
  const { icon, size = 'md', iconSize, className = '', ...rest } = props
  const cls = iconButtonClass(size, className)
  const glyph = (
    <span className="msym leading-none" style={{ fontSize: iconSize ?? SIZES[size].icon }}>{icon}</span>
  )

  if (props.href !== undefined) {
    const { href: _h, ...linkRest } = rest as Omit<AsLink, keyof CommonProps>
    return <Link href={props.href} className={cls} {...linkRest}>{glyph}</Link>
  }
  return <button className={cls} {...(rest as Omit<AsButton, keyof CommonProps | 'href'>)}>{glyph}</button>
}
