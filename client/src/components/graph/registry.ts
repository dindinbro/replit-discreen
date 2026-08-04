import {
  User, Mail, Phone, MapPin, Wifi, MessageSquare, AtSign, Car,
  CreditCard, Fingerprint, Globe, Building2, Share2, MapPinned,
  type LucideIcon,
} from "lucide-react";
import type { EntityKind } from "./types";

export interface EntityKindMeta {
  label: string;
  /** Variable CSS HSL (sans hsl(var(...))) a resoudre au theme courant. */
  colorVar: string;
  /** Icone lucide — utilisee dans le chrome React (toolbar, panneau, legende). */
  icon: LucideIcon;
  /** Emoji dessine directement sur le canvas (fillText) — evite la rasterisation de SVG. */
  emoji: string;
  /** Libelle de la relation personne -> attribut de ce type. */
  relationLabel: string;
  /** Poids utilise par rings.ts pour la distance BFS ponderee depuis le focus. */
  ringWeight: number;
}

/**
 * Reutilise les variables --field-* deja definies dans index.css (precedent
 * SearchPage.tsx / getFieldColorVar) pour les types qui s'y pretent, et
 * n'introduit de nouvelles variables --graph-* que pour les types sans
 * equivalent existant.
 */
export const ENTITY_REGISTRY: Record<EntityKind, EntityKindMeta> = {
  person: { label: "Personne", colorVar: "--field-person", icon: User, emoji: "\u{1F464}", relationLabel: "Est", ringWeight: 1 },
  email: { label: "Email", colorVar: "--field-email", icon: Mail, emoji: "\u{1F4E7}", relationLabel: "Utilise", ringWeight: 1 },
  phone: { label: "Telephone", colorVar: "--field-phone", icon: Phone, emoji: "\u{1F4F1}", relationLabel: "Utilise", ringWeight: 1 },
  address: { label: "Adresse", colorVar: "--field-location", icon: MapPin, emoji: "\u{1F3E0}", relationLabel: "Habite", ringWeight: 1 },
  document: { label: "Document", colorVar: "--field-id", icon: Fingerprint, emoji: "\u{1FAAA}", relationLabel: "Possede", ringWeight: 2 },
  bank: { label: "Carte bancaire", colorVar: "--field-finance", icon: CreditCard, emoji: "\u{1F4B3}", relationLabel: "Possede", ringWeight: 2 },
  ip: { label: "IP", colorVar: "--graph-ip", icon: Wifi, emoji: "\u{1F30D}", relationLabel: "Connecte depuis", ringWeight: 1.6 },
  discord: { label: "Reseau social", colorVar: "--graph-discord", icon: MessageSquare, emoji: "\u{1F4F7}", relationLabel: "Associe a", ringWeight: 1.6 },
  username: { label: "Username", colorVar: "--graph-username", icon: AtSign, emoji: "\u{1F511}", relationLabel: "Cree avec", ringWeight: 1.6 },
  vehicle: { label: "Vehicule", colorVar: "--graph-vehicle", icon: Car, emoji: "\u{1F697}", relationLabel: "Possede", ringWeight: 1.6 },
  domain: { label: "Domaine", colorVar: "--graph-domain", icon: Globe, emoji: "\u{1F310}", relationLabel: "Associe a", ringWeight: 1.6 },
  // Reserves pour compatibilite future — aucune donnee en base, jamais emis par buildGraph.ts.
  company: { label: "Societe", colorVar: "--graph-domain", icon: Building2, emoji: "\u{1F3E2}", relationLabel: "Travaille chez", ringWeight: 2 },
  social: { label: "Reseau social", colorVar: "--graph-discord", icon: Share2, emoji: "\u{1F4F7}", relationLabel: "Associe a", ringWeight: 1.6 },
  gps: { label: "Coordonnees GPS", colorVar: "--field-location", icon: MapPinned, emoji: "\u{1F4CD}", relationLabel: "Localise a", ringWeight: 1.6 },
};

export function entityColorHsl(kind: EntityKind): string {
  return `hsl(var(${ENTITY_REGISTRY[kind].colorVar}))`;
}
