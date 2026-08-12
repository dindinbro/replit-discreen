import type { AdjacencyEntry, EntityKind, EntityNode } from "./types";

export interface VisibilityState {
  hiddenIds: Set<string>;
  activeFilters: Set<EntityKind> | null; // null = tous les types visibles
  isolateFocusId: string | null; // mode "voisins directs uniquement"
}

export function isNodeVisible(
  node: EntityNode,
  state: VisibilityState,
  adjacency: Map<string, AdjacencyEntry[]>,
  byId?: Map<string, EntityNode>,
): boolean {
  if (state.hiddenIds.has(node.id)) return false;
  if (state.activeFilters && !state.activeFilters.has(node.kind)) return false;
  if (state.isolateFocusId) {
    if (node.id === state.isolateFocusId) return true;
    const directNeighbors = adjacency.get(state.isolateFocusId) || [];
    const visible = new Set(directNeighbors.map(n => n.neighbor));
    // Un voisin direct "branche" (isCategory) n'a de sens que si les valeurs
    // qu'il regroupe restent visibles a leur tour (sinon isoler une personne
    // ne montrerait que des branches vides).
    if (byId) {
      for (const { neighbor } of directNeighbors) {
        if (byId.get(neighbor)?.isCategory) {
          for (const { neighbor: grandchild } of adjacency.get(neighbor) || []) visible.add(grandchild);
        }
      }
    }
    if (!visible.has(node.id)) return false;
  }
  return true;
}
