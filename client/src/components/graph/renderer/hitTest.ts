import { quadtree, type Quadtree } from "d3-quadtree";
import type { EntityNode } from "../types";
import { nodeDimensions } from "../metrics";

/** Reconstruit a chaque tick a partir des positions live — cf. simulation.ts. */
export function buildQuadtree(nodes: EntityNode[]): Quadtree<EntityNode> {
  return quadtree<EntityNode>()
    .x(d => d.x ?? 0)
    .y(d => d.y ?? 0)
    .addAll(nodes);
}

/**
 * Trouve le noeud sous un point donne (espace simulation, apres inversion de
 * la transform ecran par l'appelant). `qt.find` renvoie le point le plus
 * proche dans un rayon donne (pas une detection rectangle precise) — on
 * verifie ensuite que le point tombe bien dans le rectangle de la carte,
 * pour eviter de "capturer" un clic dans l'espace entre deux cartes
 * voisines. Simplification assumee : un noeud cache/pas encore visible
 * proche du point peut ponctuellement etre choisi par `find` avant d'etre
 * rejete par `isVisible` — cas limite sans impact pratique a cette echelle.
 */
export function findNodeAt(qt: Quadtree<EntityNode>, x: number, y: number, isVisible: (n: EntityNode) => boolean): EntityNode | null {
  const candidate = qt.find(x, y, 170);
  if (!candidate || !isVisible(candidate)) return null;
  const { width, height } = nodeDimensions(candidate);
  const nx = candidate.x ?? 0, ny = candidate.y ?? 0;
  if (Math.abs(x - nx) <= width / 2 && Math.abs(y - ny) <= height / 2) return candidate;
  return null;
}
