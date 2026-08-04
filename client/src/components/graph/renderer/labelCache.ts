export interface LabelSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

const cache = new Map<string, LabelSprite>();
const scratch = document.createElement("canvas").getContext("2d")!;

const FONT = "600 10.5px system-ui, -apple-system, sans-serif";

/** Pastille de label d'arete, mutualisee par (texte, couleur) — reutilisee par toutes les aretes du meme type de relation. */
export function getRelationLabelSprite(text: string, colorHex: string, resolution: number): LabelSprite {
  const key = `${text}:${colorHex}:${resolution}`;
  const cached = cache.get(key);
  if (cached) return cached;

  scratch.font = FONT;
  const textWidth = scratch.measureText(text).width;
  const paddingX = 8;
  const width = Math.ceil(textWidth + paddingX * 2);
  const height = 18;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(height * resolution);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(resolution, resolution);

  const r = height / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(width, 0, width, height, r);
  ctx.arcTo(width, height, 0, height, r);
  ctx.arcTo(0, height, 0, 0, r);
  ctx.arcTo(0, 0, width, 0, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(12,13,17,0.88)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = colorHex;
  ctx.stroke();

  ctx.font = FONT;
  ctx.fillStyle = colorHex;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + 1);

  const sprite = { canvas, width, height };
  cache.set(key, sprite);
  return sprite;
}
