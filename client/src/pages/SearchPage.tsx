
import { useState } from "react";
import { FilterLabels, type SearchFilterType, WantedFilterTypes, WantedFilterLabels, WantedFilterToApiParam, type WantedFilterType } from "@shared/schema";
import { usePerformSearch, useSearchQuota, useLeakosintQuota, useBreachSearch, useLeakosintSearch, SearchLimitError } from "@/hooks/use-search";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Braces,
  User,
  Mail,
  MapPin,
  Phone,
  Globe,
  Hash,
  Calendar,
  CreditCard,
  FileText,
  Database,
  Check,
  Plus,
  X,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const FILTER_ICONS: Partial<Record<SearchFilterType, typeof User>> = {
  username: User,
  displayName: User,
  lastName: User,
  firstName: User,
  email: Mail,
  address: MapPin,
  ipAddress: Globe,
  macAddress: Hash,
  phone: Phone,
  ssn: FileText,
  dob: Calendar,
  yob: Calendar,
  iban: CreditCard,
  bic: CreditCard,
  discordId: Hash,
  fivemLicense: Hash,
  gender: User,
  hashedPassword: Hash,
  password: Hash,
  vin: Hash,
};

const FILTER_PLACEHOLDERS: Partial<Record<SearchFilterType, string>> = {
  username: "ex: jean_dupont",
  displayName: "ex: Jean Dupont",
  lastName: "ex: Dupont",
  firstName: "ex: Jean",
  email: "ex: nom@domaine.com",
  address: "ex: 12 rue de la Paix, Paris",
  ipAddress: "ex: 192.168.1.1",
  macAddress: "ex: AA:BB:CC:DD:EE:FF",
  phone: "ex: 0612345678 ou +33612345678",
  ssn: "ex: 1 85 05 78 006 084 36",
  dob: "ex: 05/10/1964",
  yob: "ex: 1964",
  iban: "ex: FR76 1234 5678 9012 3456 7890 123",
  bic: "ex: BNPAFRPP",
  discordId: "ex: 123456789012345678",
  fivemLicense: "ex: license:abc123def456",
  gender: "ex: M ou F",
  hashedPassword: "ex: 5f4dcc3b5aa765d61d8327deb882cf99",
  password: "ex: motdepasse123",
  vin: "ex: AA-123-BB ou WF0XXXGCDX1234567",
};

const FILTER_VALIDATORS: Partial<Record<SearchFilterType, { test: (v: string) => boolean; message: string }>> = {
  email: {
    test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: "L'email doit contenir un @ et un nom de domaine (ex: nom@domaine.com)",
  },
  ipAddress: {
    test: (v) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v),
    message: "L'adresse IP doit etre au format X.X.X.X (ex: 192.168.1.1)",
  },
  macAddress: {
    test: (v) => /^([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}$/.test(v),
    message: "L'adresse MAC doit etre au format AA:BB:CC:DD:EE:FF",
  },
  phone: {
    test: (v) => /^(\+?\d[\d\s\-().]{6,})$/.test(v.replace(/\s/g, "")),
    message: "Le numero doit contenir au moins 7 chiffres (ex: 0612345678)",
  },
  vin: {
    test: (v) => /^[A-Z]{2}[\s-]?\d{3}[\s-]?[A-Z]{2}$/i.test(v) || /^[A-HJ-NPR-Z0-9]{17}$/i.test(v) || v.length >= 3,
    message: "Entrez une plaque (AA-123-BB) ou un VIN (17 caracteres)",
  },
  discordId: {
    test: (v) => /^\d{15,20}$/.test(v),
    message: "L'ID Discord doit contenir 15 a 20 chiffres",
  },
  ssn: {
    test: (v) => /^\d[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{2}$/.test(v.replace(/\s/g, "")) || v.replace(/\s/g, "").length >= 5,
    message: "Le NIR doit contenir 13 chiffres + 2 cles",
  },
  yob: {
    test: (v) => /^\d{4}$/.test(v) && parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear(),
    message: "L'annee doit etre entre 1900 et aujourd'hui (ex: 1964)",
  },
  iban: {
    test: (v) => v.replace(/\s/g, "").length >= 15,
    message: "L'IBAN doit contenir au moins 15 caracteres",
  },
  bic: {
    test: (v) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(v),
    message: "Le BIC doit etre au format BNPAFRPP (8 ou 11 caracteres)",
  },
};

const FIELD_ICON_MAP: Record<string, typeof User> = {
  nom: User, name: User, last_name: User, lastname: User, surname: User,
  prenom: User, first_name: User, firstname: User, displayname: User,
  email: Mail, mail: Mail,
  adresse: MapPin, address: MapPin, rue: MapPin, street: MapPin,
  ville: Globe, city: Globe, pays: Globe, country: Globe,
  code_postal: Hash, zip: Hash, zipcode: Hash, postal: Hash, postcode: Hash,
  telephone: Phone, phone: Phone, tel: Phone, mobile: Phone,
  date_naissance: Calendar, birthday: Calendar, dob: Calendar, birth: Calendar, date: Calendar,
  bday: Calendar, regdate: Calendar, lastactive: Calendar,
  iban: CreditCard, credit_card: CreditCard, card: CreditCard,
  ssn: FileText, id: Hash, username: User, pseudo: User,
  discord: Hash, ip: Globe, mac: Hash,
  source: Database, _source: Database,
  identifiant: User, password: ShieldAlert, hash: Hash,
  civilite: User, bic: CreditCard, url: Globe, vin: Hash,
  product: FileText, description: FileText, status: FileText,
  donnee: FileText, champ_1: FileText, champ_2: FileText, champ_3: FileText,
  nom_complet: User, matricule: Hash, organisme: FileText,
  situation: FileText, allocataire: User, qualite: FileText,
  boursier: FileText, code_insee: Hash, id_psp: Hash,
  identifiant_interne: Hash, cplt_adresse: MapPin,
  nom_adresse_postale: MapPin,
  offre: FileText, offre_detail: FileText, prix_offre: CreditCard,
  freebox_id: Hash, statut: FileText, statut_interne: FileText,
  date_activation: Calendar, date_activation_ligne: Calendar,
  date_creation: Calendar, date_modification: Calendar,
};

function getFieldIcon(fieldName: string) {
  const key = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  return FIELD_ICON_MAP[key] || FileText;
}

function getFieldColorVar(fieldName: string): string {
  const key = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  if (["nom", "name", "last_name", "lastname", "surname", "prenom", "first_name", "firstname", "username", "pseudo", "identifiant", "displayname", "civilite", "nom_complet", "allocataire"].includes(key))
    return "--field-person";
  if (["email", "mail"].includes(key))
    return "--field-email";
  if (["adresse", "address", "rue", "street", "ville", "city", "pays", "country", "ip", "postcode", "cplt_adresse", "nom_adresse_postale"].includes(key))
    return "--field-location";
  if (["telephone", "phone", "tel", "mobile"].includes(key))
    return "--field-phone";
  if (["code_postal", "zip", "zipcode", "postal", "id", "discord", "mac", "hash", "_source", "code_insee", "matricule", "id_psp", "identifiant_interne"].includes(key))
    return "--field-id";
  if (["date_naissance", "birthday", "dob", "birth", "date", "bday", "regdate", "lastactive", "date_activation", "date_activation_ligne", "date_creation", "date_modification"].includes(key))
    return "--field-date";
  if (["iban", "credit_card", "card", "ssn", "prix_offre"].includes(key))
    return "--field-finance";
  if (["password"].includes(key))
    return "--field-person";
  return "--primary";
}

function getFieldLabel(fieldName: string): string {
  const key = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  const labels: Record<string, string> = {
    nom: "Nom", name: "Nom", last_name: "Nom", lastname: "Nom", surname: "Nom",
    prenom: "Prenom", first_name: "Prenom", firstname: "Prenom", displayname: "Nom d'affichage",
    email: "Email", mail: "Email",
    adresse: "Adresse", address: "Adresse", rue: "Rue", street: "Rue",
    ville: "Ville", city: "Ville", pays: "Pays", country: "Pays",
    code_postal: "Code postal", zip: "Code postal", zipcode: "Code postal", postal: "Code postal", postcode: "Code postal",
    telephone: "Telephone", phone: "Telephone", tel: "Telephone", mobile: "Mobile",
    date_naissance: "Date naissance", birthday: "Date naissance", dob: "Date naissance", birth: "Naissance",
    bday: "Date naissance", date: "Date", regdate: "Inscription", lastactive: "Derniere activite",
    iban: "IBAN", credit_card: "Carte", card: "Carte",
    ssn: "N Secu", id: "ID", username: "Pseudo", pseudo: "Pseudo",
    discord: "Discord", ip: "IP", mac: "MAC",
    identifiant: "Identifiant", password: "Mot de passe", hash: "Hash",
    civilite: "Civilite", bic: "BIC", url: "URL", vin: "VIN",
    product: "Produit", description: "Description", status: "Statut",
    donnee: "Donnee", champ_1: "Champ 1", champ_2: "Champ 2", champ_3: "Champ 3",
    champ_4: "Champ 4", champ_5: "Champ 5", champ_6: "Champ 6",
    nom_complet: "Nom complet", matricule: "Matricule", organisme: "Organisme",
    situation: "Situation", allocataire: "Allocataire", qualite: "Qualite",
    boursier: "Boursier", code_insee: "Code INSEE", id_psp: "ID PSP",
    identifiant_interne: "ID interne", cplt_adresse: "Complement adresse",
    nom_adresse_postale: "Adresse postale",
    offre: "Offre", offre_detail: "Detail offre", prix_offre: "Prix offre",
    freebox_id: "Freebox ID", statut: "Statut", statut_interne: "Statut interne",
    date_activation: "Date activation", date_activation_ligne: "Activation ligne",
    date_creation: "Date creation", date_modification: "Date modification",
  };
  return labels[key] || fieldName.replace(/_/g, " ");
}

const BREACH_FIELDS = [
  { value: "email", label: "Email" },
  { value: "username", label: "Nom d'utilisateur" },
  { value: "name", label: "Nom" },
  { value: "phone", label: "Telephone" },
  { value: "ip", label: "Adresse IP" },
  { value: "password", label: "Password" },
  { value: "domain", label: "Domaine" },
  { value: "discordid", label: "Discord ID" },
  { value: "steamid", label: "Steam ID" },
  { value: "uuid", label: "UUID" },
];

interface CriterionRow {
  id: string;
  type: SearchFilterType;
  value: string;
}

const HIDDEN_FIELDS = new Set(["_source", "_raw", "rownum", "Rownum", "line", "Line", "content", "Content"]);
const FIELD_PRIORITY: Record<string, number> = {
  email: 1, mail: 1,
  identifiant: 2, username: 2, pseudo: 2,
  nom: 3, name: 3, last_name: 3, lastname: 3,
  prenom: 4, first_name: 4, firstname: 4,
  password: 5, hash: 6,
  telephone: 7, phone: 7, tel: 7,
  ip: 8,
  source: 99,
};

function ResultCard({
  row,
  index,
  globalIndex,
}: {
  row: Record<string, unknown>;
  index: number;
  globalIndex: number;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const entries = Object.entries(row);
  const rawLine = row["_raw"] as string | undefined;

  const visibleFields = entries
    .filter(([k]) => !HIDDEN_FIELDS.has(k))
    .sort(([a], [b]) => {
      const pa = FIELD_PRIORITY[a.toLowerCase()] ?? 50;
      const pb = FIELD_PRIORITY[b.toLowerCase()] ?? 50;
      return pa - pb;
    });

  const sourceField = entries.find(([k]) => k.toLowerCase() === "source");
  const dbSource = row["_source"] as string | undefined;
  const sourceText = sourceField ? String(sourceField[1]) : (dbSource || "");

  const handleCopy = () => {
    const text = rawLine || visibleFields
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copie !" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJSON = () => {
    const clean = Object.fromEntries(visibleFields);
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    toast({ title: "JSON copie !" });
  };

  let dataFields = visibleFields.filter(([k]) => k.toLowerCase() !== "source");
  if (dataFields.length === 0 && rawLine) {
    dataFields = [["donnee", rawLine]];
  }

  const titleField = visibleFields.find(([k]) => {
    const key = k.toLowerCase();
    return ["email", "mail", "identifiant", "username", "nom", "name", "last_name", "lastname", "surname"].includes(key);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="overflow-visible" data-testid={`card-result-${globalIndex}`}>
        <div className="flex items-center justify-between gap-4 p-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-secondary text-sm font-bold text-muted-foreground">
              {globalIndex + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate" data-testid={`text-result-title-${globalIndex}`}>
                {titleField ? String(titleField[1]) : `Resultat ${globalIndex + 1}`}
              </p>
              {sourceText && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{sourceText}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              data-testid={`button-copy-${globalIndex}`}
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJSON}
              data-testid={`button-json-${globalIndex}`}
            >
              <Braces className="w-3.5 h-3.5 mr-1" />
              JSON
            </Button>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {dataFields.map(([col, val]) => {
            const Icon = getFieldIcon(col);
            const cssVar = getFieldColorVar(col);
            return (
              <div key={col} className="flex items-start gap-3" data-testid={`field-${col}-${globalIndex}`}>
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    color: `hsl(var(${cssVar}))`,
                    backgroundColor: `hsl(var(${cssVar}) / 0.12)`,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{getFieldLabel(col)}</p>
                  <p className="text-sm font-medium text-foreground break-all leading-tight">{String(val ?? "")}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

let nextCriterionId = 1;

export default function SearchPage() {
  const { toast } = useToast();
  const { getAccessToken } = useAuth();
  const searchMutation = usePerformSearch(getAccessToken);
  const breachMutation = useBreachSearch(getAccessToken);
  const leakosintMutation = useLeakosintSearch(getAccessToken);
  const quotaQuery = useSearchQuota(getAccessToken);
  const leakosintQuotaQuery = useLeakosintQuota(getAccessToken);
  const [limitReached, setLimitReached] = useState(false);
  const [searchMode, setSearchMode] = useState<"internal" | "external" | "other" | "phone" | "geoip" | "nir" | "wanted">("internal");
  const [wantedResults, setWantedResults] = useState<any[]>([]);
  const [loadingWanted, setLoadingWanted] = useState(false);
  const [blacklistMatch, setBlacklistMatch] = useState<{ blacklisted: boolean } | null>(null);

  const [criteria, setCriteria] = useState<CriterionRow[]>([
    { id: String(nextCriterionId++), type: "username", value: "" },
  ]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [breachTerm, setBreachTerm] = useState("");
  const [breachSelectedFields, setBreachSelectedFields] = useState<string[]>(["email"]);

  const [leakosintTerm, setLeakosintTerm] = useState("");

  const [phoneLookupTerm, setPhoneLookupTerm] = useState("");
  const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
  const [phoneLookupResult, setPhoneLookupResult] = useState<{
    ok: boolean;
    message?: string;
    country?: string;
    type?: "mobile" | "landline" | "voip" | "special";
    region?: string | null;
    operator?: string;
    e164?: string;
  } | null>(null);

  const [nirTerm, setNirTerm] = useState("");
  const [nirLoading, setNirLoading] = useState(false);
  const [nirResult, setNirResult] = useState<{
    ok: boolean;
    message?: string;
    sex?: string;
    birthYear?: number;
    birthMonth?: string;
    birthMonthNum?: number;
    department?: string;
    departmentLabel?: string;
    commune?: string;
    order?: string;
    keyValid?: boolean | null;
    formatted?: string;
  } | null>(null);

  const [geoipTerm, setGeoipTerm] = useState("");
  const [geoipLoading, setGeoipLoading] = useState(false);
  const [geoipResult, setGeoipResult] = useState<{
    ok: boolean;
    message?: string;
    ip?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    regionCode?: string;
    city?: string;
    zip?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
    isp?: string;
    org?: string;
    as?: string;
    proxy?: boolean;
    hosting?: boolean;
  } | null>(null);

  const handleGeoip = async () => {
    if (!geoipTerm.trim()) return;
    const token = getAccessToken();
    if (!token) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setGeoipLoading(true);
    setGeoipResult(null);
    try {
      const res = await fetch("/api/geoip", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ip: geoipTerm.trim() }),
      });
      const data = await res.json();
      setGeoipResult(data);
    } catch {
      setGeoipResult({ ok: false, message: "Erreur de connexion" });
    } finally {
      setGeoipLoading(false);
    }
  };

  const handleNirDecode = async () => {
    if (!nirTerm.trim()) return;
    const token = getAccessToken();
    if (!token) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setNirLoading(true);
    setNirResult(null);
    try {
      const res = await fetch("/api/nir/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ nir: nirTerm.trim() }),
      });
      const data = await res.json();
      setNirResult(data);
    } catch {
      setNirResult({ ok: false, message: "Erreur de connexion" });
    } finally {
      setNirLoading(false);
    }
  };

  const handlePhoneLookup = async () => {
    if (!phoneLookupTerm.trim()) return;
    const token = getAccessToken();
    if (!token) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setPhoneLookupLoading(true);
    setPhoneLookupResult(null);
    try {
      const res = await fetch("/api/phone/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ phone: phoneLookupTerm.trim() }),
      });
      const data = await res.json();
      setPhoneLookupResult(data);
    } catch {
      setPhoneLookupResult({ ok: false, message: "Erreur de connexion" });
    } finally {
      setPhoneLookupLoading(false);
    }
  };

  const filterTypes = Object.keys(FilterLabels) as SearchFilterType[];

  const handleWantedSearch = async () => {
    const filledCriteria = criteria.filter((c) => c.value.trim() !== "");
    if (filledCriteria.length === 0) {
      toast({
        title: "Critères manquants",
        description: "Veuillez entrer au moins un critère de recherche.",
        variant: "destructive",
      });
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setLoadingWanted(true);
    try {
      const params = new URLSearchParams();
      filledCriteria.forEach((c) => {
        const apiParam = WantedFilterToApiParam[c.type as WantedFilterType] || c.type;
        params.append(apiParam, c.value.trim());
      });

      const res = await fetch(`/api/wanted/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWantedResults(await res.json());
      }
    } catch (error) {
      console.error("Wanted search error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les profils Wanted",
        variant: "destructive",
      });
    } finally {
      setLoadingWanted(false);
    }
  };

  const handleInternalSearch = (newPage: number) => {
    const filledCriteria = criteria.filter((c) => c.value.trim() !== "");
    if (filledCriteria.length === 0) {
      toast({
        title: "Criteres manquants",
        description: "Veuillez entrer au moins un critere de recherche.",
        variant: "destructive",
      });
      return;
    }

    setLimitReached(false);
    setPage(newPage);
    searchMutation.mutate(
      {
        criteria: filledCriteria.map((c) => ({ type: c.type, value: c.value.trim() })),
        limit: pageSize,
        offset: newPage * pageSize,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/search-quota"] });
        },
        onError: (err) => {
          if (err instanceof SearchLimitError) {
            setLimitReached(true);
          }
        },
      }
    );
  };

  const internalQuota = quotaQuery.data;
  const internalQuotaFromResponse = searchMutation.data?.quota;
  const internalUsed = internalQuotaFromResponse?.used ?? internalQuota?.used ?? 0;
  const internalLimit = internalQuotaFromResponse?.limit ?? internalQuota?.limit ?? 5;
  const internalTier = internalQuotaFromResponse?.tier ?? internalQuota?.tier ?? "free";
  const internalUnlimited = internalLimit === -1;
  const internalAtLimit = !internalUnlimited && internalUsed >= internalLimit;

  const leakosintQuota = leakosintQuotaQuery.data;
  const leakosintQuotaFromResponse = leakosintMutation.data?.quota;
  const leakosintUsed = leakosintQuotaFromResponse?.used ?? leakosintQuota?.used ?? 0;
  const leakosintLimit = leakosintQuotaFromResponse?.limit ?? leakosintQuota?.limit ?? 0;
  const leakosintTier = leakosintQuotaFromResponse?.tier ?? leakosintQuota?.tier ?? "free";
  const leakosintUnlimited = leakosintLimit === -1;
  const leakosintAtLimit = !leakosintUnlimited && leakosintUsed >= leakosintLimit;

  const isExternalMode = searchMode === "external";
  const displayUsed = isExternalMode ? leakosintUsed : internalUsed;
  const displayLimit = isExternalMode ? leakosintLimit : internalLimit;
  const displayTier = isExternalMode ? leakosintTier : internalTier;
  const isUnlimited = isExternalMode ? leakosintUnlimited : internalUnlimited;
  const atLimit = isExternalMode ? leakosintAtLimit : internalAtLimit;

  const addCriterion = () => {
    const usedTypes = new Set(criteria.map((c) => c.type));
    if (searchMode === "wanted") {
      const available = WantedFilterTypes.find((t) => !usedTypes.has(t)) || WantedFilterTypes[0];
      setCriteria((prev) => [...prev, { id: String(nextCriterionId++), type: available, value: "" }]);
    } else {
      const available = filterTypes.find((t) => !usedTypes.has(t)) || filterTypes[0];
      setCriteria((prev) => [...prev, { id: String(nextCriterionId++), type: available, value: "" }]);
    }
  };

  const removeCriterion = (id: string) => {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCriterion = (id: string, field: "type" | "value", val: string) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const toggleBreachField = (field: string) => {
    setBreachSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleBreachSearch = () => {
    if (!breachTerm.trim()) {
      toast({
        title: "Terme manquant",
        description: "Veuillez entrer un terme de recherche pour la recherche externe.",
        variant: "destructive",
      });
      return;
    }
    if (breachSelectedFields.length === 0) {
      toast({
        title: "Champs manquants",
        description: "Veuillez selectionner au moins un champ de recherche.",
        variant: "destructive",
      });
      return;
    }

    setLimitReached(false);
    breachMutation.mutate(
      {
        term: breachTerm.trim(),
        fields: breachSelectedFields,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/search-quota"] });
        },
        onError: (err) => {
          if (err instanceof SearchLimitError) {
            setLimitReached(true);
          }
        },
      }
    );
  };

  const handleLeakosintSearch = () => {
    if (!leakosintTerm.trim()) {
      toast({
        title: "Terme manquant",
        description: "Veuillez entrer un terme de recherche.",
        variant: "destructive",
      });
      return;
    }

    setLimitReached(false);
    leakosintMutation.mutate(
      {
        request: leakosintTerm.trim(),
        limit: 100,
        lang: "en",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/leakosint-quota"] });
        },
        onError: (err) => {
          if (err instanceof SearchLimitError) {
            setLimitReached(true);
          } else {
            toast({
              title: "Erreur de recherche",
              description: err.message || "Le service est temporairement indisponible. Reessayez plus tard.",
              variant: "destructive",
            });
          }
        },
      }
    );
  };

  const handleSearch = (newPage = 0) => {
    const filledCriteria = criteria.filter((c) => c.value.trim());
    if (filledCriteria.length === 0) {
      toast({
        title: "Criteres manquants",
        description: "Veuillez remplir au moins un critere de recherche.",
        variant: "destructive",
      });
      return;
    }

    for (const c of filledCriteria) {
      const validator = FILTER_VALIDATORS[c.type];
      if (validator && !validator.test(c.value.trim())) {
        toast({
          title: `Format invalide — ${FilterLabels[c.type]}`,
          description: validator.message,
          variant: "destructive",
        });
        return;
      }
    }

    setLimitReached(false);
    setPage(newPage);
    setBlacklistMatch(null);

    const searchValues = filledCriteria.map((c) => c.value.trim()).filter(Boolean);
    const token = getAccessToken();
    if (token && searchValues.length > 0) {
      fetch("/api/blacklist/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ values: searchValues }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setBlacklistMatch(data); })
        .catch(() => {});
    }

    searchMutation.mutate(
      {
        criteria: filledCriteria.map((c) => ({ type: c.type, value: c.value.trim() })),
        limit: pageSize,
        offset: newPage * pageSize,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/search-quota"] });
        },
        onError: (err) => {
          if (err instanceof SearchLimitError) {
            setLimitReached(true);
          }
        },
      }
    );
  };

  return (
    <main className="relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <div className="relative container max-w-5xl mx-auto px-4 py-12 space-y-12">
        <section className="text-center space-y-4 max-w-2xl mx-auto mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight leading-[1.1]"
          >
            Recherche Intelligente de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              Donnees Sensibles
            </span>
          </motion.h1>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <Button
            variant={searchMode === "internal" ? "default" : "outline"}
            onClick={() => {
              setSearchMode("internal");
              if (searchMode === "wanted") setCriteria([{ id: String(nextCriterionId++), type: "username", value: "" }]);
            }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-internal"
          >
            <Sparkles className="w-4 h-4" />
            Recherche par Critères
          </Button>
          <Button
            variant={searchMode === "external" ? "default" : "outline"}
            onClick={() => setSearchMode("external")}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-external"
          >
            <Globe className="w-4 h-4" />
            Recherche Global
          </Button>
          <Button
            variant={searchMode === "other" ? "default" : "outline"}
            onClick={() => setSearchMode("other")}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-other"
          >
            <Database className="w-4 h-4" />
            Autres Sources
          </Button>
          <Button
            variant={searchMode === "phone" ? "default" : "outline"}
            onClick={() => setSearchMode("phone")}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-phone"
          >
            <Phone className="w-4 h-4" />
            Lookup Operateur
          </Button>
          <Button
            variant={searchMode === "geoip" ? "default" : "outline"}
            onClick={() => setSearchMode("geoip")}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-geoip"
          >
            <MapPin className="w-4 h-4" />
            GeoIP
          </Button>
          <Button
            variant={searchMode === "nir" ? "default" : "outline"}
            onClick={() => setSearchMode("nir")}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-nir"
          >
            <Hash className="w-4 h-4" />
            Decodeur NIR
          </Button>
          <Button
            variant={searchMode === "wanted" ? "default" : "outline"}
            onClick={() => {
              setSearchMode("wanted");
              setCriteria([{ id: String(nextCriterionId++), type: "nom", value: "" }]);
            }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-wanted"
          >
            <ShieldAlert className="w-4 h-4" />
            Wanted
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {searchMode === "internal" && (
            <motion.div
              key="internal"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">Recherche par Critères</h2>
                </div>
                <Button
                  data-testid="button-add-criterion"
                  variant="outline"
                  size="sm"
                  onClick={addCriterion}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un filtre
                </Button>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {criteria.map((criterion, idx) => {
                    const IconComp = FILTER_ICONS[criterion.type] || FileText;
                    return (
                      <motion.div
                        key={criterion.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="group relative"
                      >
                        <Card className="p-3 bg-secondary/30 border-border/50">
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div
                              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary"
                            >
                              <IconComp className="w-4 h-4" />
                            </div>
                            
                            <div className="w-full sm:w-[220px]">
                              <Select
                                value={criterion.type}
                                onValueChange={(val) => updateCriterion(criterion.id, "type", val)}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {filterTypes.map((ft) => (
                                    <SelectItem key={ft} value={ft}>
                                      {FilterLabels[ft]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex-1 w-full relative">
                              <Input
                                data-testid={`input-criterion-value-${criterion.id}`}
                                placeholder={FILTER_PLACEHOLDERS[criterion.type] || "Entrez une valeur..."}
                                value={criterion.value}
                                onChange={(e) => updateCriterion(criterion.id, "value", e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSearch(0);
                                }}
                                className="bg-background pr-10"
                              />
                            </div>

                            {criteria.length > 1 && (
                              <Button
                                data-testid={`button-remove-criterion-${criterion.id}`}
                                variant="ghost"
                                size="icon"
                                className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeCriterion(criterion.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-7 bg-primary/5 text-primary border-primary/20 gap-1.5 font-medium">
                    <Search className="w-3.5 h-3.5" />
                    {isUnlimited ? `Illimité (${displayTier.toUpperCase()})` : `${displayLimit - displayUsed} recherches restantes`}
                  </Badge>
                </div>

                <Button
                  data-testid="button-search"
                  onClick={() => handleSearch(0)}
                  disabled={searchMutation.isPending || !criteria.some((c) => c.value.trim()) || atLimit}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-lg shadow-primary/25"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Rechercher
                </Button>
              </div>
            </motion.div>
          )}

          {searchMode === "external" && (
            <motion.div
              key="external"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Recherche Global</h2>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Terme de recherche</Label>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ color: "hsl(var(--primary))", backgroundColor: "hsl(var(--primary) / 0.1)" }}>
                      <Search className="w-4 h-4" />
                    </div>
                    <Input
                      data-testid="input-leakosint-term"
                      placeholder="Entrez un terme (email, nom, telephone...)..."
                      value={leakosintTerm}
                      onChange={(e) => setLeakosintTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && leakosintLimit !== 0) handleLeakosintSearch(); }}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-leakosint-quota-info">
                    {leakosintUnlimited ? (
                      <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                        <Search className="w-3 h-3" />
                        Illimite ({leakosintTier.toUpperCase()})
                      </Badge>
                    ) : leakosintLimit === 0 ? (
                      <Badge variant="destructive" className="text-xs no-default-hover-elevate no-default-active-elevate">
                        Non disponible ({leakosintTier.toUpperCase()}) - Passez a un plan superieur
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                          {leakosintTier.toUpperCase()}
                        </Badge>
                        <span>{leakosintUsed} / {leakosintLimit} recherches aujourd'hui</span>
                        {leakosintUsed >= leakosintLimit && (
                          <Badge variant="destructive" className="text-xs no-default-hover-elevate no-default-active-elevate">
                            Limite atteinte
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Button
                  data-testid="button-leakosint-check"
                  onClick={handleLeakosintSearch}
                  disabled={leakosintMutation.isPending || !leakosintTerm.trim() || leakosintAtLimit || leakosintLimit === 0}
                  className="w-full gap-2 shadow-lg shadow-primary/25"
                >
                  {leakosintMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {leakosintLimit === 0 ? "Abonnement requis" : "Check"}
                </Button>
              </div>
            </motion.div>
          )}

          {searchMode === "other" && (
            <motion.div
              key="other"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Autres Sources</h2>
              </div>
              <div className="flex justify-center py-12">
                <Card className="p-8 text-center space-y-4 bg-secondary/30 border-dashed border-2 max-w-xs w-full">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Database className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Autres Sources</h3>
                    <Badge variant="outline" className="text-xs uppercase tracking-wider bg-background/50">
                      Soon
                    </Badge>
                  </div>
                </Card>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                  Cette source de donnees sera bientot integree pour elargir vos capacites de recherche.
                </p>
              </div>
            </motion.div>
          )}

          {searchMode === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Lookup Operateur</h2>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  data-testid="input-phone-lookup"
                  placeholder="06 12 34 56 78"
                  value={phoneLookupTerm}
                  onChange={(e) => setPhoneLookupTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                  className="max-w-xs"
                />
                <Button
                  data-testid="button-phone-lookup"
                  onClick={handlePhoneLookup}
                  disabled={phoneLookupLoading || !phoneLookupTerm.trim()}
                >
                  {phoneLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="ml-1.5">Lookup</span>
                </Button>
              </div>

              {phoneLookupResult && (
                <div className="mt-2">
                  {phoneLookupResult.ok ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Type</p>
                        <Badge variant="outline" data-testid="text-phone-type">
                          {phoneLookupResult.type === "mobile" ? "Mobile" : phoneLookupResult.type === "voip" ? "VoIP" : phoneLookupResult.type === "special" ? "Special" : "Fixe"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Pays</p>
                        <p className="text-sm font-medium" data-testid="text-phone-country">{phoneLookupResult.country}</p>
                      </div>
                      {phoneLookupResult.region && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Region</p>
                          <p className="text-sm font-medium" data-testid="text-phone-region">{phoneLookupResult.region}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Numero (E.164)</p>
                        <p className="text-sm font-mono font-medium" data-testid="text-phone-e164">{phoneLookupResult.e164}</p>
                      </div>
                      <div className="sm:col-span-2 md:col-span-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Operateur</p>
                        <p className="text-sm text-muted-foreground italic" data-testid="text-phone-operator">{phoneLookupResult.operator}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Operateur exact necessite une API payante (HLR)</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive" data-testid="text-phone-error">{phoneLookupResult.message}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {searchMode === "geoip" && (
            <motion.div
              key="geoip"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">GeoIP Lookup</h2>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  data-testid="input-geoip"
                  placeholder="8.8.8.8"
                  value={geoipTerm}
                  onChange={(e) => setGeoipTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGeoip()}
                  className="max-w-xs"
                />
                <Button
                  data-testid="button-geoip-lookup"
                  onClick={handleGeoip}
                  disabled={geoipLoading || !geoipTerm.trim()}
                >
                  {geoipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="ml-1.5">Lookup</span>
                </Button>
              </div>

              {geoipResult && (
                <div className="mt-2">
                  {geoipResult.ok ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">IP</p>
                        <p className="text-sm font-mono font-medium" data-testid="text-geoip-ip">{geoipResult.ip}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Pays</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-country">{geoipResult.country} ({geoipResult.countryCode})</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Region</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-region">{geoipResult.region}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Ville</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-city">{geoipResult.city}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Code Postal</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-zip">{geoipResult.zip || "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Coordonnees</p>
                        <p className="text-sm font-mono font-medium" data-testid="text-geoip-coords">{geoipResult.lat}, {geoipResult.lon}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Fuseau horaire</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-tz">{geoipResult.timezone}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">FAI</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-isp">{geoipResult.isp}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Organisation</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-org">{geoipResult.org}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">AS</p>
                        <p className="text-sm font-medium" data-testid="text-geoip-as">{geoipResult.as}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Proxy / VPN</p>
                        <Badge variant={geoipResult.proxy ? "destructive" : "outline"} data-testid="text-geoip-proxy">
                          {geoipResult.proxy ? "Oui" : "Non"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Hebergement</p>
                        <Badge variant={geoipResult.hosting ? "secondary" : "outline"} data-testid="text-geoip-hosting">
                          {geoipResult.hosting ? "Oui" : "Non"}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive" data-testid="text-geoip-error">{geoipResult.message}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {searchMode === "wanted" && (() => {
            const canAccessWanted = ["pro", "business", "api", "admin"].includes(internalTier);
            return (
            <motion.div
              key="wanted"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 relative"
            >
              <div className={canAccessWanted ? "" : "blur-sm select-none pointer-events-none"}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight">Recherche par Critères (Wanted)</h2>
                  </div>
                  <Button
                    data-testid="button-add-criterion"
                    variant="outline"
                    size="sm"
                    onClick={addCriterion}
                    className="gap-2"
                    tabIndex={canAccessWanted ? 0 : -1}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un filtre
                  </Button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {criteria.map((criterion, idx) => {
                      const IconComp = FILTER_ICONS[criterion.type] || FileText;
                      return (
                        <motion.div
                          key={criterion.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="group relative"
                        >
                          <Card className="p-3 bg-secondary/30 border-border/50">
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <div
                                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary"
                              >
                                <IconComp className="w-4 h-4" />
                              </div>
                              
                              <div className="w-full sm:w-[220px]">
                                <Select
                                  value={criterion.type}
                                  onValueChange={(val) => updateCriterion(criterion.id, "type", val)}
                                >
                                  <SelectTrigger className="bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WantedFilterTypes.map((ft) => (
                                      <SelectItem key={ft} value={ft}>
                                        {WantedFilterLabels[ft]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex-1 w-full relative">
                                <Input
                                  data-testid={`input-criterion-value-${criterion.id}`}
                                  placeholder={WantedFilterLabels[criterion.type as WantedFilterType] ? `Rechercher par ${WantedFilterLabels[criterion.type as WantedFilterType]?.toLowerCase()}...` : "Entrez une valeur..."}
                                  value={criterion.value}
                                  onChange={(e) => updateCriterion(criterion.id, "value", e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleWantedSearch();
                                  }}
                                  className="bg-background pr-10"
                                />
                              </div>

                              {criteria.length > 1 && (
                                <Button
                                  data-testid={`button-remove-criterion-${criterion.id}`}
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeCriterion(criterion.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <Button
                  data-testid="button-search"
                  onClick={() => handleSearch(0)}
                  disabled={loadingWanted || !criteria.some((c) => c.value.trim())}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-lg shadow-primary/25 mt-6"
                  tabIndex={canAccessWanted ? 0 : -1}
                >
                  {loadingWanted ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Rechercher
                </Button>
              </div>

              {!canAccessWanted && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl bg-background/30" data-testid="wanted-upgrade-overlay">
                  <div className="text-center space-y-3 p-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold">Abonnement PRO requis</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Le moteur de recherche Wanted est disponible a partir de l'abonnement PRO ou superieur.
                    </p>
                    <Link href="/pricing">
                      <Button className="mt-2 gap-2" data-testid="button-upgrade-wanted">
                        Voir les abonnements
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
            );
          })()}

          {searchMode === "nir" && (
            <motion.div
              key="nir"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <Hash className="w-3.5 h-3.5" />
                  Decodeur NIR
                </Badge>
                <h2 className="text-2xl font-bold">Decodeur de Numero de Securite Sociale</h2>
                <p className="text-sm text-muted-foreground">
                  Analysez un numero NIR pour extraire les informations qu'il contient : sexe, date et lieu de naissance
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Numero NIR</p>
                    <p className="text-xs text-muted-foreground">Entrez un numero de securite sociale a 13 ou 15 chiffres</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    data-testid="input-nir"
                    placeholder="1 85 01 25 123 456 78"
                    value={nirTerm}
                    onChange={(e) => setNirTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNirDecode()}
                    className="max-w-sm font-mono"
                  />
                  <Button
                    data-testid="button-nir-decode"
                    onClick={handleNirDecode}
                    disabled={nirLoading || !nirTerm.trim()}
                  >
                    {nirLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span className="ml-1.5">Decoder le NIR</span>
                  </Button>
                </div>
              </div>

              {nirResult && (
                <div className="mt-2">
                  {nirResult.ok ? (
                    <div className="space-y-4">
                      {nirResult.formatted && (
                        <div className="text-center">
                          <p className="font-mono text-lg font-semibold tracking-wider" data-testid="text-nir-formatted">{nirResult.formatted}</p>
                          {nirResult.keyValid !== null && (
                            <Badge variant={nirResult.keyValid ? "default" : "destructive"} className="mt-1" data-testid="badge-nir-key">
                              {nirResult.keyValid ? "Cle de controle valide" : "Cle de controle invalide"}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Sexe</p>
                          <p className="text-sm font-medium" data-testid="text-nir-sex">{nirResult.sex}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Annee de naissance</p>
                          <p className="text-sm font-medium" data-testid="text-nir-year">{nirResult.birthYear}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Mois de naissance</p>
                          <p className="text-sm font-medium" data-testid="text-nir-month">{nirResult.birthMonth}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Departement</p>
                          <p className="text-sm font-medium" data-testid="text-nir-dept">{nirResult.department} - {nirResult.departmentLabel}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Code commune</p>
                          <p className="text-sm font-mono font-medium" data-testid="text-nir-commune">{nirResult.commune}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Numero d'ordre</p>
                          <p className="text-sm font-mono font-medium" data-testid="text-nir-order">{nirResult.order}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive" data-testid="text-nir-error">{nirResult.message}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {searchMode !== "other" && searchMode !== "phone" && searchMode !== "geoip" && searchMode !== "nir" && (
        <div className="space-y-6 min-h-[400px]">
          {(() => {
            const activeResults = searchMode === "external"
              ? leakosintMutation.data?.results
              : searchMutation.data?.results;
            const activeTotal = searchMode === "external"
              ? leakosintMutation.data?.results?.length
              : searchMutation.data?.total;
            const isLoading = searchMode === "external"
              ? leakosintMutation.isPending
              : searchMutation.isPending;

            return (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Resultats de recherche
                    {activeTotal != null && activeTotal > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeTotal}
                      </Badge>
                    )}
                  </h3>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                      <Loader2 className="w-12 h-12 animate-spin text-primary relative" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">Recherche en cours...</p>
                  </div>
                ) : activeResults && activeResults.length > 0 ? (
                  <div className="relative">
                    {blacklistMatch?.blacklisted && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-md" data-testid="blacklist-overlay">
                        <div className="absolute inset-0 backdrop-blur-lg bg-background/60 rounded-md" />
                        <div className="relative text-center space-y-3 p-8">
                          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
                          <h3 className="text-xl font-bold text-destructive">Utilisateur Blackliste</h3>
                          <p className="text-muted-foreground max-w-md">
                            Cette personne figure dans la blacklist de Discreen. Les informations ne peuvent pas etre affichees car une demande de retrait a ete approuvee.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className={`grid grid-cols-1 gap-4 ${blacklistMatch?.blacklisted ? "pointer-events-none select-none" : ""}`}>
                    {activeResults.map((row, idx) => (
                <ResultCard
                  key={idx}
                  row={row}
                  index={idx}
                  globalIndex={(searchMode === "internal" ? page * pageSize : 0) + idx}
                />
              ))}

                    {searchMode === "wanted" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Résultats Wanted ({wantedResults.length})</h3>
              </div>
              {loadingWanted ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : wantedResults.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Aucun profil wanted correspondant trouvé.
                </Card>
              ) : (
                <div className="space-y-4">
                  {wantedResults.map((profile, i) => (
                    <ResultCard
                      key={profile.id}
                      index={i}
                      globalIndex={i}
                      row={{
                        nom: profile.nom,
                        prenom: profile.prenom,
                        emails: profile.emails?.length > 0 ? profile.emails.join(", ") : profile.email,
                        telephones: profile.phones?.length > 0 ? profile.phones.join(", ") : profile.telephone,
                        adresse: `${profile.adresse || ""} ${profile.codePostal || ""} ${profile.ville || ""}`.trim(),
                        pseudo: profile.pseudo,
                        discord_tag: profile.discord,
                        discord_ids: profile.discordIds?.length > 0 ? profile.discordIds.join(", ") : profile.discordId,
                        ips: profile.ips?.length > 0 ? profile.ips.join(", ") : profile.ip,
                        notes: profile.notes,
                        source: "Base Wanted Admin"
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {searchMode === "internal" && searchMutation.data && (searchMutation.data.total ?? 0) > pageSize && (
                      <div className="flex items-center justify-center gap-2 pt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0}
                          onClick={() => handleSearch(page - 1)}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Precedent
                        </Button>
                        <span className="text-sm font-medium px-4">
                          Page {page + 1} sur {Math.ceil((searchMutation.data.total ?? 0) / pageSize)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(page + 1) * pageSize >= (searchMutation.data.total ?? 0)}
                          onClick={() => handleSearch(page + 1)}
                        >
                          Suivant
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                    </div>
                  </div>
                ) : limitReached ? (
                  <Card className="p-12 text-center space-y-6 border-destructive/20 bg-destructive/5">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-destructive">Limite Atteinte</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Vous avez atteint votre quota de recherche quotidien pour le plan {displayTier.toUpperCase()}.
                        Passez au plan superieur pour continuer vos recherches sans limites.
                      </p>
                    </div>
                    <div className="flex justify-center gap-4">
                      <Link href="/pricing">
                        <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                          Voir les abonnements
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-foreground">Aucun resultat a afficher</p>
                      <p className="text-sm text-muted-foreground">Lancez une recherche pour voir les donnees</p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}
      </div>
    </main>
  );
}
