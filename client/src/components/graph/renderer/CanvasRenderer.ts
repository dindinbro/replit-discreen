import type { AdjacencyEntry, ColorMode, EntityKind, EntityNode } from "../types";
import type { RuntimeEdge } from "../simulation";
import { spawnProgress, type RevealState } from "../reveal";
import { createColorResolver } from "../color";
import { createSpriteCache, BADGE_GEOMETRY, type SpriteVariant } from "./spriteCache";
import { drawEdges } from "./edges";
import { buildQuadtree, findNodeAt } from "./hitTest";
import { isNodeVisible, type VisibilityState } from "../visibility";
import { nodeDimensions } from "../metrics";
import { getCachedImage, subscribeImageLoad } from "./imageCache";

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export interface RendererInteractionState {
  colorMode: ColorMode;
  hoveredId: string | null;
  selectedIds: Set<string>;
  lockedIds: Set<string>;
  hiddenIds: Set<string>;
  activeFilters: Set<EntityKind> | null;
  isolateFocusId: string | null;
  searchMatchIds: Set<string> | null;
}

export interface CanvasRendererDeps {
  canvas: HTMLCanvasElement;
  /** Element portant (ou heritant de) la classe `dark` — cf. color.ts. */
  themeScopeEl: HTMLElement;
  getNodes: () => EntityNode[];
  getEdges: () => RuntimeEdge[];
  getAdjacency: () => Map<string, AdjacencyEntry[]>;
  getById: () => Map<string, EntityNode>;
  getFocusId: () => string | null;
  getRevealState: () => RevealState | null;
  getInteractionState: () => RendererInteractionState;
}

export interface CanvasRendererHandle {
  markDirty(): void;
  setTransform(t: Transform): void;
  getTransform(): Transform;
  screenToWorld(sx: number, sy: number): { x: number; y: number };
  hitTestScreen(sx: number, sy: number): EntityNode | null;
  invalidateSprite(nodeId: string): void;
  clearSprites(): void;
  resize(): void;
  destroy(): void;
}

// Resolution fixe (pas de paliers par niveau de zoom) : reste nette jusqu'a
// un zoom raisonnable sans avoir a re-generer/tracker un sprite par palier —
// simplification assumee vs. l'idee de LOD multi-resolution du plan initial.
const BASE_RESOLUTION_MULTIPLIER = 2;

/** Dessine `img` recadree en "cover" dans le cercle (cx,cy,r) courant du contexte. */
function drawAvatarCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number) {
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - size) / 2;
  const sy = (img.naturalHeight - size) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, sx, sy, size, size, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

export function createCanvasRenderer(deps: CanvasRendererDeps): CanvasRendererHandle {
  const { canvas, themeScopeEl } = deps;
  const ctx = canvas.getContext("2d")!;
  const resolveColor = createColorResolver(themeScopeEl);
  const spriteCache = createSpriteCache();

  let transform: Transform = { x: 0, y: 0, k: 1 };
  let dirty = true;
  let destroyed = false;
  let dpr = window.devicePixelRatio || 1;
  let quadtreeCache = buildQuadtree(deps.getNodes());

  // Les photos de profil se chargent de facon asynchrone (cache module-level
  // partage) : des qu'une image arrive, on redemande une frame pour l'afficher.
  const unsubscribeImageLoad = subscribeImageLoad(() => {
    dirty = true;
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    dirty = true;
  }
  resize();
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  function screenToWorld(sx: number, sy: number) {
    return { x: (sx - transform.x) / transform.k, y: (sy - transform.y) / transform.k };
  }

  function visibilityStateOf(interaction: RendererInteractionState): VisibilityState {
    return { hiddenIds: interaction.hiddenIds, activeFilters: interaction.activeFilters, isolateFocusId: interaction.isolateFocusId };
  }

  function drawGrid(cssWidth: number, cssHeight: number) {
    const spacing = 42;
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(cssWidth, cssHeight);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1 / transform.k;
    ctx.beginPath();
    for (let gx = Math.floor(topLeft.x / spacing) * spacing; gx <= bottomRight.x; gx += spacing) {
      ctx.moveTo(gx, topLeft.y);
      ctx.lineTo(gx, bottomRight.y);
    }
    for (let gy = Math.floor(topLeft.y / spacing) * spacing; gy <= bottomRight.y; gy += spacing) {
      ctx.moveTo(topLeft.x, gy);
      ctx.lineTo(bottomRight.x, gy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (destroyed) return;
    if (!dirty) {
      requestAnimationFrame(draw);
      return;
    }
    dirty = false;

    const nodes = deps.getNodes();
    const edges = deps.getEdges();
    const adjacency = deps.getAdjacency();
    const focusId = deps.getFocusId();
    const revealState = deps.getRevealState();
    const interaction = deps.getInteractionState();
    const now = performance.now();
    const vis = visibilityStateOf(interaction);
    const isVisible = (n: EntityNode) => isNodeVisible(n, vis, adjacency, deps.getById());

    quadtreeCache = buildQuadtree(nodes);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * transform.k, 0, 0, dpr * transform.k, dpr * transform.x, dpr * transform.y);

    drawGrid(canvas.width / dpr, canvas.height / dpr);

    drawEdges(ctx, edges, {
      colorMode: interaction.colorMode,
      resolveColor,
      hoveredId: interaction.hoveredId,
      selectedIds: interaction.selectedIds,
      focusId,
      isVisible,
      revealState,
      now,
      zoomK: transform.k,
      resolution: dpr * BASE_RESOLUTION_MULTIPLIER,
    });

    const hasActive = !!interaction.hoveredId || interaction.selectedIds.size > 0;
    for (const node of nodes) {
      if (!isVisible(node)) continue;
      const progress = spawnProgress(node.id, revealState, now);
      if (progress <= 0) continue;

      const x = node.x ?? 0, y = node.y ?? 0;
      const { width, height } = nodeDimensions(node);
      const isHover = node.id === interaction.hoveredId;
      const isSelected = interaction.selectedIds.has(node.id);
      const variant: SpriteVariant = isSelected ? "selected" : isHover ? "hover" : "normal";
      const emphasized = isHover || isSelected || node.id === focusId;
      const matchesSearch = !interaction.searchMatchIds || interaction.searchMatchIds.has(node.id);
      const dim = (hasActive && !emphasized) || !matchesSearch;

      const sprite = spriteCache.getSprite(node, {
        variant,
        locked: interaction.lockedIds.has(node.id),
        colorMode: interaction.colorMode,
        resolveColor,
        resolution: dpr * BASE_RESOLUTION_MULTIPLIER,
      });

      ctx.save();
      ctx.globalAlpha = (dim ? 0.15 : 1) * progress;
      const scale = 0.85 + 0.15 * progress + (emphasized ? 0.04 : 0);
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.drawImage(sprite.canvas, -width / 2, -height / 2, width, height);

      // Photo de profil superposee sur le badge, a la place de l'emoji — pas
      // bakee dans le sprite pour ne pas avoir a invalider le cache des que
      // l'image (chargee async) devient disponible.
      if (node.kind === "person") {
        const avatarSrc = node.profile?.images?.find(Boolean);
        const avatarImg = avatarSrc ? getCachedImage(avatarSrc) : null;
        if (avatarImg) {
          drawAvatarCover(ctx, avatarImg, BADGE_GEOMETRY.cx - width / 2, BADGE_GEOMETRY.cy - height / 2, BADGE_GEOMETRY.r);
        }
      }

      ctx.restore();
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  return {
    markDirty() {
      dirty = true;
    },
    setTransform(t) {
      transform = t;
      dirty = true;
    },
    getTransform: () => transform,
    screenToWorld,
    hitTestScreen(sx, sy) {
      const world = screenToWorld(sx, sy);
      const interaction = deps.getInteractionState();
      const adjacency = deps.getAdjacency();
      const vis = visibilityStateOf(interaction);
      const revealState = deps.getRevealState();
      const now = performance.now();
      return findNodeAt(
        quadtreeCache,
        world.x,
        world.y,
        n => isNodeVisible(n, vis, adjacency, deps.getById()) && spawnProgress(n.id, revealState, now) >= 1,
      );
    },
    invalidateSprite(nodeId) {
      spriteCache.invalidate(nodeId);
      dirty = true;
    },
    clearSprites() {
      spriteCache.clear();
      dirty = true;
    },
    resize,
    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      unsubscribeImageLoad();
    },
  };
}
