import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ExternalLink,
  ShieldBan,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  Headphones,
} from "lucide-react";
import { SiDiscord, SiTelegram } from "react-icons/si";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

function useTilt() {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ rotateX: (0.5 - y) * 16, rotateY: (x - 0.5) * 16, scale: 1.03 });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  }, []);

  return { tilt, onMouseMove, onMouseLeave };
}

interface ContactCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  accentColor: string;
  glowColor: string;
  index: number;
  tags?: string[];
}

function ContactCard({ icon, title, description, action, accentColor, glowColor, index, tags }: ContactCardProps) {
  const { tilt, onMouseMove, onMouseLeave } = useTilt();
  const isTilted = tilt.scale > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "800px" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <Card
        className="relative p-6 h-full flex flex-col overflow-hidden transition-shadow duration-300"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${tilt.scale}, ${tilt.scale}, ${tilt.scale})`,
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
          transformStyle: "preserve-3d",
          willChange: "transform",
          boxShadow: isTilted ? `0 20px 40px -12px ${glowColor}` : undefined,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />

        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold mb-0.5">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2">{action}</div>
      </Card>
    </motion.div>
  );
}

export default function ContactPage() {
  const { t } = useTranslation();

  const stats = [
    { icon: Users, value: "5000+", label: "Membres Discord" },
    { icon: Clock, value: "<1h", label: "Temps de reponse" },
    { icon: Headphones, value: "24/7", label: "Support actif" },
  ];

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />
      <div className="absolute top-40 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-60 -right-32 w-64 h-64 bg-[#5865F2]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative container max-w-5xl mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-primary/30 text-primary gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              {t("contact.badge")}
            </Badge>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            {t("contact.title")}{" "}
            <span className="text-primary relative">
              {t("contact.titleHighlight")}
              <motion.span
                className="absolute -top-1 -right-5"
                initial={{ opacity: 0, rotate: -20 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.5, duration: 0.4, type: "spring" }}
              >
                <Sparkles className="w-5 h-5 text-primary/60" />
              </motion.span>
            </span>
          </h1>

          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed">
            {t("contact.subtitle")}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex items-center justify-center gap-8 pt-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex flex-col items-center gap-1"
              >
                <stat.icon className="w-4 h-4 text-primary/60 mb-0.5" />
                <span className="text-lg font-bold text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          <ContactCard
            index={0}
            icon={<SiDiscord className="w-6 h-6 text-[#5865F2]" />}
            title={t("contact.discord")}
            description={t("contact.discordDesc")}
            accentColor="#5865F2"
            glowColor="rgba(88, 101, 242, 0.2)"
            tags={["Tickets", "Communaute", "Support live"]}
            action={
              <a href="https://discord.gg/discreen" target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white" data-testid="button-discord-join">
                  {t("contact.join")}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            }
          />

          <ContactCard
            index={1}
            icon={<SiTelegram className="w-6 h-6 text-[#0088cc]" />}
            title={t("contact.telegram")}
            description={t("contact.telegramDesc")}
            accentColor="#0088cc"
            glowColor="rgba(0, 136, 204, 0.15)"
            tags={["Annonces", "Updates"]}
            action={
              <Button variant="outline" className="w-full gap-2" disabled data-testid="button-telegram-soon">
                {t("contact.soon")}
              </Button>
            }
          />

          <ContactCard
            index={2}
            icon={<ShieldBan className="w-6 h-6 text-primary" />}
            title={t("contact.blacklist")}
            description={t("contact.blacklistDesc")}
            accentColor="hsl(158 64% 52%)"
            glowColor="rgba(52, 211, 153, 0.15)"
            tags={["RGPD", "Suppression", "48h"]}
            action={
              <Link href="/blacklist-request">
                <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10" data-testid="button-blacklist-request">
                  {t("contact.makeRequest")}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            }
          />

          <ContactCard
            index={3}
            icon={<Search className="w-6 h-6 text-primary" />}
            title={t("contact.infoRequest")}
            description={t("contact.infoRequestDesc")}
            accentColor="hsl(158 64% 52%)"
            glowColor="rgba(52, 211, 153, 0.15)"
            tags={["Information", "Consultation"]}
            action={
              <Link href="/info-request">
                <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10" data-testid="button-info-request">
                  {t("contact.makeRequest")}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            }
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <SiDiscord className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold mb-1">Besoin d'une reponse rapide ?</h3>
                <p className="text-sm text-muted-foreground">
                  Ouvrez un ticket sur notre Discord pour une assistance personnalisee. Notre equipe repond generalement en moins d'une heure.
                </p>
              </div>
              <a href="https://discord.gg/discreen" target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button size="lg" className="gap-2" data-testid="button-discord-cta">
                  Ouvrir un ticket
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
