import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink, ShieldBan, Search } from "lucide-react";
import { SiDiscord, SiTelegram } from "react-icons/si";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function ContactPage() {
  return (
    <main className="relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />

      <div className="relative container max-w-5xl mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-primary/30 text-primary gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Contact
          </Badge>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            Nous <span className="text-primary">Contacter</span>
          </h1>

          <p className="text-muted-foreground max-w-lg mx-auto">
            Pour toute question, suggestion ou demande de support, rejoignez notre serveur Discord ou notre Telegram.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
            <Card className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-xl bg-[#5865F2]/10 flex items-center justify-center mx-auto">
                <SiDiscord className="w-8 h-8 text-[#5865F2]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold" data-testid="text-discord-contact">Discord</h2>
                <p className="text-sm text-muted-foreground">Support rapide et communaute</p>
              </div>
              <a href="https://discord.gg/discreen" target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2" data-testid="button-discord-join">
                  Rejoindre
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </Card>

            <Card className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-xl bg-[#0088cc]/10 flex items-center justify-center mx-auto">
                <SiTelegram className="w-8 h-8 text-[#0088cc]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold" data-testid="text-telegram-contact">Telegram</h2>
                <p className="text-sm text-muted-foreground">Bientot disponible</p>
              </div>
              <Button variant="outline" className="w-full gap-2" disabled data-testid="button-telegram-soon">
                Soon
              </Button>
            </Card>

            <Card className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <ShieldBan className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold" data-testid="text-blacklist-contact">Demande de Blacklist</h2>
                <p className="text-sm text-muted-foreground">Vous souhaitez faire retirer vos donnees ? Soumettez une demande.</p>
              </div>
              <Link href="/blacklist-request">
                <Button variant="outline" className="w-full gap-2" data-testid="button-blacklist-request">
                  Faire une demande
                </Button>
              </Link>
            </Card>

            <Card className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold" data-testid="text-info-contact">Demande d'Information</h2>
                <p className="text-sm text-muted-foreground">Vous souhaitez obtenir des informations ? Soumettez une demande.</p>
              </div>
              <Link href="/info-request">
                <Button variant="outline" className="w-full gap-2" data-testid="button-info-request">
                  Faire une demande
                </Button>
              </Link>
            </Card>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
