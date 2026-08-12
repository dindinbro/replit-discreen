import type { ColorMode, EntityNode } from "../types";
import type { RuntimeEdge } from "../simulation";
import { ENTITY_REGISTRY } from "../registry";
import { confidenceColor } from "../color";
import { getRelationLabelSprite } from "./labelCache";
import { spawnProgress, type RevealState } from "../reveal";

export interface EdgeDrawState {
  colorMode: ColorMode;
  resolveColor: (cssVar: string) => string;
  hoveredId: string | null;
  selectedIds: Set<string>;
  focusId: string | null;
  isVisible: (node: EntityNode) => boolean;
  revealState: RevealState | null;
  now: number;
  zoomK: number;
  resolution: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Decalage perpendiculaire du point de controle — separe visuellement les aretes, meme sans doublon reel. */
function controlPoint(edgeId: string, x0: number, y0: number, x1: number, y1: number) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const sign = hashStr(edgeId) % 2 === 0 ? 1 : -1;
  const magnitude = Math.min(len * 0.16, 36) * sign;
  return { x: mx + nx * magnitude, y: my + ny * magnitude };
}

function quadPoint(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number) {
  const u = 1 - t;
  return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
}

function isEmphasized(edge: RuntimeEdge, state: EdgeDrawState): boolean {
  const { hoveredId, selectedIds, focusId } = state;
  return edge.source.id === hoveredId || edge.target.id === hoveredId
    || selectedIds.has(edge.source.id) || selectedIds.has(edge.target.id)
    || edge.source.id === focusId || edge.target.id === focusId;
}

/** L'arete apparait progressivement en accompagnant l'extremite la plus tardive de sa sequence de reveal. */
function edgeRevealProgress(edge: RuntimeEdge, state: EdgeDrawState): number {
  if (!state.revealState) return 1;
  const sourceAt = state.revealState.spawnAt.get(edge.source.id) ?? 0;
  const targetAt = state.revealState.spawnAt.get(edge.target.id) ?? 0;
  const laterId = sourceAt >= targetAt ? edge.source.id : edge.target.id;
  return spawnProgress(laterId, state.revealState, state.now);
}

/**
 * Dessine toutes les aretes visibles : courbes bezier quadratiques avec
 * glow, epaisseur selon la corroboration de l'attribut porte, dash anime
 * restreint aux aretes en survol/selection/focus (l'animer sur toutes les
 * aretes a chaque frame est le principal risque de performance identifie
 * dans le plan — volontairement evite ici).
 */
export function drawEdges(ctx: CanvasRenderingContext2D, edges: RuntimeEdge[], state: EdgeDrawState) {
  const hasActive = !!state.hoveredId || state.selectedIds.size > 0;
  const dashPhase = (state.now / 30) % 24;

  for (const edge of edges) {
    if (!state.isVisible(edge.source) || !state.isVisible(edge.target)) continue;
    const x0 = edge.source.x, y0 = edge.source.y, x1 = edge.target.x, y1 = edge.target.y;
    if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) continue;

    const revealProgress = edgeRevealProgress(edge, state);
    if (revealProgress <= 0) continue;

    const emphasized = isEmphasized(edge, state);
    const dim = hasActive && !emphasized;

    const attrNode = edge.source.kind === "person" || edge.source.isCategory ? edge.target : edge.source;
    const kindColor = state.colorMode === "confidence" ? confidenceColor(attrNode.confidence) : state.resolveColor(ENTITY_REGISTRY[edge.kind].colorVar);
    const width = 1 + Math.min(Math.max(attrNode.degree - 1, 0), 4) * 0.55;
    const { x: cx, y: cy } = controlPoint(edge.id, x0, y0, x1, y1);

    ctx.save();
    ctx.globalAlpha = dim ? 0.1 : 0.75;
    ctx.strokeStyle = kindColor;
    ctx.lineWidth = emphasized ? width + 1 : width;
    ctx.lineCap = "round";
    if (emphasized) {
      ctx.shadowColor = kindColor;
      ctx.shadowBlur = 10;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -dashPhase;
    }

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    if (revealProgress >= 1) {
      ctx.quadraticCurveTo(cx, cy, x1, y1);
    } else {
      const steps = 16;
      for (let i = 1; i <= steps; i++) {
        const p = quadPoint(x0, y0, cx, cy, x1, y1, (i / steps) * revealProgress);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
    ctx.restore();

    if (revealProgress >= 1 && !dim && (emphasized || state.zoomK > 0.55)) {
      const mid = quadPoint(x0, y0, cx, cy, x1, y1, 0.5);
      const sprite = getRelationLabelSprite(edge.relationLabel, kindColor, state.resolution);
      ctx.drawImage(sprite.canvas, mid.x - sprite.width / 2, mid.y - sprite.height / 2, sprite.width, sprite.height);
    }
  }
}
