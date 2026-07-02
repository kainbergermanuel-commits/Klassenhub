interface Props {
  /** Material-Symbol-Name (z.B. "checklist") */
  icon: string
  title: string
  subtitle?: string
  /** Tailwind-Gradient-Klassen für den Icon-Chip; Default = Teal */
  gradient?: string
  /** Überschreibt das Default-Margin (mb-6); z.B. "" wenn der Header in einer
   *  Flex-Zeile mit Action-Buttons steht und der äußere Container das Margin trägt. */
  className?: string
}

/**
 * Einheitlicher Seiten-Header: farbiger Icon-Chip + Titel (+ optionale Subline).
 * Greift die Sidebar-Iconografie auf, damit jede Seite sofort wiedererkennbar ist.
 */
export default function PageHeader({ icon, title, subtitle, gradient = 'from-kh-teal to-emerald-400', className = 'mb-6' }: Props) {
  return (
    <header className={`flex items-center gap-3.5 ${className}`}>
      <div className={`w-11 h-11 max-md:w-10 max-md:h-10 rounded-2xl bg-gradient-to-br ${gradient} shadow-[0_6px_16px_rgba(20,40,45,.15)] flex items-center justify-center flex-shrink-0`}>
        <span className="msym text-[24px] max-md:text-[22px] text-white">{icon}</span>
      </div>
      <div className="min-w-0">
        <h1 className="text-[25px] max-md:text-[22px] font-extrabold text-kh-dark tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-kh-muted font-medium leading-tight mt-0.5">{subtitle}</p>}
      </div>
    </header>
  )
}
