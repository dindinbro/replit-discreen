import { select, pointer, type Selection } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { drag as d3drag } from "d3-drag";
import "d3-transition"; // augmente Selection.prototype avec .transition() — utilise par resetView/centerOn
import type { EntityNode } from "./types";
import type { CanvasRendererHandle } from "./renderer/CanvasRenderer";
import type { GraphSimulation } from "./simulation";

export interface ViewportCallbacks {
  onHover(nodeId: string | null): void;
  onClickNode(node: EntityNode, additive: boolean): void;
  onClickEmpty(): void;
  onDoubleClickNode(node: EntityNode): void;
  onDoubleClickEmpty(): void;
}

export interface ViewportHandle {
  resetView(): void;
  centerOn(node: EntityNode, k?: number): void;
  destroy(): void;
}

/**
 * Cablage d3-zoom (pan/zoom) + d3-drag (deplacement de noeud) sur le meme
 * canvas. Point delicat : les deux behaviors ecoutent le meme `mousedown`.
 * Plutot que jouer avec l'ordre d'enregistrement des listeners et
 * stopPropagation (fragile, depend de l'ordre de `.call()`), le filtre de
 * zoom rejette explicitement tout geste qui demarre sur un noeud — le pan
 * ne peut alors tout simplement jamais s'engager en meme temps qu'un drag
 * de noeud, quel que soit l'ordre d'enregistrement.
 */
export function attachViewport(
  canvas: HTMLCanvasElement,
  renderer: CanvasRendererHandle,
  sim: GraphSimulation,
  getNodes: () => EntityNode[],
  callbacks: ViewportCallbacks,
): ViewportHandle {
  const selection = select(canvas) as Selection<HTMLCanvasElement, unknown, null, undefined>;
  let currentTransform: ZoomTransform = zoomIdentity;

  const zoomBehavior = d3zoom<HTMLCanvasElement, unknown>()
    .scaleExtent([0.12, 2.6])
    .filter((event: any) => {
      if (event.button) return false;
      if (event.type === "wheel") return true;
      const [sx, sy] = pointer(event, canvas);
      return renderer.hitTestScreen(sx, sy) === null;
    })
    .on("zoom", (event) => {
      currentTransform = event.transform;
      renderer.setTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
    });

  selection.call(zoomBehavior);
  selection.on("dblclick.zoom", null);

  let draggingNode: EntityNode | null = null;

  const dragBehavior = d3drag<HTMLCanvasElement, unknown>()
    .clickDistance(4)
    .subject((event: any) => {
      const [sx, sy] = pointer(event, canvas);
      return renderer.hitTestScreen(sx, sy);
    })
    .on("start", (event) => {
      const node = event.subject as EntityNode | null;
      if (!node) return;
      draggingNode = node;
      sim.simulation.alphaTarget(0.25).restart();
    })
    .on("drag", (event) => {
      if (!draggingNode) return;
      const [sx, sy] = pointer(event.sourceEvent, canvas);
      const world = renderer.screenToWorld(sx, sy);
      draggingNode.fx = world.x;
      draggingNode.fy = world.y;
      renderer.markDirty();
    })
    .on("end", () => {
      if (!draggingNode) return;
      sim.simulation.alphaTarget(0);
      if (!sim.isLocked(draggingNode.id) && draggingNode.id !== sim.getFocus()) {
        draggingNode.fx = null;
        draggingNode.fy = null;
      }
      draggingNode = null;
    });

  selection.call(dragBehavior);

  selection.on("mousemove", (event) => {
    if (draggingNode) return;
    const [sx, sy] = pointer(event, canvas);
    const node = renderer.hitTestScreen(sx, sy);
    callbacks.onHover(node?.id ?? null);
  });
  selection.on("mouseleave", () => callbacks.onHover(null));

  selection.on("click", (event) => {
    const [sx, sy] = pointer(event, canvas);
    const node = renderer.hitTestScreen(sx, sy);
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    if (node) callbacks.onClickNode(node, additive);
    else callbacks.onClickEmpty();
  });

  selection.on("dblclick", (event) => {
    event.preventDefault();
    const [sx, sy] = pointer(event, canvas);
    const node = renderer.hitTestScreen(sx, sy);
    if (node) callbacks.onDoubleClickNode(node);
    else callbacks.onDoubleClickEmpty();
  });

  function containerSize() {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width || 1, height: rect.height || 1 };
  }

  function computeFitTransform(): ZoomTransform {
    const nodes = getNodes();
    if (!nodes.length) return zoomIdentity;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const x = n.x ?? 0, y = n.y ?? 0;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const { width, height } = containerSize();
    const boxW = Math.max(maxX - minX, 1), boxH = Math.max(maxY - minY, 1);
    const padding = 140;
    const k = Math.min((width - padding) / boxW, (height - padding) / boxH, 1.4) || 1;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(Math.max(k, 0.12));
  }

  return {
    resetView() {
      selection.transition().duration(500).call(zoomBehavior.transform as any, computeFitTransform());
    },
    centerOn(node, k) {
      const { width, height } = containerSize();
      const targetK = k ?? Math.max(currentTransform.k, 0.9);
      const t = zoomIdentity.translate(width / 2 - (node.x ?? 0) * targetK, height / 2 - (node.y ?? 0) * targetK).scale(targetK);
      selection.transition().duration(500).call(zoomBehavior.transform as any, t);
    },
    destroy() {
      selection.on(".zoom", null).on(".drag", null).on("click", null).on("dblclick", null).on("mousemove", null).on("mouseleave", null);
    },
  };
}
