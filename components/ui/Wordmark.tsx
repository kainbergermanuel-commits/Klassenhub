/**
 * Die Wortmarke der App. "Class" steht bewusst blasser als "Haven", damit der
 * zweite Teil des Namens trägt. Beide Hälften nutzen dieselbe Markenfarbe, der
 * vordere Teil nur abgeschwächt, sonst entstünde ein zweiter Farbton im Logo.
 *
 * Größe kommt immer von außen (className), damit dieselbe Marke in Sidebar,
 * Kopfzeile und auf den Anmeldeseiten unterschiedlich groß sein kann.
 */
export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold text-kh-dark tracking-tight ${className}`}>
      <span className="text-kh-dark/60">Class</span>Haven
    </span>
  )
}
