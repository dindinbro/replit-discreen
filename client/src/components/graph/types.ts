import type { WantedProfile } from "@shared/schema";

/**
 * Types d'entites geres par le moteur de graphe. "company" / "social" / "gps"
 * n'ont pas de champ correspondant dans wantedProfiles: ils restent definis
 * (icone/couleur) pour la coherence du registre mais buildEntityGraph ne les
 * emet jamais.
 */
export type EntityKind =
  | "person"
  | "email"
  | "phone"
  | "address"
  | "ip"
  | "discord"
  | "username"
  | "vehicle"
  | "bank"
  | "document"
  | "domain"
  | "company"
  | "social"
  | "gps";

export type EntityStatus = "verifie" | "non_verifie";

/** Position/velocite geree par d3-force a l'execution (SimulationNodeDatum). */
export interface EntityNode {
  id: string;
  kind: EntityKind;
  label: string;
  subtitle?: string;
  value?: string;
  profile?: WantedProfile;
  contributingProfileIds: number[];
  degree: number;
  confidence: number;
  status: EntityStatus;
  source: string;
  hidden?: boolean;
  locked?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface EntityEdge {
  id: string;
  source: string;
  target: string;
  kind: EntityKind;
  relationLabel: string;
  weight: number;
}

export interface AdjacencyEntry {
  neighbor: string;
  edge: EntityEdge;
}

export interface GraphModel {
  nodes: EntityNode[];
  edges: EntityEdge[];
  byId: Map<string, EntityNode>;
  adjacency: Map<string, AdjacencyEntry[]>;
}

export type ColorMode = "type" | "confidence";
