
import { useState, useEffect } from "react";
import { FilterLabels, type SearchFilterType, WantedFilterTypes, WantedFilterLabels, WantedFilterToApiParam, type WantedFilterType, MainSearchFilterTypes, FivemFilterTypes, FivemFilterLabels } from "@shared/schema";
import { usePerformSearch, useSearchQuota, useLeakosintQuota, useBreachSearch, useLeakosintSearch, SearchLimitError } from "@/hooks/use-search";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Gamepad2,
  RotateCcw,
  Zap,
  FileSearch,
  Eye,
  ExternalLink,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const FILTER_ICONS: Record<string, typeof User> = {
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
  fivemLicense: Gamepad2,
  fivemId: Gamepad2,
  steamId: Gamepad2,
  xbox: Gamepad2,
  live: Gamepad2,
  gender: User,
  hashedPassword: Hash,
  password: Hash,
  vin: Hash,
};

const FILTER_PLACEHOLDERS: Record<string, string> = {
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
  fivemId: "ex: 12345",
  steamId: "ex: steam:1100001xxxxxxxx",
  xbox: "ex: Gamertag123",
  live: "ex: live:123456789",
  gender: "ex: M ou F",
  hashedPassword: "ex: 5f4dcc3b5aa765d61d8327deb882cf99",
  password: "ex: motdepasse123",
  vin: "ex: AA-123-BB ou WF0XXXGCDX1234567",
};

const FILTER_VALIDATORS: Record<string, { test: (v: string) => boolean; message: string }> = {
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
  discord: Hash, discord_id: Hash, ip: Globe, mac: Hash,
  source: Database, _source: Database,
  identifiant: User, password: ShieldAlert, hash: Hash,
  civilite: User, sexe: User, bic: CreditCard, url: Globe, vin: Hash,
  telephone2: Phone, nir: FileText, plaque: Hash,
  complement_adresse: MapPin, complement_ville: MapPin,
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
  const key = fieldName.replace(/^['"]|['"]$/g, "").toLowerCase().replace(/[\s-]/g, "_");
  return FIELD_ICON_MAP[key] || FileText;
}

function getFieldColorVar(fieldName: string): string {
  const key = fieldName.replace(/^['"]|['"]$/g, "").toLowerCase().replace(/[\s-]/g, "_");
  if (["nom", "name", "last_name", "lastname", "surname", "prenom", "first_name", "firstname", "username", "pseudo", "identifiant", "displayname", "civilite", "nom_complet", "allocataire"].includes(key))
    return "--field-person";
  if (["email", "mail"].includes(key))
    return "--field-email";
  if (["adresse", "address", "rue", "street", "ville", "city", "pays", "country", "ip", "postcode", "cplt_adresse", "nom_adresse_postale", "complement_adresse", "complement_ville"].includes(key))
    return "--field-location";
  if (["telephone", "phone", "tel", "mobile", "telephone2"].includes(key))
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
  const key = fieldName.replace(/^['"]|['"]$/g, "").toLowerCase().replace(/[\s-]/g, "_");
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
    civilite: "Civilite", sexe: "Sexe", bic: "BIC", url: "URL", vin: "VIN",
    telephone2: "Telephone 2", nir: "N Secu (NIR)", plaque: "Plaque immat.",
    discord_id: "Discord ID", complement_adresse: "Complement adresse", complement_ville: "Complement ville",
    product: "Produit", description: "Description", status: "Statut",
    license2: "License FiveM", license: "License", steam: "Steam ID", steamid: "Steam ID", steam_id: "Steam ID",
    fivem: "FiveM", xbl: "Xbox Live", live: "Live ID",
    donnee: "Donnee", champ_1: "Champ 1", champ_2: "Champ 2", champ_3: "Champ 3",
    champ_4: "Champ 4", champ_5: "Champ 5", champ_6: "Champ 6",
    total_depense: "Total depense", devise: "Devise", genre: "Genre",
    entreprise: "Entreprise",
    mot_de_passe: "Mot de passe",
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
  type: string;
  value: string;
}

const HIDDEN_FIELDS = new Set(["_source", "_raw", "_advancedSource", "source", "rownum", "Rownum", "line", "Line", "content", "Content"]);
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

function cleanFieldValue(val: unknown): string {
  const s = String(val ?? "");
  const mdLink = s.match(/^\[([^\]]*)\]\(https?:\/\/[^)]*\)$/);
  if (mdLink) return mdLink[1];
  const cleaned = s.replace(/\[([^\]]*)\]\(https?:\/\/[^)]*\)/g, "$1");
  const trimmed = cleaned.replace(/^['"]|['"]$/g, "").trim();
  return trimmed;
}

function cleanFieldName(name: string): string {
  return name.replace(/^['"]|['"]$/g, "").trim();
}

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

  const sourceText = "Discreen";

  const handleCopy = () => {
    const lines = visibleFields
      .filter(([k]) => k.toLowerCase() !== "source")
      .map(([k, v]) => `${cleanFieldName(k)}: ${cleanFieldValue(v)}`);
    lines.push("Source: Discreen");
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast({ title: "Copie !" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJSON = () => {
    const clean = Object.fromEntries(
      visibleFields
        .filter(([k]) => k.toLowerCase() !== "source")
        .map(([k, v]) => [cleanFieldName(k), cleanFieldValue(v)])
    );
    clean["source"] = "Discreen";
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
            <div className="min-w-0 group/title">
              <p className="font-semibold text-foreground truncate" data-testid={`text-result-title-${globalIndex}`}>
                {titleField ? cleanFieldValue(titleField[1]) : `Resultat ${globalIndex + 1}`}
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
                  <p className="text-sm font-medium text-foreground break-all leading-tight">{cleanFieldValue(val)}</p>
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getAccessToken } = useAuth();
  const searchMutation = usePerformSearch(getAccessToken);
  const breachMutation = useBreachSearch(getAccessToken);
  const leakosintMutation = useLeakosintSearch(getAccessToken);
  const quotaQuery = useSearchQuota(getAccessToken);
  const leakosintQuotaQuery = useLeakosintQuota(getAccessToken);
  const [limitReached, setLimitReached] = useState(false);
  const [searchMode, setSearchMode] = useState<"internal" | "external" | "exiftool" | "phone" | "geoip" | "nir" | "wanted" | "fivem" | "xeuledoc" | "sherlock">("internal");
  const [wantedResults, setWantedResults] = useState<any[]>([]);
  const [loadingWanted, setLoadingWanted] = useState(false);
  const [blacklistMatch, setBlacklistMatch] = useState<{ blacklisted: boolean } | null>(null);
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [advancedResults, setAdvancedResults] = useState<Record<string, unknown>[]>([]);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [advancedSearched, setAdvancedSearched] = useState(false);
  const [searchCooldown, setSearchCooldown] = useState(0);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
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

  const [sherlockUsername, setSherlockUsername] = useState("");
  const [sherlockLoading, setSherlockLoading] = useState(false);

  const [exifFile, setExifFile] = useState<File | null>(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [exifResult, setExifResult] = useState<any>(null);
  const [sherlockResult, setSherlockResult] = useState<{
    username?: string;
    found?: number;
    total?: number;
    results?: Array<{ name: string; url: string; found: boolean; category: string }>;
    error?: string;
  } | null>(null);

  const [xeuledocUrl, setXeuledocUrl] = useState("");
  const [xeuledocLoading, setXeuledocLoading] = useState(false);
  const [xeuledocResult, setXeuledocResult] = useState<{
    documentId?: string;
    createdDate?: string;
    modifiedDate?: string;
    publicPermissions?: string[];
    owner?: {
      name?: string;
      email?: string;
      googleId?: string;
      photoLink?: string;
    };
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (searchCooldown <= 0) return;
    const timer = setInterval(() => {
      setSearchCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [searchCooldown]);

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

  const filterTypes = [...MainSearchFilterTypes] as SearchFilterType[];

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
        title: t("search.missingCriteria"),
        description: "Veuillez entrer au moins un critere de recherche.",
        variant: "destructive",
      });
      return;
    }

    setLimitReached(false);
    setPage(newPage);
    searchMutation.mutate(
      {
        criteria: filledCriteria.map((c) => ({ type: c.type as SearchFilterType, value: c.value.trim() })),
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

  const TIER_ORDER: Record<string, number> = { free: 0, vip: 1, pro: 2, business: 3, api: 4, admin: 5 };
  const tierLevel = TIER_ORDER[internalTier] ?? 0;

  const displayUsed = internalUsed;
  const displayLimit = internalLimit;
  const displayTier = internalTier;
  const isUnlimited = internalUnlimited;
  const atLimit = internalAtLimit;

  const addCriterionWithType = (filterType: string) => {
    setCriteria((prev) => [...prev, { id: String(nextCriterionId++), type: filterType, value: "" }]);
  };

  const getAvailableFilters = () => {
    const usedTypes = new Set(criteria.map((c) => c.type));
    if (searchMode === "wanted") {
      return WantedFilterTypes.filter((t) => !usedTypes.has(t));
    } else if (searchMode === "fivem") {
      return FivemFilterTypes.filter((t) => !usedTypes.has(t));
    } else {
      return filterTypes.filter((t) => !usedTypes.has(t));
    }
  };

  const removeCriterion = (id: string) => {
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
    setBlacklistMatch(null);

    const token = getAccessToken();
    if (token && breachTerm.trim().length >= 3) {
      fetch("/api/blacklist/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ values: [breachTerm.trim()] }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setBlacklistMatch(data); })
        .catch(() => {});
    }

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
    setBlacklistMatch(null);

    const token = getAccessToken();
    if (token && leakosintTerm.trim().length >= 3) {
      fetch("/api/blacklist/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ values: [leakosintTerm.trim()] }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setBlacklistMatch(data); })
        .catch(() => {});
    }

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
        title: t("search.missingCriteria"),
        description: "Veuillez remplir au moins un critere de recherche.",
        variant: "destructive",
      });
      return;
    }

    for (const c of filledCriteria) {
      const validator = FILTER_VALIDATORS[c.type];
      if (validator && !validator.test(c.value.trim())) {
        toast({
          title: `Format invalide — ${(FilterLabels as Record<string, string>)[c.type] || c.type}`,
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
        criteria: filledCriteria.map((c) => ({ type: c.type as SearchFilterType, value: c.value.trim() })),
        limit: pageSize,
        offset: newPage * pageSize,
      },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: ["/api/search-quota"] });
          if (data.cooldownSeconds && data.cooldownSeconds > 0) {
            setSearchCooldown(data.cooldownSeconds);
          }
        },
        onError: (err) => {
          if (err instanceof SearchLimitError) {
            if (err.cooldown && err.remainingSeconds) {
              setSearchCooldown(err.remainingSeconds);
            } else {
              setLimitReached(true);
            }
          }
        },
      }
    );

    if (advancedSearch) {
      setAdvancedLoading(true);
      setAdvancedResults([]);
      setAdvancedError(null);
      setAdvancedSearched(true);
      const searchTerm = filledCriteria.map((c) => c.value.trim()).join(" ");
      const token = getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const errors: string[] = [];

      const daltonPromise = fetch("/api/dalton-search", {
        method: "POST",
        headers,
        body: JSON.stringify({ request: searchTerm, limit: 100, lang: "en" }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({ message: "Erreur inconnue" }));
            if (r.status === 429 && err.cooldown) {
              return [];
            } else if (r.status === 429) {
              errors.push(`Source 2: limite atteinte (${err.used || "?"}/${err.limit || "?"})`);
            } else if (r.status === 403) {
              errors.push("Source 2: acces non autorise pour votre abonnement");
            }
            return [];
          }
          const d = await r.json();
          return (d.results || []).map((r: Record<string, unknown>) => ({ ...r, _advancedSource: "DaltonAPI" }));
        })
        .catch(() => []);

      const leakosintPromise = fetch("/api/leakosint-search", {
        method: "POST",
        headers,
        body: JSON.stringify({ request: searchTerm, limit: 100, lang: "en" }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({ message: "Erreur inconnue" }));
            if (r.status === 429) {
              errors.push(`Source 1: limite atteinte (${err.used || "?"}/${err.limit || "?"})`);
            } else if (r.status === 403) {
              errors.push("Source 1: acces non autorise pour votre abonnement");
            }
            return [];
          }
          const d = await r.json();
          return (d.results || []).map((r: Record<string, unknown>) => ({ ...r, _advancedSource: "LeakOSINT" }));
        })
        .catch(() => []);

      Promise.all([daltonPromise, leakosintPromise]).then(([daltonRes, leakRes]) => {
        setAdvancedResults([...daltonRes, ...leakRes]);
        setAdvancedLoading(false);
        if (errors.length > 0) {
          setAdvancedError(errors.join(" | "));
        }
        queryClient.invalidateQueries({ queryKey: ["/api/search-quota"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leakosint-quota"] });
      });
    } else {
      setAdvancedResults([]);
      setAdvancedError(null);
      setAdvancedSearched(false);
    }

  };

  const handleReset = () => {
    setCriteria([]);
    setPage(0);
    setLimitReached(false);
    setBlacklistMatch(null);
    setBreachTerm("");
    setBreachSelectedFields(["email"]);
    setLeakosintTerm("");
    setPhoneLookupTerm("");
    setPhoneLookupResult(null);
    setNirTerm("");
    setNirResult(null);
    setGeoipTerm("");
    setGeoipResult(null);
    setWantedResults([]);
    setAdvancedResults([]);
    setAdvancedLoading(false);
    setAdvancedError(null);
    setAdvancedSearched(false);
    searchMutation.reset();
    breachMutation.reset();
    leakosintMutation.reset();
  };

  const isWantedMode = searchMode === "wanted";
  const isFivemMode = searchMode === "fivem";
  const isXeuledocMode = searchMode === "xeuledoc";
  const isSherlockMode = searchMode === "sherlock";

  const handleSherlockSearch = async () => {
    const u = sherlockUsername.trim().replace(/^@/, "");
    if (!u) return;
    if (!/^[a-zA-Z0-9_.-]{1,40}$/.test(u)) {
      toast({
        title: "Pseudo invalide",
        description: "Utilisez uniquement lettres, chiffres, tirets, points et underscores.",
        variant: "destructive",
      });
      return;
    }
    setSherlockLoading(true);
    setSherlockResult(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch("/api/sherlock", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: u }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSherlockResult({ error: data.message || "Erreur inconnue." });
      } else {
        setSherlockResult(data);
      }
    } catch {
      setSherlockResult({ error: "Erreur de connexion au serveur." });
    } finally {
      setSherlockLoading(false);
    }
  };

  const GOOGLE_DOC_REGEX = /^https:\/\/(docs|drive|slides|sheets|jamboard|script|forms)\.google\.com\/.+/i;

  const handleXeuledocSearch = async () => {
    const url = xeuledocUrl.trim();
    if (!url) return;
    if (!GOOGLE_DOC_REGEX.test(url)) {
      toast({
        title: "Lien invalide",
        description: "Veuillez entrer un lien Google Docs, Slides, Sheets ou Drive valide.",
        variant: "destructive",
      });
      return;
    }
    setXeuledocLoading(true);
    setXeuledocResult(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch("/api/xeuledoc", {
        method: "POST",
        headers,
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setXeuledocResult({ error: data.message || "Erreur inconnue." });
      } else {
        setXeuledocResult(data);
      }
    } catch {
      setXeuledocResult({ error: "Erreur de connexion au serveur." });
    } finally {
      setXeuledocLoading(false);
    }
  };

  return (
    <main className={`relative transition-colors duration-700 ${isWantedMode ? "wanted-atmosphere" : ""} ${isFivemMode ? "fivem-atmosphere" : ""} ${isXeuledocMode ? "xeuledoc-atmosphere" : ""} ${isSherlockMode ? "sherlock-atmosphere" : ""}`}>
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${isWantedMode || isFivemMode || isXeuledocMode || isSherlockMode ? "opacity-0" : "opacity-100"} bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background`} />

      <div className="relative container max-w-5xl mx-auto px-4 py-12 space-y-12">
        <section className="text-center space-y-4 max-w-2xl mx-auto mb-8">
          <motion.h1
            key={isWantedMode ? "wanted-title" : isFivemMode ? "fivem-title" : isXeuledocMode ? "xeuledoc-title" : isSherlockMode ? "sherlock-title" : "normal-title"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight leading-[1.1]"
          >
            {isWantedMode ? (
              <>
                Profils <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                  Wanted
                </span>
              </>
            ) : isFivemMode ? (
              <>
                Recherche <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">
                  FiveM
                </span>
              </>
            ) : isXeuledocMode ? (
              <>
                Google Docs <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
                  OSINT
                </span>
              </>
            ) : isSherlockMode ? (
              <>
                Username <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-violet-400">
                  Sherlock
                </span>
              </>
            ) : (
              <>
                Recherche Intelligente de <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                  Donnees Sensibles
                </span>
              </>
            )}
          </motion.h1>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <Button
            variant={searchMode === "internal" ? "default" : "outline"}
            onClick={() => { setSearchMode("internal"); setCriteria([]); }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-internal"
          >
            <Sparkles className="w-4 h-4" />
            Recherche par Critères
          </Button>
          <Button
            variant={searchMode === "exiftool" ? "default" : "outline"}
            onClick={() => { setSearchMode("exiftool"); setCriteria([]); }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-exiftool"
          >
            <FileSearch className="w-4 h-4" />
            {t("search.tabs.exiftool")}
          </Button>
          <Button
            variant={searchMode === "phone" ? "default" : "outline"}
            onClick={() => { setSearchMode("phone"); setCriteria([]); }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-phone"
          >
            <Phone className="w-4 h-4" />
            Lookup Operateur
          </Button>
          <Button
            variant={searchMode === "geoip" ? "default" : "outline"}
            onClick={() => { setSearchMode("geoip"); setCriteria([]); }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-geoip"
          >
            <MapPin className="w-4 h-4" />
            GeoIP
          </Button>
          <Button
            variant={searchMode === "nir" ? "default" : "outline"}
            onClick={() => { setSearchMode("nir"); setCriteria([]); }}
            className="min-w-[180px] gap-2"
            data-testid="button-mode-nir"
          >
            <Hash className="w-4 h-4" />
            Decodeur NIR
          </Button>
          <Button
            variant={searchMode === "xeuledoc" ? "default" : "outline"}
            onClick={() => {
              if (tierLevel >= 1) {
                setSearchMode("xeuledoc");
                setCriteria([]);
                setXeuledocUrl("");
                setXeuledocResult(null);
              }
            }}
            disabled={tierLevel < 1}
            className={`min-w-[180px] gap-2 ${searchMode === "xeuledoc" ? "bg-blue-600 text-white border-blue-600" : ""} ${tierLevel < 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            data-testid="button-mode-xeuledoc"
          >
            <FileSearch className="w-4 h-4" />
            Google OSINT
            {tierLevel < 1 && <span className="text-[10px] opacity-70">VIP+</span>}
          </Button>
          <Button
            variant={searchMode === "sherlock" ? "default" : "outline"}
            onClick={() => {
              if (tierLevel >= 1) {
                setSearchMode("sherlock");
                setCriteria([]);
                setSherlockUsername("");
                setSherlockResult(null);
              }
            }}
            disabled={tierLevel < 1}
            className={`min-w-[180px] gap-2 ${searchMode === "sherlock" ? "bg-purple-600 text-white border-purple-600" : ""} ${tierLevel < 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            data-testid="button-mode-sherlock"
          >
            <Eye className="w-4 h-4" />
            Sherlock
            {tierLevel < 1 && <span className="text-[10px] opacity-70">VIP+</span>}
          </Button>
          <Button
            variant={searchMode === "fivem" ? "default" : "outline"}
            onClick={() => {
              if (tierLevel >= 1) {
                setSearchMode("fivem");
                setCriteria([]);
              }
            }}
            disabled={tierLevel < 1}
            title={tierLevel < 1 ? "Abonnement VIP minimum requis" : undefined}
            className={`min-w-[180px] gap-2 ${searchMode === "fivem" ? "bg-orange-600 text-white border-orange-600" : ""} ${tierLevel < 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            data-testid="button-mode-fivem"
          >
            <Gamepad2 className="w-4 h-4" />
            FiveM
            {tierLevel < 1 && <span className="text-[10px] ml-1 opacity-70">(VIP+)</span>}
          </Button>
          <Button
            variant={searchMode === "wanted" ? "default" : "outline"}
            onClick={() => {
              if (tierLevel >= 2) {
                setSearchMode("wanted");
                setCriteria([]);
              }
            }}
            disabled={tierLevel < 2}
            title={tierLevel < 2 ? "Abonnement PRO minimum requis" : undefined}
            className={`min-w-[180px] gap-2 ${searchMode === "wanted" ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""} ${tierLevel < 2 ? "opacity-50 cursor-not-allowed" : ""}`}
            data-testid="button-mode-wanted"
          >
            <ShieldAlert className="w-4 h-4" />
            Wanted
            {tierLevel < 2 && <span className="text-[10px] ml-1 opacity-70">(PRO+)</span>}
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
                {getAvailableFilters().length > 0 && (
                  <Select
                    value=""
                    onValueChange={(val) => addCriterionWithType(val)}
                  >
                    <SelectTrigger className="w-auto min-w-[200px] gap-2" data-testid="button-add-criterion">
                      <Plus className="w-4 h-4" />
                      <SelectValue placeholder={t("search.addFilter")} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFilters().map((ft) => {
                        const Icon = FILTER_ICONS[ft] || FileText;
                        return (
                          <SelectItem key={ft} value={ft}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {FilterLabels[ft as SearchFilterType]}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
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
                              <span className="text-sm font-medium text-foreground">
                                {FilterLabels[criterion.type as SearchFilterType]}
                              </span>
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

                            <Button
                              data-testid={`button-remove-criterion-${criterion.id}`}
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => removeCriterion(criterion.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {criteria.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Ajoutez un filtre pour lancer une recherche</p>
                </div>
              )}

              {(() => {
                const advancedTiers = ["pro", "business", "api"];
                const canUseAdvanced = advancedTiers.includes(internalTier);
                return (
                  <label
                    data-testid="toggle-advanced-search"
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-300 select-none ${
                      !canUseAdvanced
                        ? "border-border/30 bg-secondary/10 opacity-60 cursor-not-allowed"
                        : advancedSearch
                          ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10 cursor-pointer"
                          : "border-border/50 bg-secondary/20 hover:border-primary/20 hover:bg-secondary/30 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        !canUseAdvanced
                          ? "bg-secondary text-muted-foreground"
                          : advancedSearch ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                        {canUseAdvanced ? <Zap className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Recherche Discreen Avancee</p>
                        <p className="text-xs text-muted-foreground">
                          {!canUseAdvanced
                            ? "Disponible a partir de l'abonnement PRO"
                            : advancedSearch
                              ? "Active — interroge toutes les sources en parallele"
                              : "Desactivee — recherche dans les bases internes uniquement"}
                        </p>
                      </div>
                    </div>
                    {canUseAdvanced ? (
                      <Switch
                        checked={advancedSearch}
                        onCheckedChange={setAdvancedSearch}
                        data-testid="switch-advanced-search"
                      />
                    ) : (
                      <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
                        PRO+
                      </Badge>
                    )}
                  </label>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-7 bg-primary/5 text-primary border-primary/20 gap-1.5 font-medium">
                    <Search className="w-3.5 h-3.5" />
                    {isUnlimited ? `Illimite (${displayTier.toUpperCase()})` : `${displayLimit - displayUsed} recherches restantes`}
                  </Badge>
                  {advancedSearch && (
                    <Badge variant="outline" className="h-7 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1.5 font-medium">
                      <Zap className="w-3.5 h-3.5" />
                      Mode Avance
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    data-testid="button-search"
                    onClick={() => handleSearch(0)}
                    disabled={(searchMutation.isPending || advancedLoading) || !criteria.some((c) => c.value.trim()) || atLimit || searchCooldown > 0}
                    className={`flex-1 h-11 font-semibold gap-2 shadow-lg ${
                      searchCooldown > 0
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : advancedSearch
                        ? "bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-primary/25"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                    }`}
                  >
                    {(searchMutation.isPending || advancedLoading) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : searchCooldown > 0 ? (
                      <Loader2 className="w-4 h-4" />
                    ) : advancedSearch ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {searchCooldown > 0 ? `${t("search.wait")} ${searchCooldown}s` : advancedSearch ? t("search.advancedSearch") : t("search.searchButton")}
                  </Button>
                  <Button
                    data-testid="button-reset-internal"
                    variant="outline"
                    onClick={handleReset}
                    disabled={searchMutation.isPending || advancedLoading}
                    className="h-11 gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reinitialiser
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {searchMode === "fivem" && (
            <motion.div
              key="fivem"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel-fivem rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-orange-500" />
                  <h2 className="text-xl font-bold tracking-tight">Recherche FiveM</h2>
                </div>
                {getAvailableFilters().length > 0 && (
                  <Select
                    value=""
                    onValueChange={(val) => addCriterionWithType(val)}
                  >
                    <SelectTrigger className="w-auto min-w-[200px] gap-2" data-testid="button-add-fivem-criterion">
                      <Plus className="w-4 h-4" />
                      <SelectValue placeholder={t("search.addFilter")} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFilters().map((ft) => {
                        const Icon = FILTER_ICONS[ft] || FileText;
                        return (
                          <SelectItem key={ft} value={ft}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {FivemFilterLabels[ft as keyof typeof FivemFilterLabels]}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
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
                        <Card className="p-3 bg-orange-500/5 dark:bg-orange-950/20 border-orange-500/10">
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div className="w-full sm:w-[220px]">
                              <span className="text-sm font-medium text-foreground">
                                {FivemFilterLabels[criterion.type as keyof typeof FivemFilterLabels] || FilterLabels[criterion.type as SearchFilterType]}
                              </span>
                            </div>
                            <div className="flex-1 w-full relative">
                              <Input
                                data-testid={`input-fivem-criterion-value-${criterion.id}`}
                                placeholder={FILTER_PLACEHOLDERS[criterion.type] || "Entrez une valeur..."}
                                value={criterion.value}
                                onChange={(e) => updateCriterion(criterion.id, "value", e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSearch(0);
                                }}
                                className="bg-background pr-10"
                              />
                            </div>
                            <Button
                              data-testid={`button-remove-fivem-criterion-${criterion.id}`}
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => removeCriterion(criterion.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {criteria.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-40 text-orange-500" />
                  <p className="text-sm">Ajoutez un filtre pour lancer une recherche FiveM</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-7 bg-orange-500/5 text-orange-500 border-orange-500/20 gap-1.5 font-medium">
                    <Search className="w-3.5 h-3.5" />
                    {isUnlimited ? `Illimite (${displayTier.toUpperCase()})` : `${displayLimit - displayUsed} recherches restantes`}
                  </Badge>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    data-testid="button-fivem-search"
                    onClick={() => handleSearch(0)}
                    disabled={searchMutation.isPending || !criteria.some((c) => c.value.trim()) || atLimit || searchCooldown > 0}
                    className={`flex-1 h-11 font-semibold gap-2 shadow-lg ${searchCooldown > 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-orange-600 text-white shadow-orange-500/25 border-orange-600"}`}
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : searchCooldown > 0 ? (
                      <Loader2 className="w-4 h-4" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {searchCooldown > 0 ? `${t("search.wait")} ${searchCooldown}s` : t("search.searchButton")}
                  </Button>
                  <Button
                    data-testid="button-reset-fivem"
                    variant="outline"
                    onClick={handleReset}
                    disabled={searchMutation.isPending}
                    className="h-11 gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reinitialiser
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {searchMode === "exiftool" && (
            <motion.div
              key="exiftool"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold" data-testid="text-exiftool-title">{t("search.exiftool.title")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t("search.exiftool.description")}</p>

              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/40"
                  onClick={() => document.getElementById("exif-file-input")?.click()}
                  data-testid="dropzone-exiftool"
                >
                  <input
                    id="exif-file-input"
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setExifFile(e.target.files[0]);
                    }}
                    data-testid="input-exif-file"
                  />
                  {exifFile ? (
                    <div className="space-y-2">
                      <FileText className="w-10 h-10 text-primary mx-auto" />
                      <p className="text-sm font-medium">{exifFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(exifFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">{t("search.exiftool.dropzone")}</p>
                      <p className="text-xs text-muted-foreground">{t("search.exiftool.supportedFormats")}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid="button-extract-metadata"
                    onClick={async () => {
                      if (!exifFile) return;
                      setExifLoading(true);
                      setExifResult(null);
                      try {
                        const token = getAccessToken();
                        const formData = new FormData();
                        formData.append("file", exifFile);
                        const res = await fetch("/api/exiftool", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setExifResult(data);
                        } else {
                          toast({ title: data.message || t("common.error"), variant: "destructive" });
                        }
                      } catch {
                        toast({ title: t("search.exiftool.error"), variant: "destructive" });
                      } finally {
                        setExifLoading(false);
                      }
                    }}
                    disabled={exifLoading || !exifFile}
                    className="gap-2"
                  >
                    {exifLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {t("search.exiftool.extract")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setExifFile(null); setExifResult(null); }}
                    disabled={exifLoading}
                    className="gap-2"
                    data-testid="button-reset-exiftool"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t("search.reset")}
                  </Button>
                </div>
              </div>

              {exifResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold" data-testid="text-exif-results-title">{t("search.exiftool.results")}</h3>
                    <Badge variant="outline" data-testid="badge-metadata-count">
                      {exifResult.metadataCount} {t("search.exiftool.fieldsFound")}
                    </Badge>
                  </div>

                  <Card className="p-4 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("search.exiftool.fileName")}:</span>{" "}
                        <span className="font-medium">{exifResult.fileName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("search.exiftool.fileSize")}:</span>{" "}
                        <span className="font-medium">{(exifResult.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("search.exiftool.mimeType")}:</span>{" "}
                        <span className="font-medium">{exifResult.mimeType}</span>
                      </div>
                    </div>
                  </Card>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-exif-metadata">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium w-1/3">{t("search.exiftool.property")}</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("search.exiftool.value")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(exifResult.metadata).map(([key, value]) => (
                          <tr key={key} className="border-b border-border/30">
                            <td className="py-2 px-3 font-medium text-foreground/80">{key}</td>
                            <td className="py-2 px-3 text-foreground/70 break-all font-mono text-xs">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
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
                <Button
                  data-testid="button-reset-phone"
                  variant="outline"
                  onClick={handleReset}
                  disabled={phoneLookupLoading}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reinitialiser
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
                        <p className="text-xs text-muted-foreground">Opérateur d'attribution</p>
                        <p className="text-sm font-medium" data-testid="text-phone-operator">{phoneLookupResult.operator}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Basé sur les préfixes ARCEP — peut différer si le numéro a été porté</p>
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
                <Button
                  data-testid="button-reset-geoip"
                  variant="outline"
                  onClick={handleReset}
                  disabled={geoipLoading}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reinitialiser
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

          {searchMode === "xeuledoc" && (
            <motion.div
              key="xeuledoc"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel-xeuledoc rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">Google Docs OSINT</h2>
              </div>

              <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  Cet outil permet d'extraire les <span className="text-blue-400 font-medium">metadonnees</span> d'un document Google public (Docs, Slides, Sheets, Drive).
                </p>
                <p>
                  Il revele l'<span className="text-blue-400 font-medium">adresse e-mail</span>, le <span className="text-blue-400 font-medium">nom</span> et l'<span className="text-blue-400 font-medium">identifiant Google</span> du proprietaire du document, ainsi que les dates de creation et de derniere modification.
                </p>
                <p className="text-xs opacity-70">
                  Fonctionne uniquement sur les documents partages publiquement (accessible a toute personne disposant du lien).
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Lien Google Document</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    data-testid="input-xeuledoc-url"
                    placeholder="https://docs.google.com/document/d/... ou /forms/d/e/... ou /presentation/d/..."
                    value={xeuledocUrl}
                    onChange={(e) => setXeuledocUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleXeuledocSearch()}
                    className="flex-1 min-w-[300px]"
                  />
                  <Button
                    data-testid="button-xeuledoc-search"
                    onClick={handleXeuledocSearch}
                    disabled={xeuledocLoading || !xeuledocUrl.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  >
                    {xeuledocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="ml-1.5">Analyser</span>
                  </Button>
                  <Button
                    data-testid="button-reset-xeuledoc"
                    variant="outline"
                    onClick={() => { setXeuledocUrl(""); setXeuledocResult(null); }}
                    disabled={xeuledocLoading}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reinitialiser
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptes : Google Docs, Slides, Sheets, Forms, Drive, Drawings, Apps Script, Jamboard
                </p>
              </div>

              {xeuledocResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  {xeuledocResult.error ? (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                      <p className="text-sm text-destructive" data-testid="text-xeuledoc-error">{xeuledocResult.error}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-6 space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-blue-400">Resultats</h3>
                      </div>

                      {xeuledocResult.owner && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Proprietaire</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {xeuledocResult.owner.name && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Nom</p>
                                <p className="text-sm font-medium" data-testid="text-xeuledoc-name">{xeuledocResult.owner.name}</p>
                              </div>
                            )}
                            {xeuledocResult.owner.email && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">E-mail</p>
                                <p className="text-sm font-mono font-medium text-blue-400" data-testid="text-xeuledoc-email">{xeuledocResult.owner.email}</p>
                              </div>
                            )}
                            {xeuledocResult.owner.googleId && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Google ID</p>
                                <p className="text-sm font-mono font-medium" data-testid="text-xeuledoc-gid">{xeuledocResult.owner.googleId}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Document</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {xeuledocResult.documentId && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">ID Document</p>
                              <p className="text-sm font-mono font-medium break-all" data-testid="text-xeuledoc-docid">{xeuledocResult.documentId}</p>
                            </div>
                          )}
                          {xeuledocResult.createdDate && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Date de creation</p>
                              <p className="text-sm font-medium" data-testid="text-xeuledoc-created">
                                {new Date(xeuledocResult.createdDate).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          )}
                          {xeuledocResult.modifiedDate && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Derniere modification</p>
                              <p className="text-sm font-medium" data-testid="text-xeuledoc-modified">
                                {new Date(xeuledocResult.modifiedDate).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          )}
                          {xeuledocResult.publicPermissions && xeuledocResult.publicPermissions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Permissions publiques</p>
                              <div className="flex gap-1 flex-wrap" data-testid="text-xeuledoc-perms">
                                {xeuledocResult.publicPermissions.map((p, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!xeuledocResult.owner && (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">Aucun proprietaire trouve. Le document est peut-etre anonyme ou les permissions ne permettent pas l'extraction.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {searchMode === "sherlock" && (
            <motion.div
              key="sherlock"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel-sherlock rounded-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-semibold">Sherlock — Username OSINT</h2>
              </div>

              <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  Cet outil recherche un <span className="text-purple-400 font-medium">pseudo</span> sur plus de 40 reseaux sociaux et plateformes populaires.
                </p>
                <p>
                  Il identifie sur quels sites le pseudo est <span className="text-purple-400 font-medium">enregistre</span>, avec un lien direct vers chaque profil trouve.
                </p>
                <p className="text-xs opacity-70">
                  Base sur le projet open-source Sherlock. La recherche peut prendre 15-30 secondes.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Nom d'utilisateur</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    data-testid="input-sherlock-username"
                    placeholder="ex: john_doe"
                    value={sherlockUsername}
                    onChange={(e) => setSherlockUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSherlockSearch()}
                    className="max-w-xs"
                  />
                  <Button
                    data-testid="button-sherlock-search"
                    onClick={handleSherlockSearch}
                    disabled={sherlockLoading || !sherlockUsername.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                  >
                    {sherlockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="ml-1.5">{sherlockLoading ? t("search.searching") : t("search.searchButton")}</span>
                  </Button>
                  <Button
                    data-testid="button-reset-sherlock"
                    variant="outline"
                    onClick={() => { setSherlockUsername(""); setSherlockResult(null); }}
                    disabled={sherlockLoading}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reinitialiser
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lettres, chiffres, tirets, points et underscores uniquement. 40 caracteres max.
                </p>
              </div>

              {sherlockLoading && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  <p className="text-sm text-muted-foreground">Analyse de plus de 40 plateformes en cours...</p>
                </div>
              )}

              {sherlockResult && !sherlockLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  {sherlockResult.error ? (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                      <p className="text-sm text-destructive" data-testid="text-sherlock-error">{sherlockResult.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-purple-600 text-white" data-testid="text-sherlock-count">
                          {sherlockResult.found} / {sherlockResult.total} plateformes
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Pseudo <span className="font-mono font-medium text-purple-400">@{sherlockResult.username}</span> trouve sur {sherlockResult.found} site{(sherlockResult.found || 0) > 1 ? "s" : ""}
                        </span>
                      </div>

                      {sherlockResult.results && sherlockResult.results.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {sherlockResult.results.map((site, i) => (
                            <a
                              key={i}
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 transition-colors group"
                              data-testid={`link-sherlock-result-${i}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{site.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{site.category}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Eye className="w-10 h-10 mx-auto mb-3 opacity-40 text-purple-500" />
                          <p className="text-sm">Aucun profil trouve pour ce pseudo.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
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
              className="glass-panel-wanted rounded-2xl p-6 md:p-8 space-y-6 relative"
            >
              <div className={canAccessWanted ? "" : "blur-sm select-none pointer-events-none"}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h2 className="text-xl font-bold tracking-tight">Recherche par Critères (Wanted)</h2>
                  </div>
                  {getAvailableFilters().length > 0 && (
                    <Select
                      value=""
                      onValueChange={(val) => addCriterionWithType(val)}
                    >
                      <SelectTrigger className="w-auto min-w-[200px] gap-2" data-testid="button-add-wanted-criterion" tabIndex={canAccessWanted ? 0 : -1}>
                        <Plus className="w-4 h-4" />
                        <SelectValue placeholder={t("search.addFilter")} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableFilters().map((ft) => (
                          <SelectItem key={ft} value={ft}>
                            {WantedFilterLabels[ft as WantedFilterType]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                          <Card className="p-3 bg-red-500/5 dark:bg-red-950/20 border-red-500/10">
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <div
                                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500"
                              >
                                <IconComp className="w-4 h-4" />
                              </div>
                              
                              <div className="w-full sm:w-[220px]">
                                <span className="text-sm font-medium text-foreground">
                                  {WantedFilterLabels[criterion.type as WantedFilterType]}
                                </span>
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

                              <Button
                                data-testid={`button-remove-criterion-${criterion.id}`}
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={() => removeCriterion(criterion.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {criteria.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Ajoutez un filtre pour lancer une recherche Wanted</p>
                  </div>
                )}

                <div className="flex gap-2 w-full mt-6">
                  <Button
                    data-testid="button-wanted-search"
                    onClick={() => handleWantedSearch()}
                    disabled={loadingWanted || !criteria.some((c) => c.value.trim())}
                    className="flex-1 h-11 bg-red-600 text-white hover:bg-red-700 font-semibold gap-2 shadow-lg shadow-red-500/25 border-red-600"
                    tabIndex={canAccessWanted ? 0 : -1}
                  >
                    {loadingWanted ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Rechercher
                  </Button>
                  <Button
                    data-testid="button-reset-wanted"
                    variant="outline"
                    onClick={handleReset}
                    disabled={loadingWanted}
                    className="h-11 gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reinitialiser
                  </Button>
                </div>
              </div>

              {!canAccessWanted && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl bg-background/30" data-testid="wanted-upgrade-overlay">
                  <div className="text-center space-y-3 p-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-red-500" />
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
                  <Button
                    data-testid="button-reset-nir"
                    variant="outline"
                    onClick={handleReset}
                    disabled={nirLoading}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reinitialiser
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

        {searchMode === "wanted" && (
          <div className="space-y-6 min-h-[400px]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-red-500" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Résultats Wanted</span>
                {wantedResults.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-red-500/10 text-red-500 border-red-500/20">
                    {wantedResults.length}
                  </Badge>
                )}
              </h3>
            </div>

            {loadingWanted ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="w-12 h-12 animate-spin text-red-500 relative" />
                </div>
                <p className="text-muted-foreground animate-pulse">Recherche en cours...</p>
              </div>
            ) : wantedResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
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
            ) : wantedResults.length === 0 && !loadingWanted ? (
              <Card className="p-12 text-center space-y-4 border-dashed border-red-500/20">
                <ShieldAlert className="w-12 h-12 text-red-500/30 mx-auto" />
                <p className="text-muted-foreground">Aucun profil wanted correspondant trouvé. Lancez une recherche pour voir les résultats.</p>
              </Card>
            ) : null}
          </div>
        )}

        {searchMode !== "exiftool" && searchMode !== "phone" && searchMode !== "geoip" && searchMode !== "nir" && searchMode !== "wanted" && searchMode !== "xeuledoc" && searchMode !== "sherlock" && (
        <div className="space-y-6 min-h-[400px]">
          {(() => {
            const baseResults = searchMode === "external"
              ? leakosintMutation.data?.results
              : searchMutation.data?.results;
            const activeResults = (searchMode === "internal" && advancedSearch && advancedResults.length > 0)
              ? [...(baseResults || []), ...advancedResults]
              : baseResults;
            const baseTotal = searchMode === "external"
              ? leakosintMutation.data?.results?.length
              : searchMutation.data?.total;
            const activeTotal = (searchMode === "internal" && advancedSearch && advancedResults.length > 0)
              ? (baseTotal ?? 0) + advancedResults.length
              : baseTotal;
            const isLoading = searchMode === "external"
              ? leakosintMutation.isPending
              : (searchMutation.isPending || advancedLoading);
            const activeError = searchMode === "external"
              ? leakosintMutation.error
              : searchMutation.error;

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

                {advancedSearched && advancedError && !advancedLoading && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-2 text-sm" data-testid="advanced-search-error">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>Sources avancees : {advancedError}</span>
                  </div>
                )}

                {activeError && !isLoading && (
                  <Card className="p-8 text-center space-y-4 border-destructive/30 bg-destructive/5" data-testid="search-error-display">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-destructive">Erreur de recherche</h3>
                      <p className="text-muted-foreground max-w-md mx-auto text-sm">
                        {activeError instanceof SearchLimitError
                          ? `Limite atteinte (${activeError.used}/${activeError.limit}) pour le plan ${activeError.tier.toUpperCase()}.`
                          : activeError.message || "Le service est temporairement indisponible. Reessayez plus tard."}
                      </p>
                    </div>
                  </Card>
                )}

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                      <Loader2 className="w-12 h-12 animate-spin text-primary relative" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">Recherche en cours...</p>
                  </div>
                ) : blacklistMatch?.blacklisted && (!activeResults || activeResults.length === 0) ? (
                  <Card className="p-12 text-center space-y-6 border-destructive/20 bg-destructive/5">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-destructive" data-testid="text-blacklisted-no-results">Utilisateur Blacklisté</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Cette personne figure dans la blacklist de Discreen. Les informations ne peuvent pas etre affichees car une demande de retrait a ete approuvee.
                      </p>
                    </div>
                  </Card>
                ) : activeResults && activeResults.length > 0 ? (
                  <div className="relative">
                    {blacklistMatch?.blacklisted && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-md" data-testid="blacklist-overlay">
                        <div className="absolute inset-0 backdrop-blur-lg bg-background/60 rounded-md" />
                        <div className="relative text-center space-y-3 p-8">
                          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
                          <h3 className="text-xl font-bold text-destructive">Utilisateur Blacklisté</h3>
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

          {(searchMode === "internal" || searchMode === "fivem") && searchMutation.data && (searchMutation.data.total ?? 0) > pageSize && (
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
                      <p className="text-lg font-medium text-foreground">{t("search.noResults")}</p>
                      <p className="text-sm text-muted-foreground">{t("search.startSearchHint")}</p>
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
