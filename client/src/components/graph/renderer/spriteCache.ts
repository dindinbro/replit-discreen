import type { ColorMode, EntityNode } from "../types";
import { ENTITY_REGISTRY } from "../registry";
import { nodeDimensions } from "../metrics";
import { confidenceColor, withAlpha } from "../color";
import { getEmojiSprite } from "./iconCache";

export type SpriteVariant = "normal" | "hover" | "selected";

export interface SpriteDrawOptions {
  variant: SpriteVariant;
  locked: boolean;
  colorMode: ColorMode;
  resolveColor: (cssVar: string) => string;
  /** Densite de rasterisation (dpr * facteur de nettete) — cf. CanvasRenderer. */
  resolution: number;
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Geometrie du badge icone en haut a gauche de la carte, en coordonnees
 * sprite-locales (voir paintCard) — exportee pour que le renderer puisse
 * superposer une photo de profil au meme endroit sans dupliquer les valeurs. */
export const BADGE_GEOMETRY = { cx: 14 + 15, cy: 14 + 15, r: 15 };

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + "…";
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

/** Construit le bitmap "carte glassmorphique" complet d'un noeud, a la resolution demandee. */
function paintCard(node: EntityNode, opts: SpriteDrawOptions): Sprite {
  const { width, height } = nodeDimensions(node);
  const meta = ENTITY_REGISTRY[node.kind];
  const kindColor = opts.colorMode === "confidence" ? confidenceColor(node.confidence) : opts.resolveColor(meta.colorVar);

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * opts.resolution);
  canvas.height = Math.ceil(height * opts.resolution);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(opts.resolution, opts.resolution);

  const isHover = opts.variant === "hover";
  const isSelected = opts.variant === "selected";
  const emphasis = isSelected ? 1 : isHover ? 0.7 : 0;
  const radius = 18;
  const pad = { x: 14, top: 14 };

  // Halo exterieur (glow) — dessine sous la carte, plus fort en survol/selection.
  if (emphasis > 0) {
    ctx.save();
    ctx.shadowColor = kindColor;
    ctx.shadowBlur = 22 * emphasis;
    roundRectPath(ctx, 2, 2, width - 4, height - 4, radius);
    ctx.fillStyle = "rgba(0,0,0,0.001)";
    ctx.fill();
    ctx.restore();
  }

  // Corps glassmorphique.
  roundRectPath(ctx, 1, 1, width - 2, height - 2, radius);
  const bodyGradient = ctx.createLinearGradient(0, 0, 0, height);
  bodyGradient.addColorStop(0, "rgba(255,255,255,0.07)");
  bodyGradient.addColorStop(0.18, "rgba(22,23,29,0.86)");
  bodyGradient.addColorStop(1, "rgba(14,15,19,0.9)");
  ctx.fillStyle = bodyGradient;
  ctx.fill();

  // Bordure fine coloree, plus lumineuse en survol/selection.
  ctx.lineWidth = isSelected ? 1.8 : 1.2;
  ctx.strokeStyle = withAlpha(kindColor, 0.35 + emphasis * 0.45);
  ctx.stroke();

  // Reflet superieur subtil (glassmorphism).
  roundRectPath(ctx, 1, 1, width - 2, height * 0.4, radius);
  const sheen = ctx.createLinearGradient(0, 0, 0, height * 0.4);
  sheen.addColorStop(0, "rgba(255,255,255,0.05)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fill();

  // Badge icone (photo de profil superposee au meme endroit par le renderer
  // pour les personnes disposant d'images — cf. BADGE_GEOMETRY).
  const { cx: badgeCx, cy: badgeCy, r: badgeR } = BADGE_GEOMETRY;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(kindColor, 0.16);
  ctx.fill();
  const iconSprite = getEmojiSprite(meta.emoji, badgeR * 1.5, opts.resolution);
  ctx.drawImage(iconSprite, badgeCx - (badgeR * 1.5) / 2, badgeCy - (badgeR * 1.5) / 2, badgeR * 1.5, badgeR * 1.5);

  // Verrou.
  if (opts.locked) {
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(226,228,235,0.65)";
    ctx.fillText("\u{1F512}", width - 12, 10);
  }

  // Titre.
  const titleX = pad.x + badgeR * 2 + 10;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(241,242,247,0.96)";
  ctx.fillText(truncate(ctx, node.label, width - titleX - 12), titleX, pad.top + 19);

  // Type.
  ctx.font = "700 9.5px system-ui, sans-serif";
  ctx.fillStyle = kindColor;
  drawSpaced(ctx, meta.label.toUpperCase(), pad.x, 56, 1.1);

  // Connexions + statut.
  const statusColor = node.status === "verifie" ? "#4ade80" : "#94a3b8";
  const statusLabel = node.status === "verifie" ? "Verifie" : "Non verifie";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "rgba(203,206,216,0.78)";
  ctx.fillText(`${node.degree} connexion${node.degree > 1 ? "s" : ""}`, pad.x, 76);
  ctx.beginPath();
  ctx.arc(pad.x + ctx.measureText(`${node.degree} connexion${node.degree > 1 ? "s" : ""}`).width + 10, 72.5, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.fill();
  ctx.fillStyle = "rgba(203,206,216,0.6)";
  ctx.fillText(statusLabel, pad.x + ctx.measureText(`${node.degree} connexion${node.degree > 1 ? "s" : ""}`).width + 18, 76);

  // Fiabilite.
  ctx.fillStyle = "rgba(203,206,216,0.78)";
  ctx.fillText(`Fiabilite : ${node.confidence}%`, pad.x, 96);

  // Source.
  ctx.fillStyle = "rgba(203,206,216,0.6)";
  ctx.fillText(`Source : ${truncate(ctx, node.source, width - pad.x - 12)}`, pad.x, 116);

  return { canvas, width, height };
}

export function createSpriteCache() {
  const cache = new Map<string, { sprite: Sprite; signature: string }>();

  function signatureOf(node: EntityNode, opts: SpriteDrawOptions): string {
    return [node.label, node.degree, node.confidence, node.status, node.source, opts.variant, opts.locked, opts.colorMode].join("|");
  }

  return {
    getSprite(node: EntityNode, opts: SpriteDrawOptions): Sprite {
      const key = `${node.id}:${opts.resolution}`;
      const signature = signatureOf(node, opts);
      const cached = cache.get(key);
      if (cached && cached.signature === signature) return cached.sprite;
      const sprite = paintCard(node, opts);
      cache.set(key, { sprite, signature });
      return sprite;
    },
    invalidate(nodeId: string) {
      for (const key of cache.keys()) {
        if (key.startsWith(`${nodeId}:`)) cache.delete(key);
      }
    },
    clear() {
      cache.clear();
    },
  };
}

export type SpriteCache = ReturnType<typeof createSpriteCache>;
