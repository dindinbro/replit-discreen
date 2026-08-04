import type { EntityKind, EntityNode } from "./types";

/**
 * Dimensions canoniques d'une carte-noeud (espace de simulation, independant
 * du zoom ecran). Toutes les cartes partagent la meme structure a 5 lignes
 * (icone+nom, type, connexions+statut, fiabilite, source) donc la meme
 * hauteur ; seule la largeur varie legerement selon le type de libelle
 * attendu (les noms de personnes sont generalement plus longs).
 */
const PERSON_SIZE = { width: 224, height: 132 };
const ATTRIBUTE_SIZE = { width: 200, height: 132 };

export const NODE_DIMENSIONS: Record<EntityKind, { width: number; height: number }> = {
  person: PERSON_SIZE,
  email: ATTRIBUTE_SIZE,
  phone: ATTRIBUTE_SIZE,
  address: ATTRIBUTE_SIZE,
  ip: ATTRIBUTE_SIZE,
  discord: ATTRIBUTE_SIZE,
  username: ATTRIBUTE_SIZE,
  vehicle: ATTRIBUTE_SIZE,
  bank: ATTRIBUTE_SIZE,
  document: ATTRIBUTE_SIZE,
  domain: ATTRIBUTE_SIZE,
  company: ATTRIBUTE_SIZE,
  social: ATTRIBUTE_SIZE,
  gps: ATTRIBUTE_SIZE,
};

export function nodeDimensions(node: Pick<EntityNode, "kind">): { width: number; height: number } {
  return NODE_DIMENSIONS[node.kind];
}

export function nodeRadius(node: Pick<EntityNode, "kind">): number {
  const { width, height } = nodeDimensions(node);
  return Math.hypot(width, height) / 2;
}
