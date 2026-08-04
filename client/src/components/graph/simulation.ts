import { forceSimulation, forceLink, forceManyBody, forceCollide, forceRadial, forceCenter, type Simulation } from "d3-force";
import type { AdjacencyEntry, EntityEdge, EntityKind, EntityNode } from "./types";
import { computeRingDistances, ringIndexOf, MAX_RING_INDEX } from "./rings";
import { nodeRadius } from "./metrics";

/** Arete telle que consommee par le renderer une fois resolue par d3-force. */
export interface RuntimeEdge {
  id: string;
  kind: EntityKind;
  relationLabel: string;
  weight: number;
  source: EntityNode;
  target: EntityNode;
}

const RING_RADII = [0, 220, 380, 560];
const LINK_DISTANCE: Partial<Record<EntityKind, number>> = {
  email: 90, phone: 90, address: 100,
  ip: 130, discord: 120, username: 110, vehicle: 120, domain: 130,
  bank: 150, document: 150,
};

export interface GraphSimulation {
  simulation: Simulation<EntityNode, RuntimeEdge>;
  /** Aretes resolues (source/target = objets EntityNode vivants) — a utiliser pour le rendu. */
  edges: RuntimeEdge[];
  setFocus(id: string | null): void;
  getFocus(): string | null;
  setLocked(id: string, locked: boolean): void;
  isLocked(id: string): boolean;
  subscribeTick(cb: () => void): () => void;
  reheat(alpha?: number): void;
  destroy(): void;
}

/**
 * Cree et configure la simulation physique. Le focus determine des anneaux
 * concentriques (rings.ts) traduits en cibles de rayon pour un forceRadial ;
 * charge + collision dispersent les noeuds de facon organique autour de ce
 * rayon (pas de cercle parfait comme l'ancien code). Zoom/pan (viewport.ts)
 * n'affectent jamais ces coordonnees : elles vivent dans un espace virtuel
 * independant de l'ecran, seule la transformation de vue au rendu change.
 *
 * Les noeuds "caches" (hidden) restent physiquement simules — on evite ainsi
 * de re-binder nodes()/links() a chaque masquage/demasquage — mais ne sont
 * ni dessines ni cliquables (voir renderer/CanvasRenderer.ts et hitTest.ts).
 */
export function createSimulation(nodes: EntityNode[], edges: EntityEdge[], adjacency: Map<string, AdjacencyEntry[]>): GraphSimulation {
  let focusId: string | null = null;
  let ringByNode = new Map<string, number>();
  const locked = new Set<string>();
  const tickCallbacks = new Set<() => void>();

  // d3-force mute les aretes en place pour resoudre source/target (string id
  // -> objet EntityNode) : on clone pour ne jamais toucher le GraphModel
  // d'origine (utilise tel quel pour l'export JSON et l'adjacence).
  const runtimeEdges = edges.map(e => ({ ...e })) as unknown as RuntimeEdge[];

  const ringRadiusOf = (node: EntityNode) => {
    const ring = Math.min(ringByNode.get(node.id) ?? MAX_RING_INDEX, RING_RADII.length - 1);
    return RING_RADII[ring];
  };

  const linkForce = forceLink<EntityNode, RuntimeEdge>(runtimeEdges as any)
    .id((d: any) => d.id)
    .distance(d => LINK_DISTANCE[d.kind] ?? 90)
    .strength(0.25);

  const chargeForce = forceManyBody<EntityNode>().strength(-220).distanceMax(900);
  const collideForce = forceCollide<EntityNode>().radius(d => nodeRadius(d) + 6).strength(0.9);
  const radialForce = forceRadial<EntityNode>(d => ringRadiusOf(d), 0, 0)
    .strength(d => (d.id === focusId ? 0 : 0.35));
  const centerForce = forceCenter(0, 0).strength(0.02);

  const simulation = forceSimulation<EntityNode>(nodes)
    .force("link", linkForce)
    .force("charge", chargeForce)
    .force("collide", collideForce)
    .force("radial", radialForce)
    .alphaDecay(0.018)
    .on("tick", () => tickCallbacks.forEach(cb => cb()));

  function applyFocus(id: string | null) {
    focusId = id;
    nodes.forEach(n => {
      if (n.id !== id && !locked.has(n.id) && n.fx != null) {
        n.fx = null;
        n.fy = null;
      }
    });
    if (id) {
      ringByNode = computeRingDistances(adjacency, id);
      const node = nodes.find(n => n.id === id);
      if (node) {
        node.fx = 0;
        node.fy = 0;
      }
      simulation.force("center", null);
    } else {
      ringByNode = new Map();
      simulation.force("center", centerForce);
    }
    simulation.alpha(0.6).restart();
  }

  applyFocus(null);

  return {
    simulation,
    edges: runtimeEdges,
    setFocus: applyFocus,
    getFocus: () => focusId,
    setLocked(id, isLocked) {
      if (isLocked) {
        locked.add(id);
      } else {
        locked.delete(id);
        const node = nodes.find(n => n.id === id);
        if (node && node.id !== focusId) {
          node.fx = null;
          node.fy = null;
        }
      }
    },
    isLocked: id => locked.has(id),
    subscribeTick(cb) {
      tickCallbacks.add(cb);
      return () => tickCallbacks.delete(cb);
    },
    reheat(alpha = 0.5) {
      simulation.alpha(alpha).restart();
    },
    destroy() {
      simulation.stop();
      tickCallbacks.clear();
    },
  };
}

export { ringIndexOf };
