import { interpolateRgbBasis } from "d3-interpolate";

/**
 * Le Canvas 2D ne resout pas var(--x) comme le ferait un element DOM stylise :
 * il faut lire la valeur calculee sur un noeud DOM reel. `scopeEl` doit etre
 * un element qui porte (ou herite de) la classe `dark` du graphe, pour
 * garantir des couleurs coherentes meme si le theme global de l'app est
 * clair (le graphe reste sombre par design, voir GraphFullscreenOverlay).
 */
export function createColorResolver(scopeEl: HTMLElement) {
  const cache = new Map<string, string>();
  return function resolve(cssVarName: string): string {
    let value = cache.get(cssVarName);
    if (value === undefined) {
      const raw = getComputedStyle(scopeEl).getPropertyValue(cssVarName).trim();
      value = raw || "220 10% 60%";
      cache.set(cssVarName, value);
    }
    return `hsl(${value})`;
  };
}

const CONFIDENCE_SCALE = interpolateRgbBasis(["#f87171", "#fbbf24", "#4ade80"]);

/** Degrade rouge -> ambre -> vert pour le mode "colorer selon la confiance". */
export function confidenceColor(confidence: number): string {
  return CONFIDENCE_SCALE(Math.min(Math.max(confidence, 0), 99) / 99);
}

/**
 * Ajoute une opacite a une couleur hsl(...)/rgb(...) quel que soit son
 * format d'origine, en repartant des composantes numeriques brutes plutot
 * que de manipuler la chaine par substitution (fragile et source de bugs
 * silencieux sur des formats legerement differents).
 */
export function withAlpha(color: string, alpha: number): string {
  const isHsl = color.startsWith("hsl");
  const nums = color.match(/[\d.]+%?/g);
  if (!nums || nums.length < 3) return color;
  const [a, b, c] = nums;
  return isHsl ? `hsla(${a}, ${b}, ${c}, ${alpha})` : `rgba(${a}, ${b}, ${c}, ${alpha})`;
}
