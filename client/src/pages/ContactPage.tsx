import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldBan,
  Search,
  ArrowRight,
  MessageSquare,
  Clock,
  Headphones,
  CreditCard,
  CheckCircle,
  Sparkles,
  Ticket,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

function useTilt() {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ rotateX: (0.5 - y) * 14, rotateY: (x - 0.5) * 14, scale: 1.025 });
  }, []);
  const onMouseLeave = useCallback(() => setTilt({ rotateX: 0, rotateY: 0, scale: 1 }), []);
  return { tilt, onMouseMove, onMouseLeave };
}

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: number;
  tags: string[];
  features: string[];
  href: string;
  accentColor: string;
  glowColor: string;
  index: number;
}

function ServiceCard({ icon, title, description, price, tags, features, href, accentColor, glowColor, index }: ServiceCardProps) {
  const { tilt, onMouseMove, onMouseLeave } = useTilt();
  const isTilted = tilt.scale > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "900px" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <Card
        className="relative p-7 h-full flex flex-col overflow-hidden transition-shadow duration-300"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${tilt.scale}, ${tilt.scale}, ${tilt.scale})`,
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
          transformStyle: "preserve-3d",
          willChange: "transform",
          boxShadow: isTilted ? `0 24px 48px -12px ${glowColor}` : undefined,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top left, ${glowColor} 0%, transparent 60%)` }}
        />

        <div className="relative flex items-start gap-4 mb-5">
          <div
            className="w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold" style={{ color: accentColor }}>{price}€</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">par demande</div>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-1.5 mb-5">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
              style={{ borderColor: `${accentColor}35`, color: accentColor, backgroundColor: `${accentColor}10` }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="relative space-y-2 mb-6 flex-1">
          {features.map(f => (
            <div key={f} className="flex items-center gap-2.5 text-sm">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
              <span className="text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>

        <div className="relative mt-auto">
          <Link href={href}>
            <Button
              className="w-full gap-2 font-medium"
              style={{
                backgroundColor: `${accentColor}15`,
                border: `1px solid ${accentColor}40`,
                color: accentColor,
              } as React.CSSProperties}
              variant="outline"
              data-testid={`button-service-${title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              Faire une demande
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

const STATS = [
  { icon: Clock,       value: "48h",   label: "Délai de traitement" },
  { icon: Headphones,  value: "<1h",   label: "Réponse ticket" },
  { icon: CreditCard,  value: "Crypto", label: "Paiement sécurisé" },
];

const SERVICES: Omit<ServiceCardProps, "index">[] = [
  {
    icon: <ShieldBan className="w-6 h-6" style={{ color: "#d4a843" }} />,
    title: "Demande de Blacklist",
    description: "Faites retirer vos données personnelles de nos bases. Traitement RGPD sous 48h.",
    price: 30,
    tags: ["RGPD", "Suppression", "48h"],
    features: [
      "Suppression des données personnelles",
      "Confirmation par email",
      "Délai de traitement : 48h maximum",
      "Paiement unique en crypto",
    ],
    href: "/blacklist-request",
    accentColor: "#d4a843",
    glowColor: "rgba(212, 168, 67, 0.12)",
  },
  {
    icon: <Search className="w-6 h-6" style={{ color: "hsl(158 64% 52%)" }} />,
    title: "Demande d'Information",
    description: "Obtenez un rapport complet sur une personne à partir d'un identifiant (email, pseudo, IP…).",
    price: 25,
    tags: ["Information", "OSINT", "Rapport"],
    features: [
      "Recherche multi-sources avancée",
      "Rapport détaillé fourni",
      "Email, pseudo, Discord, IP, téléphone",
      "Paiement unique en crypto",
    ],
    href: "/info-request",
    accentColor: "hsl(158 64% 52%)",
    glowColor: "rgba(52, 211, 153, 0.12)",
  },
];

export default function ContactPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />
      <div className="absolute top-40 -left-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-60 -right-32 w-72 h-72 bg-primary/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative container max-w-4xl mx-auto px-4 py-16 md:py-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 text-primary text-sm font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Contact & Services
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            Nous{" "}
            <span className="text-primary relative">
              Contacter
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

          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base leading-relaxed">
            Soumettez une demande de suppression ou d'information, ou ouvrez un ticket pour toute question.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex items-center justify-center gap-10 pt-4"
          >
            {STATS.map((stat, i) => (
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

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.title} {...s} index={i} />
          ))}
        </div>

        {/* Support Ticket CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold mb-1">Besoin d'assistance ?</h3>
                <p className="text-sm text-muted-foreground">
                  Une question sur ton abonnement, un bug, ou une demande particulière ? Notre équipe répond généralement en moins d'une heure.
                </p>
              </div>
              <div className="shrink-0">
                <Link href="/tickets">
                  <Button size="lg" className="gap-2" data-testid="button-open-ticket">
                    Ouvrir un ticket
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

      </div>
    </main>
  );
}
