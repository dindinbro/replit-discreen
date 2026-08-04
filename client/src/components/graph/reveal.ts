import type { AdjacencyEntry, EntityNode } from "./types";
import { computeRingDistances, ringIndexOf } from "./rings";

const RING_BASE_DELAY_MS = 260;
const NODE_STAGGER_MS = 45;
const SPAWN_ANIM_MS = 340;

export interface RevealState {
  spawnAt: Map<string, number>;
  startedAt: number;
  totalDurationMs: number;
}

/**
 * Sequence l'apparition "on dirait qu'on decouvre les donnees en direct" :
 * anneau 0 immediat, chaque anneau suivant demarre apres un delai fixe, et a
 * l'interieur d'un anneau les noeuds de plus haut degre (les hubs) arrivent
 * en premier. Ne doit etre rejouee qu'au premier montage d'une combinaison
 * profils+focus donnee — un changement de focus ulterieur reheat/reorganise
 * la simulation sans rejouer toute la sequence (voir useGraphEngine.ts).
 */
export function scheduleReveal(nodes: EntityNode[], adjacency: Map<string, AdjacencyEntry[]>, focusId: string | null): Omit<RevealState, "startedAt"> {
  const spawnAt = new Map<string, number>();
  if (!focusId) {
    nodes.forEach(n => spawnAt.set(n.id, 0));
    return { spawnAt, totalDurationMs: 0 };
  }

  const distances = computeRingDistances(adjacency, focusId);
  const byRing = new Map<number, EntityNode[]>();
  nodes.forEach(n => {
    const ring = ringIndexOf(distances.get(n.id));
    if (!byRing.has(ring)) byRing.set(ring, []);
    byRing.get(ring)!.push(n);
  });

  let cursor = 0;
  Array.from(byRing.keys()).sort((a, b) => a - b).forEach(ring => {
    const ringNodes = byRing.get(ring)!.sort((a, b) => b.degree - a.degree);
    ringNodes.forEach((n, i) => spawnAt.set(n.id, cursor + i * NODE_STAGGER_MS));
    cursor += Math.max(ringNodes.length - 1, 0) * NODE_STAGGER_MS + RING_BASE_DELAY_MS;
  });

  return { spawnAt, totalDurationMs: cursor };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Progression 0..1 (easee) de l'apparition d'un noeud a l'instant `now`. */
export function spawnProgress(nodeId: string, state: RevealState | null, now: number): number {
  if (!state) return 1;
  const at = state.spawnAt.get(nodeId);
  if (at === undefined) return 1;
  const elapsed = now - state.startedAt - at;
  if (elapsed <= 0) return 0;
  if (elapsed >= SPAWN_ANIM_MS) return 1;
  return easeOutCubic(elapsed / SPAWN_ANIM_MS);
}

export function isRevealDone(state: RevealState | null, now: number): boolean {
  if (!state) return true;
  return now - state.startedAt >= state.totalDurationMs + SPAWN_ANIM_MS;
}
