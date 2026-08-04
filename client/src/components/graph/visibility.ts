import type { AdjacencyEntry, EntityKind, EntityNode } from "./types";

export interface VisibilityState {
  hiddenIds: Set<string>;
  activeFilters: Set<EntityKind> | null; // null = tous les types visibles
  isolateFocusId: string | null; // mode "voisins directs uniquement"
}

export function isNodeVisible(node: EntityNode, state: VisibilityState, adjacency: Map<string, AdjacencyEntry[]>): boolean {
  if (state.hiddenIds.has(node.id)) return false;
  if (state.activeFilters && !state.activeFilters.has(node.kind)) return false;
  if (state.isolateFocusId) {
    if (node.id === state.isolateFocusId) return true;
    const neighbors = adjacency.get(state.isolateFocusId) || [];
    if (!neighbors.some(n => n.neighbor === node.id)) return false;
  }
  return true;
}
