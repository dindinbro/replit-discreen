import { useState } from "react";
import { FilterLabels, type SearchFilterType, type SearchCriterion } from "@shared/schema";
import { usePerformSearch, useSearchFilters } from "@/hooks/use-search";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  ShieldCheck,
  Loader2,
  Sparkles,
  AlertCircle,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
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
  LayoutGrid,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CategoriesPanel } from "@/components/CategoriesPanel";

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
  gender: User,
  hashedPassword: Hash,
  password: Hash,
  vin: Hash,
};

const FILTER_PLACEHOLDERS: Partial<Record<SearchFilterType, string>> = {
  username: "Entrez nom d'utilisateur...",
  displayName: "Entrez nom d'affichage...",
  lastName: "Entrez nom...",
  firstName: "Entrez prénom...",
  email: "Entrez adresse email...",
  address: "Entrez adresse...",
  ipAddress: "Entrez adresse IP...",
  macAddress: "Entrez adresse MAC...",
  phone: "Entrez numéro de téléphone...",
  ssn: "Entrez numéro de sécurité sociale...",
  dob: "Entrez date de naissance...",
  yob: "Entrez année de naissance...",
  iban: "Entrez IBAN...",
  bic: "Entrez BIC...",
  discordId: "Entrez Discord ID...",
  gender: "Entrez genre...",
  hashedPassword: "Entrez hashed password...",
  password: "Entrez password...",
  vin: "Entrez VIN / plaque...",
};

const FIELD_ICON_MAP: Record<string, typeof User> = {
  nom: User, name: User, last_name: User, lastname: User, surname: User,
  prenom: User, first_name: User, firstname: User,
  email: Mail, mail: Mail,
  adresse: MapPin, address: MapPin, rue: MapPin, street: MapPin,
  ville: Globe, city: Globe, pays: Globe, country: Globe,
  code_postal: Hash, zip: Hash, zipcode: Hash, postal: Hash,
  telephone: Phone, phone: Phone, tel: Phone, mobile: Phone,
  date_naissance: Calendar, birthday: Calendar, dob: Calendar, birth: Calendar, date: Calendar,
  iban: CreditCard, credit_card: CreditCard, card: CreditCard,
  ssn: FileText, id: Hash, username: User, pseudo: User,
  discord: Hash, ip: Globe, mac: Hash,
  source: Database, content: FileText, _source: Database,
};

function getFieldIcon(fieldName: string) {
  const key = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  return FIELD_ICON_MAP[key] || FileText;
}

function getFieldColorVar(fieldName: string): string {
  const key = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  if (["nom", "name", "last_name", "lastname", "surname", "prenom", "first_name", "firstname", "username", "pseudo"].includes(key))
    return "--field-person";
  if (["email", "mail"].includes(key))
    return "--field-email";
  if (["adresse", "address", "rue", "street", "ville", "city", "pays", "country", "ip"].includes(key))
    return "--field-location";
  if (["telephone", "phone", "tel", "mobile"].includes(key))
    return "--field-phone";
  if (["code_postal", "zip", "zipcode", "postal", "id", "discord", "mac", "hash", "_source"].includes(key))
    return "--field-id";
  if (["date_naissance", "birthday", "dob", "birth", "date"].includes(key))
    return "--field-date";
  if (["iban", "credit_card", "card", "ssn"].includes(key))
    return "--field-finance";
  return "--primary";
}

interface CriterionRow {
  id: string;
  type: SearchFilterType;
  value: string;
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

  const titleField = entries.find(([k]) => {
    const key = k.toLowerCase();
    return ["nom", "name", "last_name", "lastname", "surname", "username"].includes(key);
  });
  const subtitleParts: string[] = [];
  const sourceField = entries.find(([k]) => k.toLowerCase() === "source" || k === "_source");
  if (sourceField) subtitleParts.push(String(sourceField[1]));

  const handleCopy = () => {
    const text = entries
      .filter(([k]) => k !== "_source")
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copié !" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJSON = () => {
    const clean = Object.fromEntries(entries.filter(([k]) => k !== "_source"));
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    toast({ title: "JSON copié !" });
  };

  const detailFields = entries.filter(([k]) => k !== "_source");

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
                {titleField ? String(titleField[1]) : `Résultat ${globalIndex + 1}`}
              </p>
              {subtitleParts.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {subtitleParts.join(" - ")}
                </p>
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
          {detailFields.map(([col, val]) => {
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
                  <p className="text-xs text-muted-foreground capitalize">{col.replace(/_/g, " ")}</p>
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

export default function Home() {
  const { toast } = useToast();
  const { user, role, signOut, getAccessToken } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const searchMutation = usePerformSearch(getAccessToken);

  const [criteria, setCriteria] = useState<CriterionRow[]>([
    { id: String(nextCriterionId++), type: "username", value: "" },
  ]);
  const [page, setPage] = useState(0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const pageSize = 20;

  const filterTypes = Object.keys(FilterLabels) as SearchFilterType[];

  const addCriterion = () => {
    const usedTypes = new Set(criteria.map((c) => c.type));
    const available = filterTypes.find((t) => !usedTypes.has(t)) || filterTypes[0];
    setCriteria((prev) => [...prev, { id: String(nextCriterionId++), type: available, value: "" }]);
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

  const handleSearch = (newPage = 0) => {
    const filledCriteria = criteria.filter((c) => c.value.trim());
    if (filledCriteria.length === 0) {
      toast({
        title: "Critères manquants",
        description: "Veuillez remplir au moins un critère de recherche.",
        variant: "destructive",
      });
      return;
    }

    setPage(newPage);
    searchMutation.mutate({
      criteria: filledCriteria.map((c) => ({ type: c.type, value: c.value.trim() })),
      limit: pageSize,
      offset: newPage * pageSize,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto h-16 flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-categories"
              variant="ghost"
              size="icon"
              onClick={() => setCategoriesOpen(true)}
              title="Catégories"
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <div className="bg-primary/10 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Di<span className="text-primary">screen</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              data-testid="button-theme-toggle"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "light" ? "Mode sombre" : "Mode clair"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            <div className="hidden md:flex items-center text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Système Opérationnel
            </div>
            {user && (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[150px]" data-testid="text-user-email">
                  {user.email}
                </span>
                {role === "admin" && (
                  <Link href="/admin">
                    <Button
                      data-testid="button-admin"
                      variant="outline"
                      size="sm"
                      title="Administration"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button
                  data-testid="button-sign-out"
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-12 space-y-12">

        <section className="text-center space-y-4 max-w-2xl mx-auto mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight leading-[1.1]"
          >
            Recherche Intelligente de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              Données Sensibles
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Utilisez des filtres précis pour explorer les bases de données sécurisées. Les résultats proviennent de tous les index disponibles.
          </motion.p>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-6 md:p-8 space-y-6"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Critères de Recherche</h2>
            </div>
            <Button
              data-testid="button-add-criterion"
              variant="outline"
              size="sm"
              onClick={addCriterion}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un filtre
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {criteria.map((criterion) => {
                const IconComp = FILTER_ICONS[criterion.type] || FileText;
                return (
                  <motion.div
                    key={criterion.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Card className="flex-1 flex items-center gap-3 p-3 overflow-visible" data-testid={`criterion-row-${criterion.id}`}>
                      <div
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                          color: `hsl(var(--primary))`,
                          backgroundColor: `hsl(var(--primary) / 0.1)`,
                        }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <Select
                        value={criterion.type}
                        onValueChange={(val) => updateCriterion(criterion.id, "type", val)}
                      >
                        <SelectTrigger className="w-[200px] shrink-0" data-testid={`select-criterion-type-${criterion.id}`}>
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
                      <Input
                        data-testid={`input-criterion-value-${criterion.id}`}
                        placeholder={FILTER_PLACEHOLDERS[criterion.type] || "Entrez une valeur..."}
                        value={criterion.value}
                        onChange={(e) => updateCriterion(criterion.id, "value", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearch(0);
                        }}
                        className="flex-1"
                      />
                    </Card>
                    {criteria.length > 1 && (
                      <Button
                        data-testid={`button-remove-criterion-${criterion.id}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCriterion(criterion.id)}
                        title="Supprimer ce critère"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <Button
            data-testid="button-search"
            onClick={() => handleSearch(0)}
            disabled={searchMutation.isPending || !criteria.some((c) => c.value.trim())}
            className="w-full gap-2 shadow-lg shadow-primary/25"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Rechercher
          </Button>
        </motion.div>

        <div className="space-y-6">
          {searchMutation.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Erreur lors de la recherche</p>
                <p className="text-sm opacity-90">{searchMutation.error.message}</p>
              </div>
            </motion.div>
          )}

          {searchMutation.data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between gap-2 px-2 flex-wrap">
                <h3 className="text-lg font-semibold text-foreground/80" data-testid="text-results-title">
                  Résultats
                </h3>
                {searchMutation.data.total !== null && (
                  <span className="text-sm text-muted-foreground px-3 py-1 bg-secondary rounded-full" data-testid="text-total-count">
                    {searchMutation.data.total} résultat{searchMutation.data.total !== 1 ? "s" : ""} au total
                  </span>
                )}
              </div>

              {searchMutation.data.results.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">Aucun résultat trouvé.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[700px]">
                  <div className="space-y-4 pr-2">
                    {searchMutation.data.results.map((row, idx) => (
                      <ResultCard
                        key={idx}
                        row={row}
                        index={idx}
                        globalIndex={page * pageSize + idx}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}

              {searchMutation.data.total !== null && searchMutation.data.total > pageSize && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0 || searchMutation.isPending}
                    onClick={() => handleSearch(page - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                    Page {page + 1} / {Math.ceil(searchMutation.data.total / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      (page + 1) * pageSize >= searchMutation.data.total || searchMutation.isPending
                    }
                    onClick={() => handleSearch(page + 1)}
                    data-testid="button-next-page"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      <CategoriesPanel open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}
