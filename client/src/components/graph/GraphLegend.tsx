import { ENTITY_REGISTRY } from "./registry";
import type { EntityKind } from "./types";

/** Legende compacte en lecture seule — pour l'apercu inline (le filtrage interactif vit dans GraphToolbar, plein ecran uniquement). */
export function GraphLegend({ kinds }: { kinds: EntityKind[] }) {
  if (!kinds.length) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
      {kinds.map(kind => (
        <span key={kind} className="flex items-center gap-1.5">
          <span className="text-xs leading-none">{ENTITY_REGISTRY[kind].emoji}</span>
          {ENTITY_REGISTRY[kind].label}
        </span>
      ))}
    </div>
  );
}
