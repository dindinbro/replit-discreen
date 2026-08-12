import type { WantedProfile } from "@shared/schema";
import type { EntityKind, EntityNode, EntityEdge, GraphModel, AdjacencyEntry } from "./types";
import { ENTITY_REGISTRY } from "./registry";
import { wantedFieldValues, wantedProfileLabel } from "./wantedProfileHelpers";
import { personConfidence, personStatus, personSource, attributeConfidence, attributeSource } from "./heuristics";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function personNodeId(profileId: number): string {
  return `person:${profileId}`;
}

function attributeNodeId(kind: EntityKind, value: string): string {
  return `${kind}:${normalize(value)}`;
}

function categoryNodeId(profileId: number, kind: EntityKind): string {
  return `category:${profileId}:${kind}`;
}

interface AttributeAccumulator {
  kind: EntityKind;
  value: string;
  contributors: { profileId: number; addedBy?: string | null }[];
}

/**
 * Construit le graphe hetero-gene Personne + entites-attributs a partir des
 * profils Wanted. Remplace l'ancien modele "arete directe personne<->personne
 * avec la valeur partagee en simple label" : ici, une valeur partagee par
 * plusieurs profils devient un unique noeud-attribut qui les relie tous
 * naturellement (modele Maltego/i2), ce qui rend possible l'organisation en
 * anneaux concentriques (voir rings.ts).
 *
 * Le "focus" (personne centree) n'entre pas dans ce builder : un seul graphe
 * est construit pour un ensemble de profils donne, la mise en focus est un
 * etat separe consomme par rings.ts / simulation.ts.
 */
export function buildEntityGraph(profiles: WantedProfile[]): GraphModel {
  const personNodes = new Map<string, EntityNode>();
  const categoryNodes = new Map<string, EntityNode>();
  const attributeAccumulators = new Map<string, AttributeAccumulator>();
  const edges: EntityEdge[] = [];
  const edgeKeys = new Set<string>();

  function addEdge(edgeId: string, source: string, target: string, kind: EntityKind, relationLabel: string) {
    if (edgeKeys.has(edgeId)) return;
    edgeKeys.add(edgeId);
    edges.push({ id: edgeId, source, target, kind, relationLabel, weight: 1 });
  }

  // Chaque profil a, par type d'attribut, un noeud "branche" intercale entre
  // la personne et les valeurs de ce type (ex: la branche "Email" de la
  // personne X relie X a chacun de ses emails) plutot qu'une arete directe
  // personne -> valeur — cf. maquette de regroupement par categorie.
  function getOrCreateCategory(kind: EntityKind, profileId: number): EntityNode {
    const id = categoryNodeId(profileId, kind);
    let node = categoryNodes.get(id);
    if (!node) {
      node = {
        id,
        kind,
        label: ENTITY_REGISTRY[kind].label,
        isCategory: true,
        contributingProfileIds: [profileId],
        degree: 0,
        confidence: 100,
        status: "verifie",
        source: "Discreen",
      };
      categoryNodes.set(id, node);
    }
    addEdge(`e:${personNodeId(profileId)}->${id}`, personNodeId(profileId), id, kind, ENTITY_REGISTRY[kind].relationLabel);
    return node;
  }

  function addAttribute(kind: EntityKind, rawValue: string, profileId: number, addedBy?: string | null) {
    const value = rawValue.trim();
    if (!value) return;
    const id = attributeNodeId(kind, value);
    let acc = attributeAccumulators.get(id);
    if (!acc) {
      acc = { kind, value, contributors: [] };
      attributeAccumulators.set(id, acc);
    }
    if (!acc.contributors.some(c => c.profileId === profileId)) {
      acc.contributors.push({ profileId, addedBy });
    }
    const category = getOrCreateCategory(kind, profileId);
    addEdge(`e:${category.id}->${id}`, category.id, id, kind, ENTITY_REGISTRY[kind].relationLabel);
  }

  for (const p of profiles) {
    const id = personNodeId(p.id);
    personNodes.set(id, {
      id,
      kind: "person",
      label: wantedProfileLabel(p),
      subtitle: [p.pseudo && `@${p.pseudo}`, p.ville].filter(Boolean).join(" - ") || undefined,
      profile: p,
      contributingProfileIds: [p.id],
      degree: 0,
      confidence: personConfidence(p),
      status: personStatus(p),
      source: personSource(p),
    });

    wantedFieldValues(p, "emails").forEach(v => {
      addAttribute("email", v, p.id, p.addedBy);
      // Domaine derive de l'email — aucun champ "domaine" en base, mais donne
      // un vrai contenu au type "Domaine" demande dans la maquette.
      const domain = v.split("@")[1];
      if (domain) addAttribute("domain", domain, p.id, p.addedBy);
    });
    wantedFieldValues(p, "phones").forEach(v => addAttribute("phone", v, p.id, p.addedBy));
    wantedFieldValues(p, "addresses").forEach(v => addAttribute("address", v, p.id, p.addedBy));
    wantedFieldValues(p, "ips").forEach(v => addAttribute("ip", v, p.id, p.addedBy));
    wantedFieldValues(p, "discordIds").forEach(v => addAttribute("discord", v, p.id, p.addedBy));
    if (p.pseudo) addAttribute("username", p.pseudo, p.id, p.addedBy);
    if (p.plaque) addAttribute("vehicle", p.plaque, p.id, p.addedBy);
    if (p.iban) addAttribute("bank", p.iban, p.id, p.addedBy);
    if (p.nir) addAttribute("document", p.nir, p.id, p.addedBy);
  }

  const attributeNodes = new Map<string, EntityNode>();
  attributeAccumulators.forEach((acc, id) => {
    attributeNodes.set(id, {
      id,
      kind: acc.kind,
      label: acc.value,
      value: acc.value,
      contributingProfileIds: acc.contributors.map(c => c.profileId),
      degree: 0,
      confidence: attributeConfidence(acc.contributors.length),
      // Une valeur corroboree par 2+ profils distincts est traitee comme "verifiee" par recoupement.
      status: acc.contributors.length > 1 ? "verifie" : "non_verifie",
      source: attributeSource(acc.contributors.map(c => c.addedBy)),
    });
  });

  const nodes: EntityNode[] = [...personNodes.values(), ...categoryNodes.values(), ...attributeNodes.values()];
  const byId = new Map(nodes.map(n => [n.id, n]));

  const adjacency = new Map<string, AdjacencyEntry[]>();
  for (const edge of edges) {
    byId.get(edge.source)!.degree++;
    byId.get(edge.target)!.degree++;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push({ neighbor: edge.target, edge });
    adjacency.get(edge.target)!.push({ neighbor: edge.source, edge });
  }

  return { nodes, edges, byId, adjacency };
}
