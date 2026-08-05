import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Hash, Lock, Check } from "lucide-react";

/* ── Fonctionnalites annoncees pour le module Discord Scan ──
 * Bot connecte a l'API officielle Discord : historique des messages,
 * pseudos et roles des serveurs, interrogeables via un simple ID. ── */
const DISCORD_FEATURES: string[] = [
  "Historique des messages envoyes, recupere via un bot sur l'API officielle Discord",
  "Pseudos et changements de pseudo releves au fil du temps",
  "Roles et appartenance aux serveurs partages avec le bot",
  "Recherche par simple ID Discord, sans installation cote utilisateur",
];

/* Meme variable de couleur que le graphe relationnel (--graph-discord) pour
 * rester dans le meme langage visuel que les noeuds "Discord" existants.
 * Injectee en style inline (et non en classe Tailwind arbitraire) car les
 * modificateurs d'opacite Tailwind ne s'appliquent pas a une valeur
 * hsl(var(--x)) arbitraire. */
const dc = (alpha: number) => `hsl(var(--graph-discord) / ${alpha})`;

/* ── Page verrouillee : le module n'est pas encore en ligne, la recherche
 * reste desactivee mais la page et son acces nav existent des maintenant. ── */
export default function DiscordScanPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: dc(0.06) }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle, ${dc(1)} 1px, transparent 1px)`, backgroundSize: "28px 28px" }}
        />
      </div>

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        <div
          className="mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center"
          style={{ background: dc(0.1), borderColor: dc(0.25) }}
        >
          <Bot className="w-8 h-8" style={{ color: dc(1) }} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: dc(0.7) }}>Bientot disponible</p>
          <h1 className="text-3xl font-bold tracking-tight">Discord Scan</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Un bot connecte a l'API officielle Discord collecte messages, pseudos et roles des serveurs — retrouvez ensuite tout ca a partir d'un simple ID.
          </p>
        </div>

        <Card className="relative overflow-hidden rounded-2xl p-6 text-left space-y-5" style={{ borderColor: dc(0.2) }}>
          <div className="space-y-2.5">
            {DISCORD_FEATURES.map((text, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: dc(0.1) }}>
                  <Check className="w-3 h-3" style={{ color: dc(1) }} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              disabled
              placeholder="ID Discord (ex : 123456789012345678)"
              className="pl-9 opacity-60 cursor-not-allowed"
              data-testid="input-discord-id"
            />
          </div>

          <Button disabled className="w-full gap-2 opacity-60 cursor-not-allowed" data-testid="button-discord-search">
            <Lock className="w-4 h-4" />
            Recherche verrouillee
          </Button>

          <p className="relative text-[10px] text-center text-muted-foreground">
            Module en cours de deploiement — l'acces sera ouvert prochainement.
          </p>
        </Card>
      </div>
    </div>
  );
}
