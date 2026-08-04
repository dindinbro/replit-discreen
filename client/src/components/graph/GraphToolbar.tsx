import { useState } from "react";
import { Search, Maximize2, Download, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ENTITY_REGISTRY } from "./registry";
import type { ColorMode, EntityKind } from "./types";
import type { GraphEngine } from "./useGraphEngine";

export function GraphToolbar({ engine, usedKinds, onClose }: { engine: GraphEngine; usedKinds: EntityKind[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [activeKinds, setActiveKinds] = useState<Set<EntityKind> | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("type");
  const [isolating, setIsolating] = useState(false);

  function toggleKind(kind: EntityKind) {
    setActiveKinds(prev => {
      const base = prev ?? new Set(usedKinds);
      const next = new Set(base);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      const resolved = next.size === usedKinds.length ? null : next;
      engine.setFilters(resolved);
      return resolved;
    });
  }

  function toggleIsolate() {
    setIsolating(prev => {
      const next = !prev;
      engine.setIsolate(next ? engine.getFocus() : null);
      return next;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pl-3 pr-2 py-1.5 min-w-[220px]">
        <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
        <Input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            engine.setSearchQuery(e.target.value);
          }}
          placeholder="Rechercher un noeud..."
          className="h-6 text-xs border-0 bg-transparent px-0 text-white placeholder:text-white/35 focus-visible:ring-0 shadow-none"
          data-testid="input-graph-search"
        />
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {usedKinds.map(kind => {
          const meta = ENTITY_REGISTRY[kind];
          const active = !activeKinds || activeKinds.has(kind);
          return (
            <button
              key={kind}
              onClick={() => toggleKind(kind)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                active ? "border-white/20 bg-white/[0.06] text-white/85" : "border-white/5 bg-transparent text-white/30"
              }`}
              data-testid={`filter-kind-${kind}`}
            >
              <span className="leading-none">{meta.emoji}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      <Button
        size="sm"
        variant={isolating ? "default" : "outline"}
        className={`h-7 gap-1.5 rounded-full text-xs ${isolating ? "bg-red-600 hover:bg-red-700 text-white border-0" : "border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"}`}
        onClick={toggleIsolate}
        data-testid="button-toggle-isolate"
      >
        <Users className="w-3.5 h-3.5" /> Voisins directs
      </Button>

      <ToggleGroup
        type="single"
        value={colorMode}
        onValueChange={v => {
          if (!v) return;
          const mode = v as ColorMode;
          setColorMode(mode);
          engine.setColorMode(mode);
        }}
        className="rounded-full border border-white/10 p-0.5"
      >
        <ToggleGroupItem value="type" className="h-6 px-2.5 text-[11px] rounded-full data-[state=on]:bg-white/15 text-white/70">
          Par type
        </ToggleGroupItem>
        <ToggleGroupItem value="confidence" className="h-6 px-2.5 text-[11px] rounded-full data-[state=on]:bg-white/15 text-white/70">
          Par confiance
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 rounded-full text-xs border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => engine.resetView()}
          data-testid="button-reset-view"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Reinitialiser
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 rounded-full text-xs border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
              data-testid="button-export-graph"
            >
              <Download className="w-3.5 h-3.5" /> Exporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => engine.exportPNG()}>PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => engine.exportSVG()}>SVG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => engine.exportJSON()}>JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full text-white/60 hover:bg-white/10 hover:text-white" onClick={onClose} data-testid="button-close-fullscreen-graph">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
