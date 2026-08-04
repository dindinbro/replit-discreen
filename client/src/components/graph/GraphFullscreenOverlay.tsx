import { useEffect } from "react";
import { createPortal } from "react-dom";
import { GraphCanvasHost } from "./GraphCanvasHost";
import { GraphToolbar } from "./GraphToolbar";
import { GraphSidePanel } from "./GraphSidePanel";
import type { GraphModel, EntityKind } from "./types";
import type { GraphEngine } from "./useGraphEngine";

export function GraphFullscreenOverlay({
  engine, model, usedKinds, selectedId, notes, onNotesChange, onFocusNode, onClose,
}: {
  engine: GraphEngine;
  model: GraphModel;
  usedKinds: EntityKind[];
  selectedId: string | null;
  notes: Map<string, string>;
  onNotesChange: (nodeId: string, value: string) => void;
  onFocusNode: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    // Seul point de gestion d'Echap (le Sheet du panneau lateral desactive
    // le sien via onEscapeKeyDown, cf. GraphSidePanel) : une premiere touche
    // Echap ne fait que deselectionner si le panneau est ouvert, la suivante
    // ferme le plein ecran.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedId) engine.clearSelection();
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, selectedId, engine]);

  return createPortal(
    <div className="dark fixed inset-0 z-[100] flex flex-col" style={{ background: "#09090B" }} data-testid="overlay-graph-fullscreen">
      <GraphToolbar engine={engine} usedKinds={usedKinds} onClose={onClose} />
      <div className="relative flex-1 min-h-0">
        <GraphCanvasHost engine={engine} />
      </div>
      <GraphSidePanel
        engine={engine}
        model={model}
        selectedId={selectedId}
        notes={notes}
        onNotesChange={onNotesChange}
        onClose={() => engine.clearSelection()}
        onFocusNode={onFocusNode}
      />
    </div>,
    document.body,
  );
}
