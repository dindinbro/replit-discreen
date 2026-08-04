import type { WantedProfile } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

/* Portage tel quel depuis l'ancien WantedGraph.tsx — utilise par WantedPage.tsx
 * et AdminPage.tsx pour l'affichage des fiches, independamment du graphe. */

export function FieldGroup({ icon: Icon, label, values }: { icon: React.ElementType; label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label} <span className="text-muted-foreground/60">({values.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="font-normal text-xs">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

export function wantedFieldValues(profile: WantedProfile, field: "emails" | "phones" | "addresses" | "ips" | "discordIds"): string[] {
  const legacy: Partial<Record<typeof field, string | null | undefined>> = {
    emails: profile.email, phones: profile.telephone,
    addresses: (profile as any).adresse, ips: profile.ip, discordIds: profile.discordId,
  };
  const arr = (profile as any)[field] as string[] | undefined;
  const values = arr?.length ? arr : legacy[field] ? [legacy[field] as string] : [];
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

export function wantedAllValues(profile: WantedProfile): string[] {
  return [
    ...wantedFieldValues(profile, "emails"),
    ...wantedFieldValues(profile, "phones"),
    ...wantedFieldValues(profile, "addresses"),
    ...wantedFieldValues(profile, "ips"),
    ...wantedFieldValues(profile, "discordIds"),
    profile.nir, profile.iban, profile.plaque,
  ].filter(Boolean).map(v => (v as string).trim().toLowerCase());
}

export function wantedProfileLabel(p: WantedProfile): string {
  return `${p.civilite || ""} ${p.prenom || ""} ${p.nom || ""}`.replace(/\s+/g, " ").trim() || p.pseudo || `Profil #${p.id}`;
}

export function wantedInitials(p: WantedProfile): string {
  const label = wantedProfileLabel(p);
  const parts = label.split(" ").filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}
