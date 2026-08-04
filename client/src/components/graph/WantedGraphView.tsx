import { useCallback, useEffect, useMemo, useState } from "react";
import type { WantedProfile } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Maximize2, Network, Link2 } from "lucide-react";
import { buildEntityGraph } from "./buildGraph";
import { useGraphEngine } from "./useGraphEngine";
import { GraphCanvasHost } from "./GraphCanvasHost";
import { GraphLegend } from "./GraphLegend";
import { GraphFullscreenOverlay } from "./GraphFullscreenOverlay";
import { wantedProfileLabel } from "./wantedProfileHelpers";
import type { EntityKind } from "./types";

const KIND_ORDER: EntityKind[] = [
  "person", "email", "phone", "address", "ip", "domain",
  "username", "discord", "vehicle", "bank", "document", "company", "social", "gps",
];

function personNodeId(id: number): string {
  return `person:${id}`;
}

/**
 * Vue publique du graphe Wanted. Remplace entierement l'ancien moteur base
 * sur @xyflow/react (voir le plan de refonte) : signature de props
 * inchangee pour rester un remplacement direct dans WantedPage.tsx et
 * AdminPage.tsx.
 *
 * L'apercu inline reste volontairement leger (selecteur de profil en mode
 * "ego", survol/clic pour changer le focus ou isoler les connexions) ; le
 * moteur complet (recherche, filtres, mode couleur, panneau lateral,
 * export...) ne vit que dans l'overlay plein ecran.
 */
export function WantedGraphView({ profiles, initialCenterId, compact }: { profiles: WantedProfile[]; initialCenterId?: number; compact?: boolean }) {
  const isEgoMode = initialCenterId !== undefined;
  const graphModel = useMemo(() => buildEntityGraph(profiles), [profiles]);

  const [focusId, setFocusIdState] = useState<string | null>(isEgoMode ? personNodeId(initialCenterId!) : null);
  useEffect(() => {
    if (isEgoMode) setFocusIdState(personNodeId(initialCenterId!));
    // Ne se resynchronise que lorsque le PARENT change de profil centre — un
    // changement via le selecteur interne ne touche jamais `initialCenterId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenterId]);

  const engine = useGraphEngine(graphModel, focusId);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());

  const setFocus = useCallback(
    (id: string | null) => {
      setFocusIdState(id);
      engine.setFocus(id, { recenter: true });
    },
    [engine],
  );

  useEffect(() => {
    return engine.onSelectionChange(ids => {
      setSelectedIds(ids);
      if (fullscreenOpen) return; // plein ecran : la selection ouvre juste le panneau lateral
      if (ids.size !== 1) {
        if (!isEgoMode) engine.setIsolate(null);
        return;
      }
      const id = Array.from(ids)[0];
      if (isEgoMode) {
        if (id !== focusId) setFocus(id);
      } else {
        engine.setIsolate(id);
      }
    });
  }, [engine, fullscreenOpen, isEgoMode, focusId, setFocus]);

  const usedKinds = useMemo(() => {
    const present = new Set(graphModel.nodes.map(n => n.kind));
    return KIND_ORDER.filter(k => present.has(k));
  }, [graphModel]);

  const handleNotesChange = useCallback((nodeId: string, value: string) => {
    setNotes(prev => {
      const next = new Map(prev);
      next.set(nodeId, value);
      return next;
    });
  }, []);

  if (!profiles.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucun profil Wanted a afficher.</p>
      </Card>
    );
  }

  const selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {isEgoMode && (
          <>
            {!compact && <span className="text-xs text-muted-foreground shrink-0">Profil centre :</span>}
            {(!compact || profiles.length > 1) && (
              <Select value={focusId ?? undefined} onValueChange={setFocus}>
                <SelectTrigger className={compact ? "w-full h-8 text-xs" : "w-64 h-8 text-sm"} data-testid="select-graph-profile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={personNodeId(p.id)}>{wantedProfileLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        {!compact && (
          <Badge variant="outline" className={`text-xs gap-1 border-red-500/30 text-red-500 ${isEgoMode ? "" : "mr-auto"}`}>
            <Link2 className="w-3 h-3" />
            {isEgoMode ? "Cliquez un profil pour le centrer" : "Cliquez un profil pour isoler ses connexions"}
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className={`gap-1.5 rounded-full text-xs ${isEgoMode || !compact ? "" : "ml-auto"}`}
          onClick={() => setFullscreenOpen(true)}
          data-testid="button-open-fullscreen-graph"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Plein ecran
        </Button>
      </div>

      {!compact && <GraphLegend kinds={usedKinds} />}

      <div className={`${compact ? "h-[460px]" : "h-[calc(100vh-260px)] min-h-[640px]"} rounded-lg border border-border/50 overflow-hidden relative`}>
        {fullscreenOpen ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6 bg-secondary/5">
            <Network className="w-5 h-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Graphe ouvert en plein ecran.</p>
          </div>
        ) : (
          <GraphCanvasHost engine={engine} />
        )}
      </div>

      {fullscreenOpen && (
        <GraphFullscreenOverlay
          engine={engine}
          model={graphModel}
          usedKinds={usedKinds}
          selectedId={selectedId}
          notes={notes}
          onNotesChange={handleNotesChange}
          onFocusNode={setFocus}
          onClose={() => setFullscreenOpen(false)}
        />
      )}
    </div>
  );
}
