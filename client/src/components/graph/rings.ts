import type { AdjacencyEntry, EntityKind } from "./types";
import { ENTITY_REGISTRY } from "./registry";

/**
 * Seuils de distance ponderee -> index d'anneau. Calibres pour que :
 *  - distance 0            -> anneau 0 (le focus)
 *  - attribut direct "fort" (email/tel/adresse, poids 1) -> anneau 1
 *  - attribut direct "secondaire" (ip/domaine/username/vehicule, poids 1.6) -> anneau 2
 *  - une autre personne atteinte via un attribut partage (distance >= 2)
 *    ou un attribut "rare" (banque/document, poids 2) -> anneau 3 (peripherie)
 */
const RING_THRESHOLDS = [0, 1.3, 1.8];

export function edgeWeight(kind: EntityKind): number {
  return ENTITY_REGISTRY[kind].ringWeight;
}

/**
 * Distance ponderee (Dijkstra) depuis le noeud focus sur le graphe non
 * oriente forme par `adjacency`. Alimente rings.ts -> simulation.ts pour
 * positionner les noeuds en anneaux concentriques via un forceRadial, sans
 * jamais figer un rayon par type d'entite en dur.
 */
export function computeRingDistances(adjacency: Map<string, AdjacencyEntry[]>, focusId: string | null): Map<string, number> {
  const distances = new Map<string, number>();
  if (!focusId) return distances;
  distances.set(focusId, 0);
  const visited = new Set<string>();

  // File de priorite naive : les graphes Wanted restent de l'ordre de
  // quelques centaines de noeuds, O(n^2) est largement suffisant ici.
  for (;;) {
    let currentId: string | null = null;
    let currentDist = Infinity;
    for (const [id, dist] of distances) {
      if (!visited.has(id) && dist < currentDist) {
        currentId = id;
        currentDist = dist;
      }
    }
    if (currentId === null) break;
    visited.add(currentId);
    const neighbors = adjacency.get(currentId) || [];
    for (const { neighbor, edge } of neighbors) {
      if (visited.has(neighbor)) continue;
      const candidate = currentDist + edgeWeight(edge.kind);
      if (candidate < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, candidate);
      }
    }
  }
  return distances;
}

/** Indice d'anneau (0 = focus, croissant vers la peripherie) a partir d'une distance ponderee. */
export function ringIndexOf(distance: number | undefined): number {
  if (distance === undefined) return RING_THRESHOLDS.length; // inatteignable depuis le focus -> peripherie
  for (let i = 0; i < RING_THRESHOLDS.length; i++) {
    if (distance <= RING_THRESHOLDS[i]) return i;
  }
  return RING_THRESHOLDS.length;
}

export const MAX_RING_INDEX = RING_THRESHOLDS.length; // 0..MAX_RING_INDEX inclus
