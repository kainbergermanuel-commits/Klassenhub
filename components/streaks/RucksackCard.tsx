import RucksackItems from './RucksackItems'
import type { RucksackState } from '@/lib/rucksack'

/** Der Rucksack als eigene Card (auf `/streaks`): private Sammlung an
 *  Ausrüstungs-Items, die reale App-Mechaniken im Abenteuer-Skin abbilden.
 *  Die Items selbst leben in `RucksackItems` (auch im Heldenbuch-Overlay
 *  wiederverwendet). */
export default function RucksackCard({ state }: { state: RucksackState }) {
  return (
    <div className="kh-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="msym text-[19px] text-kh-teal" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
        <h2 className="font-extrabold text-base text-kh-dark">Dein Rucksack</h2>
      </div>
      <RucksackItems state={state} />
    </div>
  )
}
