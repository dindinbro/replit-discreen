import type { ColorMode, EntityNode, GraphModel } from "./types";
import type { RuntimeEdge } from "./simulation";
import { ENTITY_REGISTRY } from "./registry";
import { createColorResolver, confidenceColor } from "./color";
import { createSpriteCache } from "./renderer/spriteCache";
import { drawEdges } from "./renderer/edges";
import { nodeDimensions } from "./metrics";

export interface ExportContext {
  nodes: EntityNode[];
  edges: RuntimeEdge[];
  themeScopeEl: HTMLElement;
  colorMode: ColorMode;
  focusId: string | null;
  isVisible: (n: EntityNode) => boolean;
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function contentBounds(nodes: EntityNode[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const { width, height } = nodeDimensions(n);
    const x = n.x ?? 0, y = n.y ?? 0;
    minX = Math.min(minX, x - width / 2);
    maxX = Math.max(maxX, x + width / 2);
    minY = Math.min(minY, y - height / 2);
    maxY = Math.max(maxY, y + height / 2);
  });
  return { minX, minY, maxX, maxY };
}

/** Export le GraphModel "propre" (ids stables) — le plus simple des trois, valide en premier que le modele a la forme attendue. */
export function exportGraphJSON(model: GraphModel, isVisible: (n: EntityNode) => boolean) {
  const nodes = model.nodes.filter(isVisible).map(n => ({
    id: n.id, kind: n.kind, label: n.label, value: n.value,
    degree: n.degree, confidence: n.confidence, status: n.status, source: n.source,
  }));
  const visibleIds = new Set(nodes.map(n => n.id));
  const edges = model.edges
    .filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map(e => ({ source: e.source, target: e.target, kind: e.kind, relationLabel: e.relationLabel }));

  const blob = new Blob([JSON.stringify({ nodes, edges, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  download(url, `discreen-graphe-${Date.now()}.json`);
  URL.revokeObjectURL(url);
}

/**
 * Rendu offscreen dimensionne a la boite englobante du contenu (pas au
 * viewport courant), a densite 2x. Reutilise directement les fonctions de
 * dessin du renderer (drawEdges, cache de sprites) plutot que de dupliquer
 * la logique visuelle.
 */
export function exportGraphPNG(ctxData: ExportContext) {
  const visibleNodes = ctxData.nodes.filter(ctxData.isVisible);
  if (!visibleNodes.length) return;
  const { minX, minY, maxX, maxY } = contentBounds(visibleNodes);
  const padding = 60;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const density = 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * density);
  canvas.height = Math.ceil(height * density);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(density, density);
  ctx.fillStyle = "#09090B";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(-minX + padding, -minY + padding);

  const resolveColor = createColorResolver(ctxData.themeScopeEl);
  const spriteCache = createSpriteCache();

  drawEdges(ctx, ctxData.edges, {
    colorMode: ctxData.colorMode,
    resolveColor,
    hoveredId: null,
    selectedIds: new Set(),
    focusId: ctxData.focusId,
    isVisible: ctxData.isVisible,
    revealState: null,
    now: performance.now(),
    zoomK: 1,
    resolution: density * 2,
  });

  visibleNodes.forEach(n => {
    const { width: w, height: h } = nodeDimensions(n);
    const sprite = spriteCache.getSprite(n, {
      variant: n.id === ctxData.focusId ? "selected" : "normal",
      locked: false,
      colorMode: ctxData.colorMode,
      resolveColor,
      resolution: density * 2,
    });
    ctx.drawImage(sprite.canvas, (n.x ?? 0) - w / 2, (n.y ?? 0) - h / 2, w, h);
  });

  download(canvas.toDataURL("image/png"), `discreen-graphe-${Date.now()}.png`);
}

/**
 * Les cartes canvas sont des bitmaps raster (glow via shadowBlur) : pas de
 * conversion automatique vers du vectoriel fidele. Cette passe redessine
 * un diagramme vectoriel simplifie (rect/path/text plats, sans glow) en
 * reutilisant exactement les memes coordonnees de courbe — un diagramme
 * fidele, pas une copie pixel du rendu glassmorphique.
 */
export function exportGraphSVG(ctxData: ExportContext) {
  const visibleNodes = ctxData.nodes.filter(ctxData.isVisible);
  if (!visibleNodes.length) return;
  const { minX, minY, maxX, maxY } = contentBounds(visibleNodes);
  const padding = 60;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const resolveColor = createColorResolver(ctxData.themeScopeEl);
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const edgeEls = ctxData.edges
    .filter(e => visibleIds.has(e.source.id) && visibleIds.has(e.target.id))
    .map(e => {
      const x0 = (e.source.x ?? 0) - minX + padding, y0 = (e.source.y ?? 0) - minY + padding;
      const x1 = (e.target.x ?? 0) - minX + padding, y1 = (e.target.y ?? 0) - minY + padding;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const color = resolveColor(ENTITY_REGISTRY[e.kind].colorVar);
      return `<path d="M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}" stroke="${color}" stroke-width="1.4" fill="none" opacity="0.55" />`;
    })
    .join("\n");

  const nodeEls = visibleNodes
    .map(n => {
      const { width: w, height: h } = nodeDimensions(n);
      const x = (n.x ?? 0) - minX + padding - w / 2, y = (n.y ?? 0) - minY + padding - h / 2;
      const color = ctxData.colorMode === "confidence" ? confidenceColor(n.confidence) : resolveColor(ENTITY_REGISTRY[n.kind].colorVar);
      const statusLabel = n.status === "verifie" ? "Verifie" : "Non verifie";
      return [
        `<g>`,
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#111318" stroke="${color}" stroke-width="1.4" />`,
        `<text x="${x + 14}" y="${y + 26}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#f1f2f7">${esc(n.label)}</text>`,
        `<text x="${x + 14}" y="${y + 46}" font-family="system-ui,sans-serif" font-size="9.5" font-weight="700" letter-spacing="1" fill="${color}">${esc(ENTITY_REGISTRY[n.kind].label.toUpperCase())}</text>`,
        `<text x="${x + 14}" y="${y + 66}" font-family="system-ui,sans-serif" font-size="11" fill="#cbced8">${n.degree} connexion${n.degree > 1 ? "s" : ""} - ${statusLabel}</text>`,
        `<text x="${x + 14}" y="${y + 84}" font-family="system-ui,sans-serif" font-size="11" fill="#cbced8">Fiabilite : ${n.confidence}%</text>`,
        `<text x="${x + 14}" y="${y + 102}" font-family="system-ui,sans-serif" font-size="11" fill="#9195a3">Source : ${esc(n.source)}</text>`,
        `</g>`,
      ].join("");
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#09090B" />${edgeEls}${nodeEls}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  download(url, `discreen-graphe-${Date.now()}.svg`);
  URL.revokeObjectURL(url);
}
