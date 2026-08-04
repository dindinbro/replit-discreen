import { useMemo, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Lock, LockOpen, EyeOff, Crosshair, Users, ChevronRight, Mail, Phone, MapPin, Hash, MessageSquare, Fingerprint } from "lucide-react";
import { ENTITY_REGISTRY } from "./registry";
import { FieldGroup, wantedFieldValues } from "./wantedProfileHelpers";
import type { GraphModel } from "./types";
import type { GraphEngine } from "./useGraphEngine";

export function GraphSidePanel({
  engine, model, selectedId, notes, onNotesChange, onClose, onFocusNode,
}: {
  engine: GraphEngine;
  model: GraphModel;
  selectedId: string | null;
  notes: Map<string, string>;
  onNotesChange: (nodeId: string, value: string) => void;
  onClose: () => void;
  onFocusNode: (id: string) => void;
}) {
  const node = selectedId ? model.byId.get(selectedId) : undefined;
  const [locked, setLocked] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!node) return;
    setLocked(engine.isLocked(node.id));
    setNoteDraft(notes.get(node.id) ?? "");
    setLightbox(null);
  }, [node?.id]);

  const images = (node?.profile?.images || []).filter(Boolean) as string[];

  const relations = useMemo(() => {
    if (!node) return [];
    return (model.adjacency.get(node.id) ?? [])
      .map(({ neighbor, edge }) => ({ node: model.byId.get(neighbor), edge }))
      .filter((r): r is { node: NonNullable<typeof r.node>; edge: typeof r.edge } => !!r.node)
      .sort((a, b) => b.node.degree - a.node.degree);
  }, [node?.id, model]);

  const meta = node ? ENTITY_REGISTRY[node.kind] : null;
  const statusLabel = node?.status === "verifie" ? "Verifie" : "Non verifie";

  return (
    <Sheet open={!!node} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="dark w-full sm:max-w-sm bg-[#0c0d12] border-white/10 text-white/90 overflow-y-auto"
        data-testid="panel-graph-node"
        // Echap est gere de facon centralisee par GraphFullscreenOverlay
        // (panneau ouvert -> deselectionne ; sinon -> ferme le plein ecran).
        // Sans ce preventDefault, le handler interne de Radix et celui de
        // l'overlay se disputent le meme evenement de facon non deterministe.
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {node && meta && (
          <>
            <SheetHeader className="text-left space-y-3">
              <div className="flex items-center gap-3">
                {images.length > 0 ? (
                  <img
                    src={images[0]}
                    alt=""
                    className="w-11 h-11 rounded-2xl object-cover shrink-0 cursor-pointer"
                    onClick={() => setLightbox(images[0])}
                    data-testid="img-node-avatar"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    {meta.emoji}
                  </div>
                )}
                <div className="min-w-0">
                  <SheetTitle className="text-white text-base leading-tight truncate">{node.label}</SheetTitle>
                  <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">{meta.label}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="bg-white/[0.06] text-white/70 border-0 text-[11px]">
                  {node.degree} connexion{node.degree > 1 ? "s" : ""}
                </Badge>
                <Badge variant="secondary" className={`border-0 text-[11px] ${node.status === "verifie" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-white/60"}`}>
                  {statusLabel}
                </Badge>
                <Badge variant="secondary" className="bg-white/[0.06] text-white/70 border-0 text-[11px]">
                  Fiabilite {node.confidence}%
                </Badge>
              </div>
              <p className="text-xs text-white/50">Source : {node.source}</p>
            </SheetHeader>

            <div className="flex items-center gap-1.5 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 rounded-full text-xs border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  const next = !locked;
                  setLocked(next);
                  engine.setLocked(node.id, next);
                }}
                data-testid="button-toggle-lock"
              >
                {locked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                {locked ? "Verrouille" : "Verrouiller"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 rounded-full text-xs border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => engine.setIsolate(node.id)}
                data-testid="button-isolate-node"
              >
                <Users className="w-3.5 h-3.5" /> Isoler
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 rounded-full text-xs border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => onFocusNode(node.id)}
                data-testid="button-recenter-node"
              >
                <Crosshair className="w-3.5 h-3.5" /> Recentrer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 rounded-full border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  engine.setHidden(node.id, true);
                  onClose();
                }}
                data-testid="button-hide-node"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </Button>
            </div>

            {images.length > 0 && (
              <div className="mt-5 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Photos ({images.length})</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(src)}
                      className="aspect-square rounded-md overflow-hidden border border-white/10"
                      data-testid={`img-node-thumb-${i}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {node.profile && (
              <div className="grid grid-cols-1 gap-4 mt-5 [&_svg]:text-white/40 [&_.text-muted-foreground]:text-white/50 [&_.text-foreground]:text-white/85">
                <FieldGroup icon={Mail} label="Emails" values={wantedFieldValues(node.profile, "emails")} />
                <FieldGroup icon={Phone} label="Telephones" values={wantedFieldValues(node.profile, "phones")} />
                <FieldGroup icon={MapPin} label="Adresses" values={wantedFieldValues(node.profile, "addresses")} />
                <FieldGroup icon={Hash} label="IPs" values={wantedFieldValues(node.profile, "ips")} />
                <FieldGroup icon={MessageSquare} label="Discord" values={wantedFieldValues(node.profile, "discordIds")} />
                <FieldGroup
                  icon={Fingerprint}
                  label="Documents"
                  values={[node.profile.nir, node.profile.iban, node.profile.plaque].filter(Boolean) as string[]}
                />
              </div>
            )}

            {relations.length > 0 && (
              <div className="mt-5 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Relations ({relations.length})</p>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {relations.map(({ node: neighbor, edge }) => (
                    <button
                      key={neighbor.id}
                      onClick={() => onFocusNode(neighbor.id)}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.06] transition-colors"
                      data-testid={`relation-${neighbor.id}`}
                    >
                      <span className="text-sm leading-none shrink-0">{ENTITY_REGISTRY[neighbor.kind].emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-white/85 truncate">{neighbor.label}</span>
                        <span className="block text-[10px] text-white/40">{edge.relationLabel}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Notes</p>
              <Textarea
                value={noteDraft}
                onChange={e => {
                  setNoteDraft(e.target.value);
                  onNotesChange(node.id, e.target.value);
                }}
                placeholder="Notes personnelles pour cette session..."
                className="min-h-20 text-xs bg-white/[0.04] border-white/10 text-white/85 placeholder:text-white/30"
                data-testid="textarea-node-notes"
              />
              <p className="text-[10px] text-white/30">Non sauvegarde — conserve uniquement pour cette session.</p>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 text-[11px] text-white/40 space-y-1">
              {node.profile?.createdAt && <p>Ajoute le {new Date(node.profile.createdAt).toLocaleDateString("fr-FR")}</p>}
              <p>Fiabilite et statut calcules automatiquement, non verifies manuellement.</p>
            </div>
          </>
        )}
      </SheetContent>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setLightbox(null)}
          data-testid="overlay-node-lightbox"
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </Sheet>
  );
}
