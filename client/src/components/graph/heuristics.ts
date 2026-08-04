import type { WantedProfile } from "@shared/schema";
import type { EntityStatus } from "./types";
import { wantedFieldValues } from "./wantedProfileHelpers";

/**
 * Score de confiance et statut affiches sur les noeuds du graphe.
 *
 * IMPORTANT: aucune de ces valeurs n'est stockee en base — le schema
 * wantedProfiles n'a ni colonne "confidence" ni "status". Ce sont des
 * heuristiques calculees a l'affichage, documentees ici pour eviter toute
 * confusion avec une donnee d'enquete verifiee.
 */

const IDENTITY_CHECKLIST: (keyof WantedProfile)[] = ["nom", "prenom", "dateNaissance", "civilite", "ville", "codePostal"];

/** Completude d'un profil (champs identite + presence de chaque categorie d'attribut). */
export function personConfidence(profile: WantedProfile): number {
  const identityFilled = IDENTITY_CHECKLIST.filter(k => !!(profile[k] as string | null)?.toString().trim()).length;
  const attributeCategories: [boolean][] = [
    [wantedFieldValues(profile, "emails").length > 0],
    [wantedFieldValues(profile, "phones").length > 0],
    [wantedFieldValues(profile, "addresses").length > 0],
    [wantedFieldValues(profile, "ips").length > 0],
    [wantedFieldValues(profile, "discordIds").length > 0],
    [!!profile.pseudo],
    [!!profile.plaque],
    [!!profile.iban],
    [!!profile.nir],
  ];
  const attributesFilled = attributeCategories.filter(([present]) => present).length;
  const total = IDENTITY_CHECKLIST.length + attributeCategories.length;
  const ratio = (identityFilled + attributesFilled) / total;
  return Math.round(40 + 59 * ratio);
}

/** Une valeur corroboree par plusieurs profils distincts est plus fiable qu'une valeur isolee. */
export function attributeConfidence(distinctContributingProfiles: number): number {
  return Math.min(60 + (distinctContributingProfiles - 1) * 10, 99);
}

/** Regle unique et volontairement simple: pas de verification croisee d'un role utilisateur. */
export function personStatus(profile: WantedProfile): EntityStatus {
  return profile.addedBy?.trim() ? "verifie" : "non_verifie";
}

export function personSource(profile: WantedProfile): string {
  return profile.addedBy?.trim() || "Discreen";
}

export function attributeSource(contributingAddedBy: (string | null | undefined)[]): string {
  const distinct = Array.from(new Set(contributingAddedBy.map(v => v?.trim()).filter(Boolean))) as string[];
  if (distinct.length === 0) return "Discreen";
  if (distinct.length <= 2) return distinct.join(", ");
  return `${distinct.slice(0, 2).join(", ")} +${distinct.length - 2}`;
}
