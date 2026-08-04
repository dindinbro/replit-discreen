import { useEffect, useRef } from "react";
import type { GraphEngine } from "./useGraphEngine";

/**
 * <canvas> qui s'attache au moteur au montage et s'en detache au demontage.
 * Reutilise a la fois pour l'apercu inline et pour l'overlay plein ecran —
 * un seul host est monte a la fois (voir WantedGraphView.tsx), ce qui fait
 * que basculer entre les deux ne fait que changer *quel* canvas le moteur
 * dessine : toute la physique (positions, verrous, reveal) survit intacte.
 *
 * Le wrapper porte la classe `dark` : le graphe reste toujours sombre par
 * design (fond #09090B), independamment du theme clair/sombre global de
 * l'app — les variables CSS --field-* et --graph-* resolues par le renderer
 * (color.ts) heritent ainsi toujours de la palette sombre.
 */
export function GraphCanvasHost({ engine, className }: { engine: GraphEngine; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    engine.attachCanvas(canvasRef.current);
    return () => engine.attachCanvas(null);
  }, [engine]);

  return (
    <div className={`dark relative w-full h-full overflow-hidden ${className ?? ""}`} style={{ background: "#09090B" }}>
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing touch-none" />
    </div>
  );
}
