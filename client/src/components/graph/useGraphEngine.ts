import { useEffect, useRef } from "react";
import type { ColorMode, EntityKind, EntityNode, GraphModel } from "./types";
import { createSimulation, type GraphSimulation } from "./simulation";
import { scheduleReveal, type RevealState } from "./reveal";
import { createCanvasRenderer, type CanvasRendererHandle } from "./renderer/CanvasRenderer";
import { attachViewport, type ViewportHandle } from "./viewport";
import { isNodeVisible } from "./visibility";
import { exportGraphJSON, exportGraphPNG, exportGraphSVG } from "./export";

export interface GraphEngine {
  attachCanvas(el: HTMLCanvasElement | null): void;
  setFocus(id: string | null, opts?: { recenter?: boolean }): void;
  getFocus(): string | null;
  setFilters(kinds: Set<EntityKind> | null): void;
  setColorMode(mode: ColorMode): void;
  setSearchQuery(query: string): void;
  setLocked(id: string, locked: boolean): void;
  isLocked(id: string): boolean;
  setHidden(id: string, hidden: boolean): void;
  setIsolate(id: string | null): void;
  setSelection(ids: Set<string>): void;
  clearSelection(): void;
  resetView(): void;
  onSelectionChange(cb: (ids: Set<string>) => void): () => void;
  exportPNG(): void;
  exportSVG(): void;
  exportJSON(): void;
  destroy(): void;
}

/** Cree le moteur (simulation + etat d'interaction) une seule fois pour un GraphModel donne — independant de tout <canvas> particulier. */
function createGraphEngine(model: GraphModel, initialFocusId: string | null): GraphEngine {
  const sim: GraphSimulation = createSimulation(model.nodes, model.edges, model.adjacency);

  let focusId: string | null = null;
  let colorMode: ColorMode = "type";
  let hoveredId: string | null = null;
  let selectedIds = new Set<string>();
  const lockedIds = new Set<string>();
  const hiddenIds = new Set<string>();
  let activeFilters: Set<EntityKind> | null = null;
  let isolateFocusId: string | null = null;
  let searchMatchIds: Set<string> | null = null;

  const revealSchedule = scheduleReveal(model.nodes, model.adjacency, initialFocusId);
  let revealState: RevealState | null = { ...revealSchedule, startedAt: performance.now() };

  const selectionListeners = new Set<(ids: Set<string>) => void>();

  let renderer: CanvasRendererHandle | null = null;
  let viewport: ViewportHandle | null = null;
  let lastCanvas: HTMLCanvasElement | null = null;
  let unsubscribeTick: (() => void) | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  function notifySelection() {
    selectionListeners.forEach(cb => cb(new Set(selectedIds)));
  }

  function isVisible(node: EntityNode): boolean {
    return isNodeVisible(node, { hiddenIds, activeFilters, isolateFocusId }, model.adjacency, model.byId);
  }

  function applyFocus(id: string | null) {
    focusId = id;
    sim.setFocus(id);
    renderer?.markDirty();
  }
  applyFocus(initialFocusId);

  return {
    attachCanvas(el) {
      unsubscribeTick?.();
      unsubscribeTick = null;
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      if (renderer) {
        viewport?.destroy();
        renderer.destroy();
        renderer = null;
        viewport = null;
      }
      lastCanvas = el;
      if (!el) return;

      renderer = createCanvasRenderer({
        canvas: el,
        themeScopeEl: el,
        getNodes: () => model.nodes,
        getEdges: () => sim.edges,
        getAdjacency: () => model.adjacency,
        getById: () => model.byId,
        getFocusId: () => focusId,
        getRevealState: () => revealState,
        getInteractionState: () => ({
          colorMode, hoveredId, selectedIds, lockedIds, hiddenIds, activeFilters, isolateFocusId, searchMatchIds,
        }),
      });

      unsubscribeTick = sim.subscribeTick(() => renderer?.markDirty());
      const rendererRef = renderer;

      viewport = attachViewport(el, renderer, sim, () => model.nodes, {
        onHover(id) {
          if (id === hoveredId) return;
          if (hoveredId) rendererRef.invalidateSprite(hoveredId);
          hoveredId = id;
          if (id) rendererRef.invalidateSprite(id);
          rendererRef.markDirty();
        },
        onClickNode(node, additive) {
          if (additive) {
            const next = new Set(selectedIds);
            next.has(node.id) ? next.delete(node.id) : next.add(node.id);
            selectedIds = next;
          } else {
            selectedIds = new Set([node.id]);
          }
          rendererRef.markDirty();
          notifySelection();
        },
        onClickEmpty() {
          if (!selectedIds.size) return;
          selectedIds = new Set();
          rendererRef.markDirty();
          notifySelection();
        },
        onDoubleClickNode(node) {
          applyFocus(node.id);
          viewport?.centerOn(node);
        },
        onDoubleClickEmpty() {
          viewport?.resetView();
        },
      });

      // Sans ceci, la vue reste a la transform identite (origine du monde
      // = coin superieur gauche de l'ecran) : le noeud focus (epingle en
      // 0,0) se retrouve hors champ et seuls quelques noeuds peripheriques
      // tombent par hasard dans le cadre. On cadre immediatement, puis une
      // deuxieme fois une fois la disposition en anneaux stabilisee (la
      // premiere frame ne voit que le placement initial en spirale de
      // d3-force, pas encore les positions finales).
      viewport.resetView();
      settleTimer = setTimeout(() => viewport?.resetView(), 900);
    },
    setFocus(id, opts) {
      applyFocus(id);
      if (opts?.recenter && id) {
        const node = model.byId.get(id);
        if (node) viewport?.centerOn(node);
      }
    },
    getFocus: () => focusId,
    setFilters(kinds) {
      activeFilters = kinds;
      renderer?.markDirty();
    },
    setColorMode(mode) {
      colorMode = mode;
      renderer?.clearSprites();
    },
    setSearchQuery(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        searchMatchIds = null;
      } else {
        searchMatchIds = new Set(
          model.nodes.filter(n => n.label.toLowerCase().includes(q) || n.value?.toLowerCase().includes(q)).map(n => n.id),
        );
      }
      renderer?.markDirty();
    },
    setLocked(id, locked) {
      sim.setLocked(id, locked);
      if (locked) lockedIds.add(id); else lockedIds.delete(id);
      renderer?.invalidateSprite(id);
      sim.reheat(0.15);
    },
    isLocked: id => sim.isLocked(id),
    setHidden(id, hidden) {
      if (hidden) hiddenIds.add(id); else hiddenIds.delete(id);
      renderer?.markDirty();
    },
    setIsolate(id) {
      isolateFocusId = id;
      renderer?.markDirty();
    },
    setSelection(ids) {
      selectedIds = new Set(ids);
      renderer?.markDirty();
      notifySelection();
    },
    clearSelection() {
      selectedIds = new Set();
      renderer?.markDirty();
      notifySelection();
    },
    resetView() {
      viewport?.resetView();
    },
    onSelectionChange(cb) {
      selectionListeners.add(cb);
      return () => selectionListeners.delete(cb);
    },
    exportPNG() {
      if (!lastCanvas) return;
      exportGraphPNG({ nodes: model.nodes, edges: sim.edges, themeScopeEl: lastCanvas, colorMode, focusId, isVisible });
    },
    exportSVG() {
      if (!lastCanvas) return;
      exportGraphSVG({ nodes: model.nodes, edges: sim.edges, themeScopeEl: lastCanvas, colorMode, focusId, isVisible });
    },
    exportJSON() {
      exportGraphJSON(model, isVisible);
    },
    destroy() {
      unsubscribeTick?.();
      if (settleTimer) clearTimeout(settleTimer);
      viewport?.destroy();
      renderer?.destroy();
      sim.destroy();
      selectionListeners.clear();
    },
  };
}

/** Le moteur vit pour toute la duree de vie du composant, independamment du <canvas> monte a un instant donne (bascule inline <-> plein ecran, cf. GraphCanvasHost). */
export function useGraphEngine(model: GraphModel, initialFocusId: string | null): GraphEngine {
  const ref = useRef<{ model: GraphModel; engine: GraphEngine } | null>(null);

  if (!ref.current || ref.current.model !== model) {
    ref.current?.engine.destroy();
    ref.current = { model, engine: createGraphEngine(model, initialFocusId) };
  }

  useEffect(() => {
    return () => {
      ref.current?.engine.destroy();
      ref.current = null;
    };
  }, []);

  return ref.current.engine;
}
