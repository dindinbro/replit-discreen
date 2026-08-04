/**
 * Cache global d'icones-emoji rasterisees. Mutualise entre tous les noeuds
 * d'un meme type (contrairement au cache de cartes qui est par-noeud) — un
 * seul bitmap "email" est reutilise par toutes les cartes email.
 */
const cache = new Map<string, HTMLCanvasElement>();

export function getEmojiSprite(emoji: string, sizeCssPx: number, resolution: number): HTMLCanvasElement {
  const key = `${emoji}:${sizeCssPx}:${resolution}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  const pixelSize = Math.ceil(sizeCssPx * resolution);
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(resolution, resolution);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${sizeCssPx * 0.72}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.fillText(emoji, sizeCssPx / 2, sizeCssPx / 2 + sizeCssPx * 0.05);

  cache.set(key, canvas);
  return canvas;
}
