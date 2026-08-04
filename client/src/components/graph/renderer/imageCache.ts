/**
 * Cache global des photos de profil affichees comme avatar sur les cartes
 * "person" du graphe. Le chargement est asynchrone (Image.src) ; le
 * CanvasRenderer s'abonne via setImageLoadCallback pour redemander une frame
 * des qu'une photo devient disponible, plutot que de re-render en boucle.
 */
interface ImageEntry {
  img: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
}

const cache = new Map<string, ImageEntry>();
const listeners = new Set<() => void>();

/** Un renderer s'abonne au montage et se desabonne a la destruction — plusieurs
 * instances (ex. graphe admin + graphe public montes simultanement) peuvent
 * coexister sans se marcher dessus. */
export function subscribeImageLoad(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Retourne l'image si deja chargee ; sinon lance le chargement et renvoie null. */
export function getCachedImage(src: string): HTMLImageElement | null {
  let entry = cache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, failed: false };
    cache.set(src, entry);
    img.onload = () => {
      entry!.loaded = true;
      listeners.forEach(cb => cb());
    };
    img.onerror = () => {
      entry!.failed = true;
    };
    img.src = src;
  }
  return entry.loaded ? entry.img : null;
}
