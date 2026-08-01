import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldBan,
  Search,
  ArrowRight,
  Clock,
  Headphones,
  CreditCard,
  Check,
  Ticket,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { DiscreenMark } from "@/components/Layout";

const STATS = [
  { icon: Clock,      value: "48h",    label: "Delai de traitement" },
  { icon: Headphones, value: "< 1h",   label: "Reponse ticket" },
  { icon: CreditCard, value: "Crypto", label: "Paiement securise" },
];

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: number;
  features: string[];
  href: string;
  index: number;
}

function ServiceCard({ icon, title, description, price, features, href, index }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 + index * 0.1 }}
    >
      <Card className="group relative h-full flex flex-col p-6 border-border/60 hover:border-primary/40 transition-colors duration-200 overflow-hidden">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">{price}€</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">par demande</div>
          </div>
        </div>

        <h3 className="relative text-lg font-bold mb-1.5">{title}</h3>
        <p className="relative text-sm text-muted-foreground leading-relaxed mb-5">{description}</p>

        <div className="relative space-y-2 mb-6 flex-1">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-sm">
              <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>

        <Link href={href} className="relative">
          <Button className="w-full gap-2" data-testid={`button-service-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            Faire une demande
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </Card>
    </motion.div>
  );
}

const SERVICES: Omit<ServiceCardProps, "index">[] = [
  {
    icon: <ShieldBan className="w-5 h-5 text-primary" />,
    title: "Demande de blacklist",
    description: "Faites retirer vos donnees personnelles de nos bases. Traitement RGPD sous 48h.",
    price: 30,
    features: [
      "Suppression des donnees personnelles",
      "Confirmation par email",
      "Delai de traitement : 48h maximum",
      "Paiement unique en crypto",
    ],
    href: "/blacklist-request",
  },
  {
    icon: <Search className="w-5 h-5 text-primary" />,
    title: "Demande d'information",
    description: "Obtenez un rapport complet sur une personne a partir d'un identifiant (email, pseudo, IP...).",
    price: 25,
    features: [
      "Recherche multi-sources avancee",
      "Rapport detaille fourni",
      "Email, pseudo, Discord, IP, telephone",
      "Paiement unique en crypto",
    ],
    href: "/info-request",
  },
];

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="relative container max-w-4xl mx-auto px-4 py-16 md:py-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-14"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/25 mb-2">
            <DiscreenMark className="w-6 h-6" />
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            Nous <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-primary/80">contacter</span>
          </h1>

          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base leading-relaxed">
            Soumettez une demande de suppression ou d'information, ou ouvrez un ticket pour toute question.
          </p>

          <div className="flex items-center justify-center gap-10 pt-2">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="flex flex-col items-center gap-1"
              >
                <stat.icon className="w-4 h-4 text-primary/70 mb-0.5" />
                <span className="text-lg font-bold text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.title} {...s} index={i} />
          ))}
        </div>

        {/* Support Ticket CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
        >
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-7">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-bold mb-1">Besoin d'assistance ?</h3>
                <p className="text-sm text-muted-foreground">
                  Une question sur ton abonnement, un bug, ou une demande particuliere ? Notre equipe repond generalement en moins d'une heure.
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
