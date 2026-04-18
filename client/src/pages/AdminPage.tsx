import { useState, useEffect, Component, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, BlacklistRequest, BlacklistEntry, InfoRequest, WantedProfile, InsertWantedProfile, InsertBlacklistEntry, LoginLog, SearchLog, Review, GameLog } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Save,
  Users,
  ShieldAlert,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Snowflake,
  ShieldBan,
  Check,
  X,
  Clock,
  Search,
  UserPlus,
  UserMinus,
  Crosshair,
  FileText,
  ChevronRight,
  ChevronDown,
  Wrench,
  KeyRound,
  Ban,
  Copy,
  Disc3,
  Image,
  Activity,
  Monitor,
  Globe,
  ScanLine,
  Tag,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Gamepad2,
  Zap,
  Bell,
  Sparkles,
  Timer,
  EyeOff,
  Star,
  MessageSquare,
  DatabaseZap,
  Filter,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Menu,
  BarChart3,
  Settings,
  Shield,
  BookOpen,
  VolumeX,
  Volume2,
  Send,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getIconComponent, AVAILABLE_ICONS } from "@/components/CategoriesPanel";

interface UserProfile {
  id: string;
  email: string;
  username?: string | null;
  role: string;
  frozen: boolean;
  created_at: string;
  unique_id?: number;
}

const ROLE_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  admin: { variant: "destructive", label: "Admin" },
  free: { variant: "secondary", label: "Free" },
  vip: { variant: "outline", label: "VIP" },
  pro: { variant: "default", label: "PRO" },
  business: { variant: "default", label: "Business" },
  api: { variant: "outline", label: "API" },
};

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f59e0b", "#ef4444", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1",
];

type AdminTab = "users" | "keys" | "blacklist" | "info" | "wanted" | "dof" | "ipblock" | "logs" | "discounts" | "game-boosts" | "game-logs" | "services" | "notifications" | "search-logs" | "reviews" | "tickets" | "chat";

interface AdminTabDef {
  key: AdminTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Users;
  group: string;
}

interface AdminGroupDef {
  key: string;
  label: string;
  icon: typeof Users;
  color: string;
}

const ADMIN_GROUPS: AdminGroupDef[] = [
  { key: "users",      label: "Utilisateurs",   icon: Users,     color: "text-blue-400" },
  { key: "moderation", label: "Modération",     icon: Shield,    color: "text-red-400" },
  { key: "osint",      label: "OSINT / Data",   icon: BookOpen,  color: "text-amber-400" },
  { key: "logs",       label: "Logs",           icon: BarChart3, color: "text-emerald-400" },
  { key: "community",  label: "Communauté",     icon: MessageSquare, color: "text-purple-400" },
  { key: "game",       label: "Jeu (STING.EXE)",icon: Gamepad2,  color: "text-orange-400" },
  { key: "system",     label: "Système",        icon: Settings,  color: "text-slate-400" },
];

const ADMIN_TABS: AdminTabDef[] = [
  { key: "users",          label: "Comptes utilisateurs",   shortLabel: "Utilisateurs",  description: "Gestion des comptes, rôles et accès",                 icon: Users,       group: "users" },
  { key: "keys",           label: "Clés & Abonnements",     shortLabel: "Clés",          description: "Licences, plans et souscriptions actives",            icon: KeyRound,    group: "users" },
  { key: "blacklist",      label: "Demandes de blacklist",  shortLabel: "Blacklist",     description: "Requêtes de suppression de données",                  icon: ShieldBan,   group: "moderation" },
  { key: "info",           label: "Demandes d'information", shortLabel: "Info req.",     description: "Formulaires de demande d'information reçus",           icon: FileText,    group: "moderation" },
  { key: "ipblock",        label: "IP Blacklist",           shortLabel: "IP Block",      description: "Adresses IP bloquées sur la plateforme",               icon: Ban,         group: "moderation" },
  { key: "wanted",         label: "Profils Wanted",         shortLabel: "Wanted",        description: "Fiches de personnes recherchées",                     icon: Crosshair,   group: "osint" },
  { key: "dof",            label: "D.O.F — Disques",       shortLabel: "DOF",           description: "Gestion des disques optiques forensiques",             icon: Disc3,       group: "osint" },
  { key: "logs",           label: "Logs Connexions",        shortLabel: "Connexions",    description: "Historique des connexions et authentifications",       icon: Activity,    group: "logs" },
  { key: "search-logs",    label: "Logs Recherches",        shortLabel: "Recherches",    description: "Requêtes de recherche effectuées par les utilisateurs", icon: DatabaseZap, group: "logs" },
  { key: "game-logs",      label: "Logs de Jeu",            shortLabel: "Parties",       description: "Scores, crédits et sessions STING.EXE",               icon: BarChart3,   group: "logs" },
  { key: "reviews",        label: "Avis Clients",           shortLabel: "Avis",          description: "Modération des avis et témoignages publics",           icon: Star,        group: "community" },
  { key: "notifications",  label: "Notifications Pop-up",   shortLabel: "Notifs",        description: "Messages d'alerte affichés aux utilisateurs",          icon: Bell,        group: "community" },
  { key: "tickets",        label: "Tickets Support",        shortLabel: "Tickets",       description: "Gestion des demandes d'assistance utilisateurs",       icon: MessageSquare, group: "community" },
  { key: "chat",           label: "Chat Global",            shortLabel: "Chat",          description: "Modération du salon de chat en temps réel",            icon: MessageSquare, group: "community" },
  { key: "game-boosts",    label: "Boosts de Jeu",          shortLabel: "Boosts",        description: "Multiplicateurs de score et avantages temporaires",   icon: Zap,         group: "game" },
  { key: "discounts",      label: "Codes Promo",            shortLabel: "Promo",         description: "Bons de réduction et codes de réduction",             icon: Tag,         group: "game" },
  { key: "services",       label: "Statut des Services",    shortLabel: "Services",      description: "Moniteur de santé des APIs et services externes",     icon: Monitor,     group: "system" },
];

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

function WantedProfileForm({ getAccessToken, editProfile, onEditDone }: { getAccessToken: () => string | null; editProfile?: WantedProfile | null; onEditDone?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const [emails, setEmails] = useState<string[]>([""]);
  const [phones, setPhones] = useState<string[]>([""]);
  const [ips, setIps] = useState<string[]>([""]);
  const [discordIds, setDiscordIds] = useState<string[]>([""]);
  const [addresses, setAddresses] = useState<string[]>([""]);

  const [form, setForm] = useState<Partial<InsertWantedProfile>>({
    nom: "",
    prenom: "",
    adresse: "",
    ville: "",
    codePostal: "",
    civilite: "M.",
    dateNaissance: "",
    pseudo: "",
    discord: "",
    discordId: "",
    password: "",
    iban: "",
    bic: "",
    plaque: "",
    nir: "",
    notes: ""
  });

  const isEdit = !!editProfile;

  useEffect(() => {
    if (editProfile) {
      setForm({
        nom: editProfile.nom || "",
        prenom: editProfile.prenom || "",
        adresse: editProfile.adresse || "",
        ville: editProfile.ville || "",
        codePostal: editProfile.codePostal || "",
        civilite: editProfile.civilite || "M.",
        dateNaissance: editProfile.dateNaissance || "",
        pseudo: editProfile.pseudo || "",
        discord: editProfile.discord || "",
        discordId: editProfile.discordId || "",
        password: editProfile.password || "",
        iban: editProfile.iban || "",
        bic: editProfile.bic || "",
        plaque: editProfile.plaque || "",
        nir: editProfile.nir || "",
        notes: editProfile.notes || "",
      });
      setEmails(editProfile.emails?.length ? editProfile.emails : [editProfile.email || ""]);
      setPhones(editProfile.phones?.length ? editProfile.phones : [editProfile.telephone || ""]);
      setIps(editProfile.ips?.length ? editProfile.ips : [editProfile.ip || ""]);
      setDiscordIds(editProfile.discordIds?.length ? editProfile.discordIds : [editProfile.discordId || ""]);
      setAddresses((editProfile as any).addresses?.length ? (editProfile as any).addresses : [editProfile.adresse || ""]);
    }
  }, [editProfile]);

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, ""]);
  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(prev => prev.filter((_, i) => i !== index));
  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => setter(prev => prev.map((v, i) => i === index ? value : v));

  const resetForm = () => {
    setForm({
      nom: "", prenom: "", adresse: "",
      ville: "", codePostal: "", civilite: "M.", dateNaissance: "",
      pseudo: "", discord: "", discordId: "", password: "", iban: "", bic: "", plaque: "", nir: "", notes: ""
    });
    setEmails([""]);
    setPhones([""]);
    setIps([""]);
    setDiscordIds([""]);
    setAddresses([""]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        emails: emails.filter(Boolean),
        phones: phones.filter(Boolean),
        ips: ips.filter(Boolean),
        discordIds: discordIds.filter(Boolean),
        addresses: addresses.filter(Boolean),
        email: emails[0] || "",
        telephone: phones[0] || "",
        ip: ips[0] || "",
        discordId: discordIds[0] || form.discordId || "",
        adresse: addresses[0] || form.adresse || "",
      };

      const url = isEdit ? `/api/admin/wanted-profiles/${editProfile.id}` : "/api/admin/wanted-profiles";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: isEdit ? "Profil modifie" : "Profil cree", description: isEdit ? "Le profil Wanted a ete mis a jour." : "Le profil Wanted a ete ajoute avec succes." });
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/wanted-profiles"] });
        if (onEditDone) onEditDone();
      } else {
        const err = await res.json();
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const DynamicFields = ({ label, values, setter, placeholder }: any) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" variant="ghost" size="sm" onClick={() => addField(setter)} data-testid={`button-add-${label.toLowerCase()}`}>
          <Plus className="w-3 h-3 mr-1" /> Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {values.map((val: string, i: number) => (
          <div key={i} className="flex gap-2">
            <Input 
              value={val} 
              onChange={e => updateField(setter, i, e.target.value)} 
              placeholder={placeholder}
              data-testid={`input-${label.toLowerCase()}-${i}`}
            />
            {values.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeField(setter, i)} data-testid={`button-remove-${label.toLowerCase()}-${i}`}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      {isEdit && (
        <div className="flex items-center justify-between gap-2 mb-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <span className="font-medium text-sm">Modification du profil #{editProfile.id}</span>
          <Button variant="ghost" size="sm" onClick={() => { resetForm(); onEditDone?.(); }} data-testid="button-cancel-wanted-edit">
            <X className="w-4 h-4 mr-1" /> Annuler
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Civilite</label>
            <Select value={form.civilite || "M."} onValueChange={(v) => setForm(p => ({ ...p, civilite: v }))}>
              <SelectTrigger data-testid="select-civilite">
                <SelectValue placeholder="Civilite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M.">Monsieur (M.)</SelectItem>
                <SelectItem value="Mme">Madame (Mme)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prenom</label>
            <Input value={form.prenom || ""} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Jean" data-testid="input-prenom" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom</label>
            <Input value={form.nom || ""} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Dupont" data-testid="input-nom" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DynamicFields label="Emails" values={emails} setter={setEmails} placeholder="jean.dupont@example.com" />
          <DynamicFields label="Telephones" values={phones} setter={setPhones} placeholder="06 12 34 56 78" />
        </div>

        <DynamicFields label="Adresses" values={addresses} setter={setAddresses} placeholder="123 Rue de la Republique" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Code Postal</label>
            <Input value={form.codePostal || ""} onChange={e => setForm(p => ({ ...p, codePostal: e.target.value }))} placeholder="75001" data-testid="input-code-postal" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ville</label>
            <Input value={form.ville || ""} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} placeholder="Paris" data-testid="input-ville" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de naissance</label>
            <Input value={form.dateNaissance || ""} onChange={e => setForm(p => ({ ...p, dateNaissance: e.target.value }))} placeholder="DD/MM/YYYY" data-testid="input-date-naissance" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DynamicFields label="IPs" values={ips} setter={setIps} placeholder="192.168.1.1" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Pseudo</label>
            <Input value={form.pseudo || ""} onChange={e => setForm(p => ({ ...p, pseudo: e.target.value }))} placeholder="JDupont" data-testid="input-pseudo" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Discord Tag</label>
            <Input value={form.discord || ""} onChange={e => setForm(p => ({ ...p, discord: e.target.value }))} placeholder="jdupont#1234" data-testid="input-discord-tag" />
          </div>
          <DynamicFields label="Discord IDs" values={discordIds} setter={setDiscordIds} placeholder="123456789012345678" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe (fuite)</label>
          <Input value={form.password || ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="********" data-testid="input-password" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">IBAN</label>
            <Input value={form.iban || ""} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} placeholder="FR76..." data-testid="input-iban" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">BIC</label>
            <Input value={form.bic || ""} onChange={e => setForm(p => ({ ...p, bic: e.target.value.toUpperCase() }))} placeholder="BNPAFRPP" data-testid="input-bic" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Plaque d'immatriculation</label>
            <Input value={form.plaque || ""} onChange={e => setForm(p => ({ ...p, plaque: e.target.value.toUpperCase() }))} placeholder="AA-123-BB" data-testid="input-plaque" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">NIR (Securite Sociale)</label>
            <Input value={form.nir || ""} onChange={e => setForm(p => ({ ...p, nir: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="1850175123456" maxLength={15} data-testid="input-nir" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes / Signalement</label>
          <Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Informations complementaires..." className="min-h-[100px]" data-testid="input-notes" />
        </div>

        <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-wanted">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isEdit ? "Sauvegarder les modifications" : "Entrer les informations"}
        </Button>
      </form>
    </Card>
  );
}

function WantedHistorySection({ getAccessToken, onEdit }: { getAccessToken: () => string | null; onEdit: (profile: WantedProfile) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: profiles, isLoading } = useQuery<WantedProfile[]>({
    queryKey: ["/api/admin/wanted-profiles"],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return [];
      const res = await fetch("/api/admin/wanted-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch wanted profiles");
      return res.json();
    },
  });

  const deleteProfile = async (id: number) => {
    const token = getAccessToken();
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/wanted-profiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/wanted-profiles"] });
        toast({ title: "Profil supprime" });
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const filteredProfiles = (profiles || []).filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.nom || "").toLowerCase().includes(q) ||
      (p.prenom || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.pseudo || "").toLowerCase().includes(q) ||
      (p.telephone || "").toLowerCase().includes(q) ||
      (p.discord || "").toLowerCase().includes(q) ||
      (p.ip || "").toLowerCase().includes(q) ||
      (p.discordId || "").toLowerCase().includes(q) ||
      (p.emails || []).some(e => e.toLowerCase().includes(q)) ||
      (p.phones || []).some(ph => ph.toLowerCase().includes(q)) ||
      (p.ips || []).some(ip => ip.toLowerCase().includes(q)) ||
      (p.discordIds || []).some(d => d.toLowerCase().includes(q)) ||
      (p.adresse || "").toLowerCase().includes(q) ||
      ((p as any).addresses || []).some((a: string) => a.toLowerCase().includes(q)) ||
      (p.iban || "").toLowerCase().includes(q) ||
      (p.bic || "").toLowerCase().includes(q) ||
      (p.plaque || "").toLowerCase().includes(q) ||
      (p.nir || "").toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un profil Wanted..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-wanted-search"
        />
      </div>

      {filteredProfiles.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery.trim() ? "Aucun profil correspondant." : "Aucun profil Wanted enregistre."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProfiles.map(profile => (
            <Card key={profile.id} className="p-4" data-testid={`card-wanted-${profile.id}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {profile.civilite} {profile.prenom} {profile.nom}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">#{profile.id}</Badge>
                    {profile.pseudo && <Badge variant="secondary">{profile.pseudo}</Badge>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {(profile.emails?.length ? profile.emails : profile.email ? [profile.email] : []).map((e, i) => (
                      <div key={`email-${i}`}><span className="text-muted-foreground">Email:</span> {e}</div>
                    ))}
                    {(profile.phones?.length ? profile.phones : profile.telephone ? [profile.telephone] : []).map((p, i) => (
                      <div key={`phone-${i}`}><span className="text-muted-foreground">Tel:</span> {p}</div>
                    ))}
                    {(profile.ips?.length ? profile.ips : profile.ip ? [profile.ip] : []).map((ip, i) => (
                      <div key={`ip-${i}`}><span className="text-muted-foreground">IP:</span> {ip}</div>
                    ))}
                    {profile.discord && <div><span className="text-muted-foreground">Discord:</span> {profile.discord}</div>}
                    {(profile.discordIds?.length ? profile.discordIds : profile.discordId ? [profile.discordId] : []).map((d, i) => (
                      <div key={`did-${i}`}><span className="text-muted-foreground">Discord ID:</span> {d}</div>
                    ))}
                    {((profile as any).addresses?.length ? (profile as any).addresses : profile.adresse ? [profile.adresse] : []).map((a: string, i: number) => (
                      <div key={`addr-${i}`} className="col-span-2"><span className="text-muted-foreground">Adresse:</span> {a}</div>
                    ))}
                    {(profile.codePostal || profile.ville) && (
                      <div><span className="text-muted-foreground">Ville:</span> {profile.codePostal} {profile.ville}</div>
                    )}
                    {profile.dateNaissance && <div><span className="text-muted-foreground">Naissance:</span> {profile.dateNaissance}</div>}
                    {profile.iban && <div><span className="text-muted-foreground">IBAN:</span> {profile.iban}</div>}
                    {profile.bic && <div><span className="text-muted-foreground">BIC:</span> {profile.bic}</div>}
                    {profile.plaque && <div><span className="text-muted-foreground">Plaque:</span> {profile.plaque}</div>}
                    {profile.nir && <div><span className="text-muted-foreground">NIR:</span> {profile.nir}</div>}
                    {profile.password && <div><span className="text-muted-foreground">MDP:</span> {profile.password}</div>}
                    {profile.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {profile.notes}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(profile)}
                    title="Modifier"
                    data-testid={`button-edit-wanted-${profile.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteProfile(profile.id)}
                    disabled={deletingId === profile.id}
                    title="Supprimer"
                    data-testid={`button-delete-wanted-${profile.id}`}
                  >
                    {deletingId === profile.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  editCategory,
  getAccessToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory: Category | null;
  getAccessToken: () => string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryFormData>({
    name: "",
    description: "",
    icon: "Folder",
    color: "#10b981",
    sortOrder: 0,
  });

  useEffect(() => {
    if (editCategory) {
      setForm({
        name: editCategory.name,
        description: editCategory.description || "",
        icon: editCategory.icon,
        color: editCategory.color,
        sortOrder: editCategory.sortOrder,
      });
    } else {
      setForm({ name: "", description: "", icon: "Folder", color: "#10b981", sortOrder: 0 });
    }
  }, [editCategory, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const token = getAccessToken();
      if (!token) throw new Error("Non authentifie");

      const url = editCategory
        ? `/api/admin/categories/${editCategory.id}`
        : "/api/admin/categories";
      const method = editCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: editCategory ? "Categorie mise a jour" : "Categorie creee" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    saveMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editCategory ? "Modifier la categorie" : "Nouvelle categorie"}
          </DialogTitle>
          <DialogDescription>
            {editCategory ? "Modifiez les informations de la categorie." : "Ajoutez une nouvelle categorie pour organiser vos bases de donnees."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nom</label>
            <Input
              data-testid="input-category-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Reseaux sociaux"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Input
              data-testid="input-category-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ex: Bases de donnees des reseaux sociaux"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Icone</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_ICONS.map((iconName) => {
                const Icon = getIconComponent(iconName);
                return (
                  <Button
                    key={iconName}
                    type="button"
                    variant={form.icon === iconName ? "default" : "outline"}
                    size="icon"
                    onClick={() => setForm((p) => ({ ...p, icon: iconName }))}
                    title={iconName}
                    data-testid={`button-icon-${iconName}`}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className="w-8 h-8 rounded-md border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? "hsl(var(--foreground))" : "transparent",
                    transform: form.color === c ? "scale(1.15)" : "scale(1)",
                  }}
                  data-testid={`button-color-${c}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ordre d'affichage</label>
            <Input
              data-testid="input-category-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${form.color}18`, color: form.color }}
            >
              {(() => {
                const PreviewIcon = getIconComponent(form.icon);
                return <PreviewIcon className="w-5 h-5" />;
              })()}
            </div>
            <div>
              <p className="font-medium text-sm">{form.name || "Apercu"}</p>
              <p className="text-xs text-muted-foreground">{form.description || "Description..."}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!form.name.trim() || saveMutation.isPending}
              data-testid="button-save-category"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {editCategory ? "Modifier" : "Creer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PAGE_SIZE = 25;

function UsersSection({ getAccessToken, userId }: { getAccessToken: () => string | null; userId: string }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);
  const [gameResetConfirmId, setGameResetConfirmId] = useState<string | null>(null);
  const [gameResetLoadingId, setGameResetLoadingId] = useState<string | null>(null);
  const [gameSetOpenId, setGameSetOpenId] = useState<string | null>(null);
  const [gameSetScore, setGameSetScore] = useState("");
  const [gameSetLoadingId, setGameSetLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setUsers(await res.json());
        } else {
          toast({ title: "Erreur", description: "Impossible de charger les utilisateurs", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, [getAccessToken, toast]);

  const handleRoleChange = (uid: string, newRole: string) => {
    setPendingChanges(prev => ({ ...prev, [uid]: newRole }));
  };

  const saveRole = async (uid: string) => {
    const newRole = pendingChanges[uid];
    if (!newRole) return;
    const token = getAccessToken();
    if (!token) return;
    setSavingId(uid);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: uid, role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
        setPendingChanges(prev => { const next = { ...prev }; delete next[uid]; return next; });
        toast({ title: "Role mis a jour", description: `Role change en "${newRole}"` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de changer le role", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const toggleFreeze = async (uid: string, freeze: boolean) => {
    const token = getAccessToken();
    if (!token) return;
    setFreezingId(uid);
    try {
      const res = await fetch("/api/admin/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: uid, frozen: freeze }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === uid ? { ...u, frozen: freeze } : u));
        toast({ title: freeze ? "Compte gele" : "Compte degele" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de modifier le statut", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setFreezingId(null);
    }
  };

  const deleteUser = async (uid: string) => {
    const token = getAccessToken();
    if (!token) return;
    setDeletingId(uid);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== uid));
        toast({ title: "Compte supprime", description: "L'utilisateur a ete supprime definitivement." });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de supprimer", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const resetGameData = async (uid: string) => {
    const token = getAccessToken();
    if (!token) return;
    setGameResetLoadingId(uid);
    try {
      const res = await fetch(`/api/admin/game/reset/${uid}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Jeu reinitialise", description: "Score et credits remis a zero." });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Echec de la reinitialisation", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setGameResetLoadingId(null);
      setGameResetConfirmId(null);
    }
  };

  const setGameScore = async (uid: string, username: string) => {
    const token = getAccessToken();
    if (!token) return;
    const score = parseInt(gameSetScore, 10);
    if (isNaN(score) || score < 0) {
      toast({ title: "Erreur", description: "Score invalide", variant: "destructive" });
      return;
    }
    setGameSetLoadingId(uid);
    try {
      const res = await fetch(`/api/admin/game/set/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score, username }),
      });
      if (res.ok) {
        toast({ title: "Score defini", description: `Score et credits mis a jour pour ${username}.` });
        setGameSetOpenId(null);
        setGameSetScore("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Echec", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setGameSetLoadingId(null);
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    const displayName = (u.username || u.email.split("@")[0]).toLowerCase();
    const emailPrefix = u.email.split("@")[0].toLowerCase();
    const uid = u.unique_id ? `${u.unique_id}` : u.id.slice(0, 8);
    return displayName.includes(q) || emailPrefix.includes(q) || u.email.toLowerCase().includes(q) || uid.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
            className="pl-9"
            data-testid="input-user-search"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun utilisateur trouve.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map(u => {
            const currentRole = pendingChanges[u.id] || u.role;
            const hasChange = pendingChanges[u.id] !== undefined && pendingChanges[u.id] !== u.role;
            const displayName = u.username || u.email.split("@")[0];
            const hasCustomName = !!u.username;
            const shortId = u.unique_id ? `${u.unique_id}` : u.id.slice(0, 8).toUpperCase();

            return (
              <Card key={u.id} className={`p-4 ${u.frozen ? "border-blue-500/50 bg-blue-500/5" : ""}`} data-testid={`card-user-${u.id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid={`text-username-${u.id}`}>{displayName}</p>
                      {!hasCustomName && (
                        <span className="text-[10px] text-muted-foreground/50 italic">email</span>
                      )}
                      <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-id-${u.id}`}>#{shortId}</Badge>
                      {u.frozen && (
                        <Badge variant="secondary" className="gap-1 text-blue-500" data-testid={`badge-frozen-${u.id}`}>
                          <Snowflake className="w-3 h-3" /> Gele
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-email-${u.id}`}>{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={currentRole} onValueChange={(val) => handleRoleChange(u.id, val)} disabled={u.id === userId}>
                      <SelectTrigger className="w-[130px]" data-testid={`select-role-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="pro">PRO</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant={(ROLE_CONFIG[u.role] || ROLE_CONFIG.free).variant} data-testid={`badge-role-${u.id}`}>
                      {(ROLE_CONFIG[u.role] || ROLE_CONFIG.free).label}
                    </Badge>
                    {hasChange && (
                      <Button size="sm" onClick={() => saveRole(u.id)} disabled={savingId === u.id} data-testid={`button-save-role-${u.id}`}>
                        {savingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Sauvegarder</>}
                      </Button>
                    )}
                    {u.id !== userId && (
                      <Button variant={u.frozen ? "default" : "outline"} size="sm" onClick={() => toggleFreeze(u.id, !u.frozen)} disabled={freezingId === u.id} title={u.frozen ? "Degeler le compte" : "Geler le compte"} data-testid={`button-freeze-${u.id}`}>
                        {freezingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Snowflake className="w-4 h-4 mr-1" /> {u.frozen ? "Degeler" : "Geler"}</>}
                      </Button>
                    )}
                    {u.id !== userId && (
                      confirmDeleteId === u.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)} disabled={deletingId === u.id} data-testid={`button-confirm-delete-${u.id}`}>
                            {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Confirmer</>}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} data-testid={`button-cancel-delete-${u.id}`}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(u.id)} title="Supprimer le compte" data-testid={`button-delete-${u.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
                {/* Game Management Row */}
                <div className="border-t border-border/30 pt-2 mt-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> Jeu :</span>
                    {gameResetConfirmId === u.id ? (
                      <div className="flex items-center gap-1">
                        <Button variant="destructive" size="sm" onClick={() => resetGameData(u.id)} disabled={gameResetLoadingId === u.id} data-testid={`button-confirm-game-reset-${u.id}`}>
                          {gameResetLoadingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3 mr-1" /> Confirmer reset</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setGameResetConfirmId(null)} data-testid={`button-cancel-game-reset-${u.id}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => { setGameResetConfirmId(u.id); setGameSetOpenId(null); }} data-testid={`button-game-reset-${u.id}`}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Reset Score & Credits
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => { setGameSetOpenId(gameSetOpenId === u.id ? null : u.id); setGameResetConfirmId(null); setGameSetScore(""); }} data-testid={`button-game-set-${u.id}`}>
                      <Wrench className="w-3 h-3 mr-1" /> {gameSetOpenId === u.id ? "Fermer" : "Définir Score & Credits"}
                    </Button>
                  </div>
                  {gameSetOpenId === u.id && (
                    <div className="flex items-center gap-2 pl-16 flex-wrap">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Score (ex: 500)"
                        value={gameSetScore}
                        onChange={(e) => setGameSetScore(e.target.value)}
                        className="w-40 h-7 text-xs"
                        data-testid={`input-game-score-${u.id}`}
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => setGameScore(u.id, displayName)} disabled={gameSetLoadingId === u.id} data-testid={`button-game-set-save-${u.id}`}>
                        {gameSetLoadingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" /> Appliquer</>}
                      </Button>
                      <span className="text-xs text-muted-foreground">Credits = score / 60 (sans limite)</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {safePage} / {totalPages} — {filtered.length} utilisateurs
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  data-testid="button-page-first"
                >«</Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  data-testid="button-page-prev"
                >‹</Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <Button
                      key={p} variant={p === safePage ? "default" : "outline"} size="sm"
                      onClick={() => setPage(p)}
                      data-testid={`button-page-${p}`}
                      className="w-8"
                    >{p}</Button>
                  );
                })}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  data-testid="button-page-next"
                >›</Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  data-testid="button-page-last"
                >»</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BlacklistAddForm({ getAccessToken, editEntry, onEditDone }: { getAccessToken: () => string | null; editEntry?: BlacklistEntry | null; onEditDone?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [emails, setEmails] = useState<string[]>([""]);
  const [phones, setPhones] = useState<string[]>([""]);
  const [ips, setIps] = useState<string[]>([""]);
  const [discordIds, setDiscordIds] = useState<string[]>([""]);
  const [addresses, setAddresses] = useState<string[]>([""]);

  const [form, setForm] = useState<Partial<InsertBlacklistEntry>>({
    civilite: "",
    firstName: "",
    lastName: "",
    pseudo: "",
    discord: "",
    discordId: "",
    password: "",
    iban: "",
    ip: "",
    ville: "",
    codePostal: "",
    dateNaissance: "",
    reason: "",
    notes: "",
  });

  const isEdit = !!editEntry;

  useEffect(() => {
    if (editEntry) {
      setForm({
        civilite: editEntry.civilite || "",
        firstName: editEntry.firstName || "",
        lastName: editEntry.lastName || "",
        pseudo: editEntry.pseudo || "",
        discord: editEntry.discord || "",
        discordId: editEntry.discordId || "",
        password: editEntry.password || "",
        iban: editEntry.iban || "",
        ip: editEntry.ip || "",
        ville: editEntry.ville || "",
        codePostal: editEntry.codePostal || "",
        dateNaissance: editEntry.dateNaissance || "",
        reason: editEntry.reason || "",
        notes: editEntry.notes || "",
      });
      setEmails(editEntry.emails?.length ? editEntry.emails : [editEntry.email || ""]);
      setPhones(editEntry.phones?.length ? editEntry.phones : [editEntry.phone || ""]);
      setIps(editEntry.ips?.length ? editEntry.ips : [editEntry.ip || ""]);
      setDiscordIds(editEntry.discordIds?.length ? editEntry.discordIds : [editEntry.discordId || ""]);
      setAddresses(editEntry.addresses?.length ? editEntry.addresses : [editEntry.address || ""]);
    }
  }, [editEntry]);

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, ""]);
  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(prev => prev.filter((_, i) => i !== index));
  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => setter(prev => prev.map((v, i) => i === index ? value : v));

  const resetForm = () => {
    setForm({
      civilite: "", firstName: "", lastName: "", pseudo: "",
      discord: "", discordId: "", password: "", iban: "", ip: "",
      ville: "", codePostal: "", dateNaissance: "", reason: "", notes: "",
    });
    setEmails([""]); setPhones([""]); setIps([""]); setDiscordIds([""]); setAddresses([""]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        emails: emails.filter(Boolean),
        phones: phones.filter(Boolean),
        ips: ips.filter(Boolean),
        discordIds: discordIds.filter(Boolean),
        addresses: addresses.filter(Boolean),
        email: emails[0] || "",
        phone: phones[0] || "",
        ip: ips[0] || form.ip || "",
        discordId: discordIds[0] || form.discordId || "",
        address: addresses[0] || "",
      };

      const url = isEdit ? `/api/admin/blacklist/${editEntry.id}` : "/api/admin/blacklist";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: isEdit ? "Entree modifiee" : "Entree ajoutee", description: isEdit ? "L'entree a ete mise a jour." : "L'entree a ete ajoutee a la blacklist." });
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
        if (onEditDone) onEditDone();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de sauvegarder", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const DynamicFields = ({ label, values, setter, placeholder }: any) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" variant="ghost" size="sm" onClick={() => addField(setter)} data-testid={`button-add-bl-${label.toLowerCase()}`}>
          <Plus className="w-3 h-3 mr-1" /> Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {values.map((val: string, i: number) => (
          <div key={i} className="flex gap-2">
            <Input
              value={val}
              onChange={e => updateField(setter, i, e.target.value)}
              placeholder={placeholder}
              data-testid={`input-bl-${label.toLowerCase()}-${i}`}
            />
            {values.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeField(setter, i)} data-testid={`button-remove-bl-${label.toLowerCase()}-${i}`}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      {isEdit && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <span className="font-medium">Modification de l'entree #{editEntry.id}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { resetForm(); onEditDone?.(); }} data-testid="button-cancel-bl-edit">
            <X className="w-4 h-4 mr-1" /> Annuler
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Civilite</label>
            <Select value={form.civilite || "M."} onValueChange={(v) => setForm(p => ({ ...p, civilite: v }))}>
              <SelectTrigger data-testid="select-bl-civilite">
                <SelectValue placeholder="Civilite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M.">Monsieur (M.)</SelectItem>
                <SelectItem value="Mme">Madame (Mme)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prenom</label>
            <Input value={form.firstName || ""} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Jean" data-testid="input-bl-firstname" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom</label>
            <Input value={form.lastName || ""} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Dupont" data-testid="input-bl-lastname" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DynamicFields label="Emails" values={emails} setter={setEmails} placeholder="jean.dupont@example.com" />
          <DynamicFields label="Telephones" values={phones} setter={setPhones} placeholder="06 12 34 56 78" />
        </div>

        <DynamicFields label="Adresses" values={addresses} setter={setAddresses} placeholder="123 Rue de la Republique" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Code Postal</label>
            <Input value={form.codePostal || ""} onChange={e => setForm(p => ({ ...p, codePostal: e.target.value }))} placeholder="75001" data-testid="input-bl-code-postal" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ville</label>
            <Input value={form.ville || ""} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} placeholder="Paris" data-testid="input-bl-ville" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de naissance</label>
            <Input value={form.dateNaissance || ""} onChange={e => setForm(p => ({ ...p, dateNaissance: e.target.value }))} placeholder="DD/MM/YYYY" data-testid="input-bl-date-naissance" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DynamicFields label="IPs" values={ips} setter={setIps} placeholder="192.168.1.1" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Pseudo</label>
            <Input value={form.pseudo || ""} onChange={e => setForm(p => ({ ...p, pseudo: e.target.value }))} placeholder="JDupont" data-testid="input-bl-pseudo" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Discord Tag</label>
            <Input value={form.discord || ""} onChange={e => setForm(p => ({ ...p, discord: e.target.value }))} placeholder="jdupont#1234" data-testid="input-bl-discord-tag" />
          </div>
          <DynamicFields label="Discord IDs" values={discordIds} setter={setDiscordIds} placeholder="123456789012345678" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe (fuite)</label>
          <Input value={form.password || ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="********" data-testid="input-bl-password" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">IBAN</label>
          <Input value={form.iban || ""} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} placeholder="FR76..." data-testid="input-bl-iban" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Raison</label>
          <Textarea value={form.reason || ""} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Raison de l'ajout a la blacklist..." className="min-h-[80px]" data-testid="input-bl-reason" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes / Signalement</label>
          <Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Informations complementaires..." className="min-h-[100px]" data-testid="input-bl-notes" />
        </div>

        <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-blacklist">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEdit ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isEdit ? "Sauvegarder les modifications" : "Ajouter a la blacklist"}
        </Button>
      </form>
    </Card>
  );
}

function BlacklistHistorySection({ getAccessToken, onEdit }: { getAccessToken: () => string | null; onEdit: (entry: BlacklistEntry) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: entries, isLoading } = useQuery<BlacklistEntry[]>({
    queryKey: ["/api/admin/blacklist"],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return [];
      const res = await fetch("/api/admin/blacklist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch blacklist");
      return res.json();
    },
  });

  const deleteEntry = async (id: number) => {
    const token = getAccessToken();
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blacklist/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
        toast({ title: "Entree supprimee" });
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const filtered = (entries || []).filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.firstName || "").toLowerCase().includes(q) ||
      (e.lastName || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.phone || "").toLowerCase().includes(q) ||
      (e.address || "").toLowerCase().includes(q) ||
      (e.reason || "").toLowerCase().includes(q) ||
      (e.pseudo || "").toLowerCase().includes(q) ||
      (e.discord || "").toLowerCase().includes(q) ||
      (e.discordId || "").toLowerCase().includes(q) ||
      (e.iban || "").toLowerCase().includes(q) ||
      (e.ip || "").toLowerCase().includes(q) ||
      (e.emails || []).some(v => v.toLowerCase().includes(q)) ||
      (e.phones || []).some(v => v.toLowerCase().includes(q)) ||
      (e.ips || []).some(v => v.toLowerCase().includes(q)) ||
      (e.discordIds || []).some(v => v.toLowerCase().includes(q)) ||
      (e.addresses || []).some(v => v.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans la blacklist..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-blacklist-history-search"
        />
      </div>
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery.trim() ? "Aucune entree correspondante." : "Aucune entree dans la blacklist."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const allEmails = entry.emails?.length ? entry.emails : entry.email ? [entry.email] : [];
            const allPhones = entry.phones?.length ? entry.phones : entry.phone ? [entry.phone] : [];
            const allIps = entry.ips?.length ? entry.ips : entry.ip ? [entry.ip] : [];
            const allDiscordIds = entry.discordIds?.length ? entry.discordIds : entry.discordId ? [entry.discordId] : [];
            const allAddresses = entry.addresses?.length ? entry.addresses : entry.address ? [entry.address] : [];

            return (
              <Card key={entry.id} className="p-4" data-testid={`card-blacklist-entry-${entry.id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {entry.civilite} {entry.firstName} {entry.lastName}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">#{entry.id}</Badge>
                      {entry.pseudo && <Badge variant="secondary">{entry.pseudo}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {allEmails.length > 0 && <div className="col-span-2"><span className="text-muted-foreground">Emails:</span> {allEmails.join(", ")}</div>}
                      {allPhones.length > 0 && <div><span className="text-muted-foreground">Tel:</span> {allPhones.join(", ")}</div>}
                      {entry.discord && <div><span className="text-muted-foreground">Discord:</span> {entry.discord}</div>}
                      {allDiscordIds.length > 0 && <div><span className="text-muted-foreground">Discord IDs:</span> {allDiscordIds.join(", ")}</div>}
                      {allIps.length > 0 && <div><span className="text-muted-foreground">IPs:</span> {allIps.join(", ")}</div>}
                      {allAddresses.length > 0 && <div className="col-span-2"><span className="text-muted-foreground">Adresses:</span> {allAddresses.join(", ")}</div>}
                      {entry.ville && <div><span className="text-muted-foreground">Ville:</span> {entry.ville} {entry.codePostal}</div>}
                      {entry.dateNaissance && <div><span className="text-muted-foreground">Naissance:</span> {entry.dateNaissance}</div>}
                      {entry.password && <div><span className="text-muted-foreground">MDP:</span> {entry.password}</div>}
                      {entry.iban && <div><span className="text-muted-foreground">IBAN:</span> {entry.iban}</div>}
                      {entry.reason && <div className="col-span-2"><span className="text-muted-foreground">Raison:</span> {entry.reason}</div>}
                      {entry.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {entry.notes}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
                      {entry.addedBy && <span className="ml-2">par {entry.addedBy}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(entry)}
                      title="Modifier"
                      data-testid={`button-edit-blacklist-${entry.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      title="Supprimer"
                      data-testid={`button-delete-blacklist-${entry.id}`}
                    >
                      {deletingId === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BlacklistRequestsSubSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const [blacklistRequests, setBlacklistRequests] = useState<BlacklistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetch_data() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/blacklist-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setBlacklistRequests(await res.json());
      } catch {}
      setLoading(false);
    }
    fetch_data();
  }, [getAccessToken]);

  const updateStatus = async (requestId: number, status: "approved" | "rejected") => {
    const token = getAccessToken();
    if (!token) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/admin/blacklist-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBlacklistRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
        toast({ title: status === "approved" ? "Demande approuvee" : "Demande rejetee" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de modifier", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blacklistRequests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucune demande de blacklist.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {blacklistRequests.map(req => {
        const isPending = req.status === "pending";
        const statusBadge = req.status === "approved"
          ? <Badge variant="default" className="gap-1" data-testid={`badge-status-${req.id}`}><Check className="w-3 h-3" />Approuvee</Badge>
          : req.status === "rejected"
          ? <Badge variant="destructive" className="gap-1" data-testid={`badge-status-${req.id}`}><X className="w-3 h-3" />Rejetee</Badge>
          : <Badge variant="secondary" className="gap-1" data-testid={`badge-status-${req.id}`}><Clock className="w-3 h-3" />En attente</Badge>;

        return (
          <Card key={req.id} className="p-4" data-testid={`card-blacklist-${req.id}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">#{req.id}</span>
                  {statusBadge}
                  <span className="text-xs text-muted-foreground">
                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString("fr-FR") : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {req.firstName && <div><span className="text-muted-foreground">Prenom:</span> {req.firstName}</div>}
                  {req.lastName && <div><span className="text-muted-foreground">Nom:</span> {req.lastName}</div>}
                  {req.pseudo && <div><span className="text-muted-foreground">Pseudo:</span> {req.pseudo}</div>}
                  {req.email && <div><span className="text-muted-foreground">Email:</span> {req.email}</div>}
                  {req.phone && <div><span className="text-muted-foreground">Tel:</span> {req.phone}</div>}
                  {req.address && <div className="col-span-2"><span className="text-muted-foreground">Adresse:</span> {req.address}</div>}
                  {req.reason && <div className="col-span-2"><span className="text-muted-foreground">Info:</span> {req.reason}</div>}
                </div>
              </div>
              {isPending && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => updateStatus(req.id, "approved")} disabled={processingId === req.id} data-testid={`button-approve-${req.id}`}>
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Approuver</>}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => updateStatus(req.id, "rejected")} disabled={processingId === req.id} data-testid={`button-reject-${req.id}`}>
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" />Rejeter</>}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function BlacklistSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const [subTab, setSubTab] = useState<"requests" | "history" | "add">("requests");
  const [editEntry, setEditEntry] = useState<BlacklistEntry | null>(null);

  const handleEdit = (entry: BlacklistEntry) => {
    setEditEntry(entry);
    setSubTab("add");
  };

  const handleEditDone = () => {
    setEditEntry(null);
    setSubTab("history");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={subTab === "requests" ? "default" : "outline"}
          size="sm"
          onClick={() => { setSubTab("requests"); setEditEntry(null); }}
          className="gap-2"
          data-testid="button-bl-subtab-requests"
        >
          <Clock className="w-4 h-4" />
          Demandes
        </Button>
        <Button
          variant={subTab === "history" ? "default" : "outline"}
          size="sm"
          onClick={() => { setSubTab("history"); setEditEntry(null); }}
          className="gap-2"
          data-testid="button-bl-subtab-history"
        >
          <Search className="w-4 h-4" />
          Historique
        </Button>
        <Button
          variant={subTab === "add" ? "default" : "outline"}
          size="sm"
          onClick={() => { setSubTab("add"); setEditEntry(null); }}
          className="gap-2"
          data-testid="button-bl-subtab-add"
        >
          <Plus className="w-4 h-4" />
          {editEntry ? "Modifier" : "Ajout Blacklist"}
        </Button>
      </div>

      {subTab === "requests" && <BlacklistRequestsSubSection getAccessToken={getAccessToken} />}
      {subTab === "history" && <BlacklistHistorySection getAccessToken={getAccessToken} onEdit={handleEdit} />}
      {subTab === "add" && <BlacklistAddForm getAccessToken={getAccessToken} editEntry={editEntry} onEditDone={handleEditDone} />}
    </div>
  );
}

function InfoRequestsSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const [infoRequests, setInfoRequests] = useState<InfoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetch_data() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/info-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setInfoRequests(await res.json());
      } catch {}
      setLoading(false);
    }
    fetch_data();
  }, [getAccessToken]);

  const updateStatus = async (requestId: number, status: "approved" | "rejected" | "completed") => {
    const token = getAccessToken();
    if (!token) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/admin/info-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInfoRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
        const labels: Record<string, string> = { approved: "Approuvee", rejected: "Rejetee", completed: "Terminee" };
        toast({ title: `Demande ${labels[status] || status}` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de modifier", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur reseau", variant: "destructive" });
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (infoRequests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucune demande d'information.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {infoRequests.map(req => {
        const isPending = req.status === "pending";
        const statusBadge = req.status === "approved"
          ? <Badge variant="default" className="gap-1" data-testid={`badge-info-status-${req.id}`}><Check className="w-3 h-3" />Approuvee</Badge>
          : req.status === "rejected"
          ? <Badge variant="destructive" className="gap-1" data-testid={`badge-info-status-${req.id}`}><X className="w-3 h-3" />Rejetee</Badge>
          : req.status === "completed"
          ? <Badge variant="default" className="gap-1" data-testid={`badge-info-status-${req.id}`}><Check className="w-3 h-3" />Terminee</Badge>
          : <Badge variant="secondary" className="gap-1" data-testid={`badge-info-status-${req.id}`}><Clock className="w-3 h-3" />En attente</Badge>;

        return (
          <Card key={req.id} className="p-4" data-testid={`card-info-${req.id}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">#{req.id}</span>
                  {statusBadge}
                  {req.paid && <Badge variant="outline" className="gap-1">Payee</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString("fr-FR") : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {req.discordId && <div><span className="text-muted-foreground">Discord ID:</span> {req.discordId}</div>}
                  {req.email && <div><span className="text-muted-foreground">Email:</span> {req.email}</div>}
                  {req.pseudo && <div><span className="text-muted-foreground">Pseudo:</span> {req.pseudo}</div>}
                  {req.ipAddress && <div><span className="text-muted-foreground">IP:</span> {req.ipAddress}</div>}
                  {req.additionalInfo && <div className="col-span-2"><span className="text-muted-foreground">Info:</span> {req.additionalInfo}</div>}
                </div>
              </div>
              {isPending && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => updateStatus(req.id, "approved")} disabled={processingId === req.id} data-testid={`button-approve-info-${req.id}`}>
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Approuver</>}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => updateStatus(req.id, "rejected")} disabled={processingId === req.id} data-testid={`button-reject-info-${req.id}`}>
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" />Rejeter</>}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

interface AdminSubscription {
  id: number;
  userId: string;
  tier: string;
  frozen: boolean;
  frozenAt: string | null;
  expiresAt: string | null;
  discordId: string | null;
  createdAt: string;
}

interface AdminLicenseKey {
  id: number;
  key: string;
  tier: string;
  used: boolean;
  usedBy: string | null;
  orderId: string | null;
  createdAt: string;
  usedAt: string | null;
}

function KeysSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<"subscriptions" | "license-keys" | "generate">("subscriptions");
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [keys, setKeys] = useState<AdminLicenseKey[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generateTier, setGenerateTier] = useState("vip");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const [subsRes, keysRes] = await Promise.all([
          fetch("/api/admin/subscriptions", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/license-keys", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (subsRes.ok) setSubs(await subsRes.json());
        if (keysRes.ok) setKeys(await keysRes.json());
      } catch {}
      setLoadingSubs(false);
      setLoadingKeys(false);
    }
    fetchData();
  }, [getAccessToken]);

  const handleFreeze = async (userId: string, freeze: boolean) => {
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, frozen: freeze }),
      });
      if (res.ok) {
        setSubs(prev => prev.map(s => s.userId === userId ? { ...s, frozen: freeze, frozenAt: freeze ? new Date().toISOString() : null } : s));
        toast({ title: freeze ? "Compte gele" : "Compte degele" });
      } else {
        toast({ title: "Erreur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur reseau", variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleRevoke = async (userId: string) => {
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/revoke-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setSubs(prev => prev.map(s => s.userId === userId ? { ...s, tier: "free", expiresAt: null, frozen: false, frozenAt: null } : s));
        toast({ title: "Abonnement revoque" });
      } else {
        toast({ title: "Erreur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur reseau", variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleGenerate = async () => {
    const token = getAccessToken();
    if (!token) return;
    setGenerating(true);
    setGeneratedKey(null);
    try {
      const res = await fetch("/api/admin/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: generateTier }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        const keysRes = await fetch("/api/admin/license-keys", { headers: { Authorization: `Bearer ${token}` } });
        if (keysRes.ok) setKeys(await keysRes.json());
        toast({ title: "Cle generee" });
      } else {
        const errData = await res.json().catch(() => null);
        toast({ title: "Erreur", description: errData?.message || `Erreur ${res.status}`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur reseau", variant: "destructive" });
    }
    setGenerating(false);
  };

  const getDaysRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return "Pas d'expiration";
    const now = new Date();
    const exp = new Date(expiresAt);
    if (exp <= now) return "Expire";
    const diff = exp.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}j ${hours}h`;
    return `${hours}h`;
  };

  const activeSubs = subs.filter(s => s.tier !== "free");
  const filteredSubs = searchTerm
    ? activeSubs.filter(s => s.userId.includes(searchTerm) || (s.discordId && s.discordId.includes(searchTerm)))
    : activeSubs;

  const filteredKeys = searchTerm
    ? keys.filter(k => k.key.includes(searchTerm) || k.tier.includes(searchTerm) || (k.usedBy && k.usedBy.includes(searchTerm)))
    : keys;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={subTab === "subscriptions" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("subscriptions")}
          className="gap-2"
          data-testid="button-keys-subtab-subs"
        >
          <Users className="w-4 h-4" />
          Abonnements ({activeSubs.length})
        </Button>
        <Button
          variant={subTab === "license-keys" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("license-keys")}
          className="gap-2"
          data-testid="button-keys-subtab-keys"
        >
          <KeyRound className="w-4 h-4" />
          Cles ({keys.length})
        </Button>
        <Button
          variant={subTab === "generate" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("generate")}
          className="gap-2"
          data-testid="button-keys-subtab-generate"
        >
          <Plus className="w-4 h-4" />
          Generer une cle
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-keys-search"
          placeholder="Rechercher par ID, cle, tier..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {subTab === "subscriptions" && (
        <div className="space-y-3">
          {loadingSubs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubs.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              Aucun abonnement actif
            </Card>
          ) : (
            filteredSubs.map(sub => {
              const roleConf = ROLE_CONFIG[sub.tier] || ROLE_CONFIG.free;
              const isActioning = actionLoading === sub.userId;
              return (
                <Card key={sub.id} className="p-4" data-testid={`card-sub-${sub.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" data-testid={`text-sub-userid-${sub.id}`}>
                          {sub.userId.slice(0, 8)}...
                        </span>
                        <Badge variant={roleConf.variant} data-testid={`badge-sub-tier-${sub.id}`}>
                          {roleConf.label}
                        </Badge>
                        {sub.frozen && (
                          <Badge variant="destructive" data-testid={`badge-sub-frozen-${sub.id}`}>
                            <Snowflake className="w-3 h-3 mr-1" />
                            Gele
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getDaysRemaining(sub.expiresAt)}
                        </span>
                        {sub.discordId && (
                          <span>Discord: {sub.discordId}</span>
                        )}
                        <span>ID: #{sub.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFreeze(sub.userId, !sub.frozen)}
                        disabled={isActioning}
                        data-testid={`button-freeze-${sub.id}`}
                        className="gap-1.5"
                      >
                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5" />}
                        {sub.frozen ? "Degeler" : "Geler"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevoke(sub.userId)}
                        disabled={isActioning}
                        data-testid={`button-revoke-${sub.id}`}
                        className="gap-1.5"
                      >
                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        Revoquer
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {subTab === "license-keys" && (
        <div className="space-y-3">
          {loadingKeys ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKeys.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              Aucune cle trouvee
            </Card>
          ) : (
            filteredKeys.map(k => (
              <Card key={k.id} className="p-4" data-testid={`card-key-${k.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs truncate max-w-[220px]" data-testid={`text-key-value-${k.id}`}>
                        {k.key}
                      </span>
                      <Badge variant={(ROLE_CONFIG[k.tier] || ROLE_CONFIG.free).variant}>
                        {(ROLE_CONFIG[k.tier] || ROLE_CONFIG.free).label}
                      </Badge>
                      <Badge variant={k.used ? "secondary" : "outline"}>
                        {k.used ? "Utilisee" : "Disponible"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>Creee: {new Date(k.createdAt).toLocaleDateString("fr-FR")}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        30j
                      </span>
                      {k.usedBy && k.usedBy !== "REVOKED" && (
                        <span>Utilisee par: {k.usedBy.slice(0, 8)}...</span>
                      )}
                      {k.usedBy === "REVOKED" && (
                        <Badge variant="destructive" className="text-xs">Revoquee</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(k.key);
                      toast({ title: "Cle copiee" });
                    }}
                    data-testid={`button-copy-key-${k.id}`}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {subTab === "generate" && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tier de la cle</label>
            <Select value={generateTier} onValueChange={setGenerateTier}>
              <SelectTrigger data-testid="select-generate-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
            data-testid="button-generate-key"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generer
          </Button>
          {generatedKey && (
            <div className="p-4 rounded-md bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-2">Cle generee :</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background px-2 py-1 rounded flex-1 truncate" data-testid="text-generated-key">
                  {generatedKey}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                    toast({ title: "Cle copiee" });
                  }}
                  data-testid="button-copy-generated-key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

interface DofProfileData {
  id: number;
  pseudo: string;
  description: string;
  imageUrl: string;
  tier: string;
  sortOrder: number;
}

const DOF_TIER_LABELS: Record<string, { label: string; color: string }> = {
  diamant: { label: "Diamant", color: "text-amber-400" },
  platine: { label: "Platine", color: "text-slate-300" },
  label: { label: "Label", color: "text-blue-400" },
};

const DOF_TEMPLATES: Record<string, { name: string; profiles: Omit<DofProfileData, "id">[] }> = {
  team: {
    name: "Equipe classique",
    profiles: [
      { pseudo: "Fondateur", description: "Fondateur du projet", imageUrl: "", tier: "diamant", sortOrder: 0 },
      { pseudo: "Co-Fondateur", description: "Co-fondateur du projet", imageUrl: "", tier: "diamant", sortOrder: 1 },
      { pseudo: "Developpeur", description: "Developpeur principal", imageUrl: "", tier: "platine", sortOrder: 2 },
      { pseudo: "Moderateur", description: "Moderateur de la communaute", imageUrl: "", tier: "platine", sortOrder: 3 },
    ],
  },
  labels: {
    name: "Labels uniquement",
    profiles: [
      { pseudo: "Mon Label", description: "Membres: ...", imageUrl: "", tier: "label", sortOrder: 0 },
      { pseudo: "Deuxieme Label", description: "Membres: ...", imageUrl: "", tier: "label", sortOrder: 1 },
    ],
  },
  full: {
    name: "Complet (Diamant + Platine + Labels)",
    profiles: [
      { pseudo: "Leader", description: "Chef de file", imageUrl: "", tier: "diamant", sortOrder: 0 },
      { pseudo: "Bras Droit", description: "Adjoint", imageUrl: "", tier: "diamant", sortOrder: 1 },
      { pseudo: "Membre 1", description: "Membre actif", imageUrl: "", tier: "platine", sortOrder: 2 },
      { pseudo: "Membre 2", description: "Membre actif", imageUrl: "", tier: "platine", sortOrder: 3 },
      { pseudo: "Membre 3", description: "Membre actif", imageUrl: "", tier: "platine", sortOrder: 4 },
      { pseudo: "Label", description: "Membres: ...", imageUrl: "", tier: "label", sortOrder: 5 },
    ],
  },
};

function DofProfileAvatar({ imageUrl, pseudo }: { imageUrl: string; pseudo: string }) {
  const [imgError, setImgError] = useState(false);
  if (!imageUrl || imgError) {
    return (
      <div className="w-10 h-10 rounded-md bg-muted/30 flex-shrink-0 border border-border flex items-center justify-center text-muted-foreground text-sm font-bold">
        {pseudo.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted/30 flex-shrink-0 border border-border">
      <img
        src={imageUrl}
        alt={pseudo}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function DofSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profiles, setProfiles] = useState<DofProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pseudo: "",
    description: "",
    imageUrl: "",
    tier: "platine",
    sortOrder: 0,
  });

  const fetchProfiles = async () => {
    try {
      const token = getAccessToken();
      const res = await fetch("/api/admin/dof-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (err) {
      console.error("Failed to fetch D.O.F profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const resetForm = () => {
    setForm({ pseudo: "", description: "", imageUrl: "", tier: "platine", sortOrder: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.pseudo.trim()) {
      toast({ title: "Le pseudo est obligatoire", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = getAccessToken();
      const url = editingId
        ? `/api/admin/dof-profiles/${editingId}`
        : "/api/admin/dof-profiles";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: editingId ? "Profil modifie" : "Profil cree" });
        resetForm();
        fetchProfiles();
      } else {
        const data = await res.json();
        toast({ title: data.message || "Erreur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur de connexion", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce profil D.O.F ?")) return;
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/admin/dof-profiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Profil supprime" });
        fetchProfiles();
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleEdit = (profile: DofProfileData) => {
    setForm({
      pseudo: profile.pseudo,
      description: profile.description,
      imageUrl: profile.imageUrl,
      tier: profile.tier,
      sortOrder: profile.sortOrder,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const applyTemplate = async (templateKey: string) => {
    const template = DOF_TEMPLATES[templateKey];
    if (!template) return;
    if (profiles.length > 0 && !confirm("Cela va ajouter des profils en plus de ceux existants. Continuer ?")) return;
    setSaving(true);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/admin/dof-profiles/bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: template.profiles }),
      });
      if (res.ok) {
        toast({ title: `Template "${template.name}" applique` });
        fetchProfiles();
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="gap-2"
          data-testid="button-add-dof"
        >
          <Plus className="w-4 h-4" />
          Ajouter un profil
        </Button>

        <Select onValueChange={(v) => applyTemplate(v)}>
          <SelectTrigger className="w-[220px]" data-testid="select-dof-template">
            <SelectValue placeholder="Appliquer un template..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOF_TEMPLATES).map(([key, tmpl]) => (
              <SelectItem key={key} value={key}>{tmpl.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4">
          <h3 className="text-lg font-semibold" data-testid="text-dof-form-title">
            {editingId ? "Modifier le profil" : "Nouveau profil D.O.F"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pseudo</Label>
              <Input
                value={form.pseudo}
                onChange={(e) => setForm({ ...form, pseudo: e.target.value })}
                placeholder="Pseudo du profil"
                data-testid="input-dof-pseudo"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categorie</Label>
              <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                <SelectTrigger data-testid="select-dof-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diamant">Disque de Diamant</SelectItem>
                  <SelectItem value="platine">Disque de Platine</SelectItem>
                  <SelectItem value="label">Label</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description courte"
                data-testid="input-dof-description"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">URL de l'image</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://cdn.discordapp.com/avatars/..."
                data-testid="input-dof-image"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ordre d'affichage</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-dof-sort"
              />
            </div>
          </div>

          {form.imageUrl && (
            <div className="flex items-center gap-3">
              <img
                src={form.imageUrl}
                alt="Apercu"
                className="w-16 h-16 rounded-md object-cover border border-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-xs text-muted-foreground">Apercu de l'image</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="button-save-dof">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Enregistrer" : "Creer"}
            </Button>
            <Button variant="outline" onClick={resetForm} data-testid="button-cancel-dof">
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {profiles.length === 0 ? (
        <Card className="p-8 text-center">
          <Disc3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Aucun profil D.O.F pour l'instant.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Utilisez un template ou ajoutez des profils manuellement.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {["diamant", "platine", "label"].map((tier) => {
            const tierProfiles = profiles.filter((p) => p.tier === tier);
            if (tierProfiles.length === 0) return null;
            const tierInfo = DOF_TIER_LABELS[tier] || { label: tier, color: "text-foreground" };
            return (
              <div key={tier} className="space-y-2">
                <div className="flex items-center gap-2 pt-3">
                  <span className={`text-sm font-semibold uppercase tracking-wider ${tierInfo.color}`}>
                    {tierInfo.label}
                  </span>
                  <Badge variant="outline" className="text-xs">{tierProfiles.length}</Badge>
                </div>
                {tierProfiles.map((profile) => (
                  <Card key={profile.id} className="p-3 flex items-center gap-3" data-testid={`card-dof-${profile.id}`}>
                    <DofProfileAvatar imageUrl={profile.imageUrl} pseudo={profile.pseudo} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{profile.pseudo}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.description || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">#{profile.sortOrder}</Badge>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)} data-testid={`button-edit-dof-${profile.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(profile.id)} data-testid={`button-delete-dof-${profile.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WantedSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const [wantedSubTab, setWantedSubTab] = useState<"form" | "history">("form");
  const [editProfile, setEditProfile] = useState<WantedProfile | null>(null);

  const handleEdit = (profile: WantedProfile) => {
    setEditProfile(profile);
    setWantedSubTab("form");
  };

  const handleEditDone = () => {
    setEditProfile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={wantedSubTab === "form" ? "default" : "outline"}
          onClick={() => { setWantedSubTab("form"); setEditProfile(null); }}
          className="toggle-elevate"
          data-testid="button-wanted-form-tab"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {editProfile ? "Modifier" : "Ajouter un profil"}
        </Button>
        <Button
          variant={wantedSubTab === "history" ? "default" : "outline"}
          onClick={() => { setWantedSubTab("history"); setEditProfile(null); }}
          className="toggle-elevate"
          data-testid="button-wanted-history-tab"
        >
          <Clock className="w-4 h-4 mr-2" />
          Historique
        </Button>
      </div>

      {wantedSubTab === "form" ? (
        <WantedProfileForm getAccessToken={getAccessToken} editProfile={editProfile} onEditDone={handleEditDone} />
      ) : (
        <WantedHistorySection getAccessToken={getAccessToken} onEdit={handleEdit} />
      )}
    </div>
  );
}

function MaintenanceToggle({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/admin/maintenance", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getAccessToken]);

  const toggle = async () => {
    const token = getAccessToken();
    if (!token) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        toast({
          title: data.enabled ? "Mode developpement active" : "Mode developpement desactive",
          description: data.enabled
            ? "Les visiteurs voient la page promotionnelle"
            : "Le site est accessible a tous",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
    setToggling(false);
  };

  if (loading) return null;

  return (
    <Button
      variant={enabled ? "destructive" : "outline"}
      onClick={toggle}
      disabled={toggling}
      data-testid="button-maintenance-toggle"
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Wrench className="w-4 h-4 mr-2" />
      )}
      {enabled ? "Mode dev actif" : "Passer en mode dev"}
    </Button>
  );
}

interface BlockedIpEntry {
  id: string;
  ipAddress: string;
  reason: string;
  blockedBy: string;
  createdAt: string;
}

function IpBlacklistSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");

  const { data: blockedIps = [], isLoading } = useQuery<BlockedIpEntry[]>({
    queryKey: ["/api/admin/blocked-ips"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/blocked-ips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch blocked IPs");
      return res.json();
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/blocked-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ipAddress: newIp, reason: newReason }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocked-ips"] });
      setNewIp("");
      setNewReason("");
      toast({ title: "IP bloquee avec succes" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = getAccessToken();
      const res = await fetch(`/api/admin/blocked-ips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocked-ips"] });
      toast({ title: "IP debloquee" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Bloquer une IP</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">Adresse IP</Label>
            <Input
              data-testid="input-block-ip"
              placeholder="ex: 192.168.1.1"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">Raison</Label>
            <Input
              data-testid="input-block-reason"
              placeholder="Raison du blocage"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
            />
          </div>
          <Button
            data-testid="button-block-ip"
            onClick={() => blockMutation.mutate()}
            disabled={!newIp.trim() || blockMutation.isPending}
          >
            {blockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="ml-1">Bloquer</span>
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">IPs bloquees ({blockedIps.length})</h3>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : blockedIps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune IP bloquee</p>
        ) : (
          <div className="space-y-2">
            {blockedIps.map((entry) => (
              <div key={entry.id} data-testid={`row-blocked-ip-${entry.id}`} className="flex flex-wrap items-center gap-2 justify-between p-2 rounded-md border">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="destructive" className="font-mono text-xs">{entry.ipAddress}</Badge>
                  {entry.reason && <span className="text-xs text-muted-foreground truncate">{entry.reason}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString("fr-FR")}</span>
                  <Button
                    data-testid={`button-unblock-ip-${entry.id}`}
                    size="icon"
                    variant="ghost"
                    onClick={() => unblockMutation.mutate(entry.id)}
                    disabled={unblockMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function LoginLogsSection({ getAccessToken, isSuperAdmin }: { getAccessToken: () => string | null; isSuperAdmin?: boolean }) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading, isFetching, refetch } = useQuery<LoginLog[]>({
    queryKey: ["/api/admin/login-logs"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/login-logs?limit=300", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur lors du chargement des logs");
      return res.json();
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  async function handleDeleteLog(id: number) {
    setDeletingId(id);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/superadmin/logs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur suppression");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-logs"] });
      toast({ title: "Log supprimé" });
    } catch { toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" }); }
    finally { setDeletingId(null); }
  }

  async function handleClearLogs() {
    if (!confirm("Supprimer TOUS les logs de connexion ?")) return;
    setClearing(true);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/superadmin/logs/clear", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-logs"] });
      toast({ title: `${data.deleted} log(s) supprimé(s)` });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setClearing(false); }
  }

  const filtered = logs.filter(log => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.email?.toLowerCase().includes(q) ||
      log.username?.toLowerCase().includes(q) ||
      log.ip?.toLowerCase().includes(q) ||
      log.provider?.toLowerCase().includes(q) ||
      log.tier?.toLowerCase().includes(q) ||
      log.discordId?.toLowerCase().includes(q)
    );
  });

  const PROVIDER_COLORS: Record<string, string> = {
    discord: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    email: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    google: "bg-red-500/10 text-red-400 border-red-500/30",
    unknown: "bg-muted text-muted-foreground border-border",
  };

  const TIER_COLORS: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive border-destructive/30",
    pro: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    vip: "bg-primary/10 text-primary border-primary/30",
    free: "bg-muted text-muted-foreground border-border",
    api: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    business: "bg-green-500/10 text-green-400 border-green-500/30",
  };

  return (
    <div className="space-y-4" data-testid="section-login-logs">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Logs de Connexion
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {logs.length} entrée{logs.length !== 1 ? "s" : ""} — actualisé toutes les 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button size="sm" variant="destructive" onClick={handleClearLogs} disabled={clearing} data-testid="button-clear-login-logs">
              {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Tout supprimer
            </Button>
          )}
          <Button size="sm" variant="outline" className="px-2 h-9" onClick={() => refetch()} disabled={isFetching} title="Rafraîchir" data-testid="button-loginlog-refresh">
            <RotateCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher email, IP, pseudo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-logs-search"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ScanLine className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun log trouvé</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => (
            <Card
              key={log.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              data-testid={`card-log-${log.id}`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {log.provider === "discord" ? (
                    <Monitor className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-blue-400" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate" data-testid={`text-log-username-${log.id}`}>
                    {log.username || log.email || log.userId}
                  </span>
                  {log.email && log.username && (
                    <span className="text-xs text-muted-foreground truncate">{log.email}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1" data-testid={`text-log-ip-${log.id}`}>
                    <Globe className="w-3 h-3" />
                    {log.ip}
                  </span>
                  {log.discordId && (
                    <span className="truncate">Discord: {log.discordId}</span>
                  )}
                  <span>{log.userAgent ? log.userAgent.slice(0, 60) + (log.userAgent.length > 60 ? "…" : "") : "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROVIDER_COLORS[log.provider] ?? PROVIDER_COLORS.unknown}`}
                  data-testid={`badge-log-provider-${log.id}`}
                >
                  {log.provider}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIER_COLORS[log.tier] ?? TIER_COLORS.free}`}
                  data-testid={`badge-log-tier-${log.id}`}
                >
                  {log.tier}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-log-date-${log.id}`}>
                  {new Date(log.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {isSuperAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteLog(log.id)}
                    disabled={deletingId === log.id}
                    data-testid={`button-delete-login-log-${log.id}`}
                  >
                    {deletingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscountCodesSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState(10);
  const [newMaxUses, setNewMaxUses] = useState<string>("");
  const [newExpiresAt, setNewExpiresAt] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const { data: codes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/discount-codes"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/discount-codes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  async function handleCreate() {
    if (!newCode.trim() || newPercent < 1 || newPercent > 100) return;
    setCreating(true);
    const token = getAccessToken();
    try {
      const body: any = { code: newCode.trim(), discountPercent: newPercent };
      if (newMaxUses.trim()) body.maxUses = parseInt(newMaxUses);
      if (newExpiresAt.trim()) body.expiresAt = newExpiresAt;
      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Code créé", description: `Code ${data.code} créé avec succès` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      setCreateOpen(false);
      setNewCode(""); setNewPercent(10); setNewMaxUses(""); setNewExpiresAt("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: number, active: boolean) {
    const token = getAccessToken();
    try {
      await fetch(`/api/admin/discount-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !active }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  async function handleDelete(id: number, code: string) {
    if (!confirm(`Supprimer le code "${code}" ?`)) return;
    const token = getAccessToken();
    try {
      const res = await fetch(`/api/admin/discount-codes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur suppression");
      toast({ title: "Code supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4" data-testid="section-discounts">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez les codes de réduction pour les abonnements.</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-discount">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau code
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucun code promo créé</div>
      ) : (
        <div className="space-y-2">
          {codes.map((dc: any) => {
            const isExpired = dc.expiresAt && new Date(dc.expiresAt) < new Date();
            const isExhausted = dc.maxUses !== null && dc.usedCount >= dc.maxUses;
            return (
              <Card key={dc.id} className={`p-4 ${!dc.active || isExpired || isExhausted ? "opacity-60" : ""}`} data-testid={`card-discount-${dc.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm" data-testid={`text-code-${dc.id}`}>{dc.code}</span>
                        <Badge variant={dc.active && !isExpired && !isExhausted ? "default" : "secondary"} className="text-xs">
                          {!dc.active ? "Désactivé" : isExpired ? "Expiré" : isExhausted ? "Épuisé" : "Actif"}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono">-{dc.discountPercent}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                        <span>Utilisations : <strong>{dc.usedCount}</strong>{dc.maxUses !== null ? ` / ${dc.maxUses}` : " (illimité)"}</span>
                        {dc.expiresAt && <span>Expire : {new Date(dc.expiresAt).toLocaleDateString("fr-FR")}</span>}
                        <span>Par : {dc.createdBy}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      title={dc.active ? "Désactiver" : "Activer"}
                      onClick={() => handleToggle(dc.id, dc.active)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid={`button-toggle-discount-${dc.id}`}
                    >
                      {dc.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      title="Supprimer"
                      onClick={() => handleDelete(dc.id, dc.code)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-delete-discount-${dc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Nouveau code promo
            </DialogTitle>
            <DialogDescription>Créer un code de réduction pour les abonnements.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dc-code">Code</Label>
              <Input
                id="dc-code"
                data-testid="input-new-discount-code"
                placeholder="PROMO2024"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="font-mono"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-percent">Réduction (%)</Label>
              <Input
                id="dc-percent"
                data-testid="input-discount-percent"
                type="number"
                min={1}
                max={100}
                value={newPercent}
                onChange={(e) => setNewPercent(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-maxuses">Utilisations max (laisser vide = illimité)</Label>
              <Input
                id="dc-maxuses"
                data-testid="input-discount-maxuses"
                type="number"
                min={1}
                placeholder="ex: 50"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-expires">Date d'expiration (optionnel)</Label>
              <Input
                id="dc-expires"
                data-testid="input-discount-expires"
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button
                data-testid="button-confirm-create-discount"
                onClick={handleCreate}
                disabled={creating || !newCode.trim()}
                className="gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ToastConfig = { enabled: boolean; pollIntervalSec: number; dismissAfterSec: number; maxVisible: number };

function NotificationsSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cfg, isLoading } = useQuery<ToastConfig>({
    queryKey: ["/api/settings/toast"],
    queryFn: async () => {
      const res = await fetch("/api/settings/toast");
      return res.json();
    },
  });

  async function update(patch: Partial<ToastConfig>) {
    const token = getAccessToken();
    try {
      const res = await fetch("/api/admin/settings/toast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Erreur");
      queryClient.invalidateQueries({ queryKey: ["/api/settings/toast"] });
      toast({ title: "Paramètres mis à jour" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  const TIER_PREVIEW = [
    { tier: "vip", label: "VIP", color: "#d4a843" },
    { tier: "pro", label: "PRO", color: "#818cf8" },
    { tier: "business", label: "Business", color: "#34d399" },
    { tier: "api", label: "API", color: "#f472b6" },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const c = cfg ?? { enabled: true, pollIntervalSec: 30, dismissAfterSec: 6, maxVisible: 3 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Notifications Pop-up</h2>
      </div>

      <Card className="p-5 space-y-5">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Configuration</h3>

        <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.06)]">
          <div>
            <p className="font-semibold text-sm">Activer les popups</p>
            <p className="text-xs text-muted-foreground mt-0.5">Afficher ou masquer toutes les notifications</p>
          </div>
          <button
            onClick={() => update({ enabled: !c.enabled })}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            style={{
              background: c.enabled ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
              color: c.enabled ? "#10b981" : "#6b7280",
              border: `1px solid ${c.enabled ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {c.enabled ? <Bell className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {c.enabled ? "Activé" : "Désactivé"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Timer className="w-3 h-3" />Intervalle de vérification
            </label>
            <Select value={String(c.pollIntervalSec)} onValueChange={v => update({ pollIntervalSec: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 secondes</SelectItem>
                <SelectItem value="30">30 secondes</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Fréquence de vérification des nouveaux abonnés</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3 h-3" />Durée d'affichage
            </label>
            <Select value={String(c.dismissAfterSec)} onValueChange={v => update({ dismissAfterSec: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 secondes</SelectItem>
                <SelectItem value="4">4 secondes</SelectItem>
                <SelectItem value="6">6 secondes</SelectItem>
                <SelectItem value="8">8 secondes</SelectItem>
                <SelectItem value="10">10 secondes</SelectItem>
                <SelectItem value="15">15 secondes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Avant fermeture automatique</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />Max simultanés
            </label>
            <Select value={String(c.maxVisible)} onValueChange={v => update({ maxVisible: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 popup</SelectItem>
                <SelectItem value="2">2 popups</SelectItem>
                <SelectItem value="3">3 popups</SelectItem>
                <SelectItem value="4">4 popups</SelectItem>
                <SelectItem value="5">5 popups</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Empilés en bas à droite (au-dessus du chat)</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Aperçu & test</h3>
          <p className="text-[10px] text-muted-foreground">Cliquez "Tester" pour déclencher un popup en direct</p>
        </div>
        <div className="space-y-2">
          {TIER_PREVIEW.map(({ tier, label, color }) => (
            <div
              key={tier}
              className="flex items-center gap-3"
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-1"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}40` }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    Nouveau membre <span style={{ color }}>{label}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">À l'instant · discreen.site</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">il y a 1 min</span>
              </div>
              <button
                onClick={async () => {
                  const token = getAccessToken();
                  await fetch("/api/admin/test-toast", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ tier }),
                  });
                  window.dispatchEvent(new CustomEvent("discreen:refetch-activity"));
                  toast({ title: `Notification ${label} envoyée`, description: "Le popup devrait apparaître dans quelques secondes." });
                }}
                className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: `${color}15`, color, border: `1px solid ${color}35` }}
              >
                Tester
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ServiceStatusSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "operational", latencyMs: "", uptime: "99.99%" });

  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/service-status"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/service-status", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  function resetForm() { setForm({ name: "", description: "", status: "operational", latencyMs: "", uptime: "99.99%" }); setEditId(null); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setCreating(true);
    const token = getAccessToken();
    const body: any = { name: form.name.trim(), description: form.description.trim(), status: form.status, uptime: form.uptime.trim() };
    if (form.latencyMs.trim()) body.latencyMs = parseInt(form.latencyMs);
    try {
      const url = editId ? `/api/admin/service-status/${editId}` : "/api/admin/service-status";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: editId ? "Service mis à jour" : "Service créé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-status"] });
      resetForm();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  }

  async function handleDelete(id: number) {
    const token = getAccessToken();
    try {
      await fetch(`/api/admin/service-status/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-status"] });
      toast({ title: "Service supprimé" });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
  }

  const STATUS_OPTS = [
    { value: "operational", label: "Opérationnel" },
    { value: "degraded", label: "Dégradé" },
    { value: "outage", label: "Panne" },
  ];

  const statusColor: Record<string, string> = { operational: "#10b981", degraded: "#f59e0b", outage: "#ef4444" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Statut des Services</h2>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{editId ? "Modifier le service" : "Ajouter un service"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Nom *</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Moteur de Recherche" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Description</label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description courte" /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Latence (ms)</label><Input value={form.latencyMs} onChange={e => setForm(p => ({ ...p, latencyMs: e.target.value }))} placeholder="45" type="number" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Uptime</label><Input value={form.uptime} onChange={e => setForm(p => ({ ...p, uptime: e.target.value }))} placeholder="99.99%" /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={creating || !form.name.trim()} size="sm">
            {creating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            {editId ? "Mettre à jour" : "Créer"}
          </Button>
          {editId && <Button variant="outline" size="sm" onClick={resetForm}><X className="w-3 h-3 mr-1" />Annuler</Button>}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : services.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Aucun service configuré — créez le premier ci-dessus.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {services.map((svc: any) => (
            <Card key={svc.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: statusColor[svc.status] ?? "#10b981" }} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{svc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{svc.description} · {svc.uptime}{svc.latencyMs ? ` · ${svc.latencyMs}ms` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" style={{ color: statusColor[svc.status] ?? "#10b981", borderColor: statusColor[svc.status] ?? "#10b981" }} className="text-xs">
                  {STATUS_OPTS.find(o => o.value === svc.status)?.label ?? svc.status}
                </Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditId(svc.id); setForm({ name: svc.name, description: svc.description || "", status: svc.status, latencyMs: svc.latencyMs?.toString() ?? "", uptime: svc.uptime }); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => handleDelete(svc.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GameBoostsSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newMultiplier, setNewMultiplier] = useState(2);
  const [newMaxUses, setNewMaxUses] = useState<string>("");
  const [newExpiresAt, setNewExpiresAt] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const { data: boosts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/game-boosts"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/game-boosts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  async function handleCreate() {
    if (!newName.trim() || !newCode.trim()) return;
    setCreating(true);
    const token = getAccessToken();
    try {
      const body: any = { name: newName.trim(), code: newCode.trim(), multiplier: newMultiplier };
      if (newMaxUses.trim()) body.maxUses = parseInt(newMaxUses);
      if (newExpiresAt.trim()) body.expiresAt = newExpiresAt;
      const res = await fetch("/api/admin/game-boosts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Boost créé", description: `Code ${data.code} actif (×${data.multiplier})` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-boosts"] });
      setCreateOpen(false);
      setNewName(""); setNewCode(""); setNewMultiplier(2); setNewMaxUses(""); setNewExpiresAt("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: number, active: boolean) {
    const token = getAccessToken();
    try {
      await fetch(`/api/admin/game-boosts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !active }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-boosts"] });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  async function handleDelete(id: number, code: string) {
    if (!confirm(`Supprimer le boost "${code}" ?`)) return;
    const token = getAccessToken();
    try {
      const res = await fetch(`/api/admin/game-boosts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur suppression");
      toast({ title: "Boost supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-boosts"] });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4" data-testid="section-game-boosts">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez les codes boost pour multiplier les crédits gagnés dans STING.EXE.</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-boost">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau boost
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : boosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucun boost créé</div>
      ) : (
        <div className="space-y-2">
          {boosts.map((b: any) => {
            const isExpired = b.expiresAt && new Date(b.expiresAt) < new Date();
            const isExhausted = b.maxUses !== null && b.usedCount >= b.maxUses;
            const isEffectivelyActive = b.active && !isExpired && !isExhausted;
            return (
              <Card key={b.id} className={`p-4 ${!isEffectivelyActive ? "opacity-60" : ""}`} data-testid={`card-boost-${b.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Zap className={`w-4 h-4 shrink-0 ${isEffectivelyActive ? "text-yellow-400" : "text-muted-foreground"}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" data-testid={`text-boost-name-${b.id}`}>{b.name}</span>
                        <span className="font-mono font-bold text-xs text-primary/80" data-testid={`text-boost-code-${b.id}`}>{b.code}</span>
                        <Badge variant={isEffectivelyActive ? "default" : "secondary"} className="text-xs">
                          {!b.active ? "Désactivé" : isExpired ? "Expiré" : isExhausted ? "Épuisé" : "Actif"}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono text-yellow-400/80 border-yellow-400/30">×{b.multiplier}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                        <span>Utilisations : <strong>{b.usedCount}</strong>{b.maxUses !== null ? ` / ${b.maxUses}` : " (illimité)"}</span>
                        {b.expiresAt && <span>Expire : {new Date(b.expiresAt).toLocaleDateString("fr-FR")}</span>}
                        <span>Par : {b.createdBy}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      title={b.active ? "Désactiver" : "Activer"}
                      onClick={() => handleToggle(b.id, b.active)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid={`button-toggle-boost-${b.id}`}
                    >
                      {b.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      title="Supprimer"
                      onClick={() => handleDelete(b.id, b.code)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-delete-boost-${b.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Nouveau boost jeu
            </DialogTitle>
            <DialogDescription>Créer un code boost qui multiplie les crédits gagnés dans STING.EXE.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="gb-name">Nom du boost</Label>
              <Input
                id="gb-name"
                data-testid="input-boost-name"
                placeholder="Double Crédit Weekend"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gb-code">Code</Label>
              <Input
                id="gb-code"
                data-testid="input-new-boost-code"
                placeholder="BOOST2X"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                className="font-mono"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gb-multiplier">Multiplicateur</Label>
              <Input
                id="gb-multiplier"
                data-testid="input-boost-multiplier"
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={newMultiplier}
                onChange={e => setNewMultiplier(parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">Ex : 2 = double les crédits gagnés (base max 20 × multiplicateur)</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gb-max">Nb max d'utilisations (optionnel)</Label>
              <Input
                id="gb-max"
                data-testid="input-boost-max-uses"
                type="number"
                min={1}
                placeholder="Illimité"
                value={newMaxUses}
                onChange={e => setNewMaxUses(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gb-expires">Date d'expiration (optionnel)</Label>
              <Input
                id="gb-expires"
                data-testid="input-boost-expires"
                type="datetime-local"
                value={newExpiresAt}
                onChange={e => setNewExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newCode.trim()}
              data-testid="button-confirm-create-boost"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SEARCH_TYPE_LABELS: Record<string, string> = {
  interne: "Interne",
  externe: "Externe",
  breach: "Breach",
  phone: "Téléphone",
  geoip: "GeoIP",
  leakosint: "LeakOSINT",
  dalton: "Dalton",
  nir: "NIR",
  sherlock: "Sherlock",
  xeuledoc: "Xeuledoc",
  fivem: "FiveM",
  wanted: "Wanted",
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  vip: "bg-amber-500/20 text-amber-400",
  pro: "bg-blue-500/20 text-blue-400",
  business: "bg-purple-500/20 text-purple-400",
  api: "bg-green-500/20 text-green-400",
};

function SearchLogsSection({ getAccessToken, isSuperAdmin }: { getAccessToken: () => Promise<string | null>; isSuperAdmin?: boolean }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: "", searchType: "", dateFrom: "", dateTo: "", query: "" });
  const [applied, setApplied] = useState({ userId: "", searchType: "", dateFrom: "", dateTo: "", query: "" });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleDeleteSearchLog(id: number) {
    setDeletingId(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/superadmin/search-logs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-logs"] });
      toast({ title: "Log supprimé" });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setDeletingId(null); }
  }

  async function handleClearSearchLogs() {
    if (!confirm("Supprimer TOUS les logs de recherche ?")) return;
    setClearing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/superadmin/search-logs/clear", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/search-logs"] });
      toast({ title: `${data.deleted} log(s) supprimé(s)` });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setClearing(false); }
  }

  const { data, isLoading, refetch } = useQuery<{ rows: SearchLog[]; total: number }>({
    queryKey: ["/api/admin/search-logs", applied, page],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (applied.userId) params.set("userId", applied.userId);
      if (applied.searchType) params.set("searchType", applied.searchType);
      if (applied.dateFrom) params.set("dateFrom", applied.dateFrom);
      if (applied.dateTo) params.set("dateTo", applied.dateTo);
      if (applied.query) params.set("query", applied.query);
      const res = await fetch(`/api/admin/search-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">User ID</Label>
            <Input data-testid="input-log-filter-userid" placeholder="UUID utilisateur" value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type de recherche</Label>
            <Select value={filters.searchType || "all"} onValueChange={v => setFilters(f => ({ ...f, searchType: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-log-filter-type">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(SEARCH_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Terme recherché</Label>
            <Input data-testid="input-log-filter-query" placeholder="email, ip, nom…" value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date début</Label>
            <Input data-testid="input-log-filter-datefrom" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date fin</Label>
            <Input data-testid="input-log-filter-dateto" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button data-testid="button-log-apply-filters" size="sm" className="h-8 flex-1" onClick={() => { setApplied({ ...filters }); setPage(1); }}>
              <Filter className="w-3.5 h-3.5 mr-1.5" />Filtrer
            </Button>
            <Button data-testid="button-log-reset-filters" size="sm" variant="outline" className="h-8" onClick={() => { const e = { userId: "", searchType: "", dateFrom: "", dateTo: "", query: "" }; setFilters(e); setApplied(e); setPage(1); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{data?.total ?? 0} log(s) trouvé(s)</span>
          {isSuperAdmin && (
            <Button size="sm" variant="destructive" className="h-7" onClick={handleClearSearchLogs} disabled={clearing} data-testid="button-clear-search-logs">
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Tout supprimer
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => refetch()} disabled={isLoading} data-testid="button-searchlog-refresh" title="Rafraîchir">
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-log-prev">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs">Page {page}/{totalPages || 1}</span>
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-log-next">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">Aucun log pour ces filtres.</Card>
      ) : (
        <div className="space-y-1.5">
          {data?.rows.map(log => (
            <Card key={log.id} className="px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`row-log-${log.id}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] px-1.5 py-0 font-mono uppercase ${TIER_COLORS[log.subscriptionTier] ?? "bg-muted text-muted-foreground"}`}>
                    {log.subscriptionTier}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {SEARCH_TYPE_LABELS[log.searchType] ?? log.searchType}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate max-w-[200px]" data-testid={`text-log-user-${log.id}`}>{log.username || log.email || log.userId}</span>
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]" data-testid={`text-log-query-${log.id}`}>{log.searchQuery}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                    <span data-testid={`text-log-results-${log.id}`}>{log.resultCount} résultat(s)</span>
                    {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                    <span>{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteSearchLog(log.id)}
                    disabled={deletingId === log.id}
                    data-testid={`button-delete-search-log-${log.id}`}
                  >
                    {deletingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StarsRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-5 h-5 cursor-pointer transition-colors ${(onChange ? (hover || rating) : rating) >= n ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(n)}
        />
      ))}
    </div>
  );
}

function AdminReviewsSection({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ rows: Review[]; total: number }>({
    queryKey: ["/api/admin/reviews", statusFilter, page],
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams({ status: statusFilter, page: String(page), limit: "20" });
      const res = await fetch(`/api/admin/reviews?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Avis mis à jour" });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de mettre à jour l'avis.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Avis supprimé" });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de supprimer l'avis.", variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    approved: { label: "Approuvé", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    rejected: { label: "Refusé", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {["all", "pending", "approved", "rejected"].map(s => (
          <button
            key={s}
            data-testid={`button-review-filter-${s}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              statusFilter === s
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            {s === "all" ? "Tous" : STATUS_CONFIG[s]?.label}
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-auto">{data?.total ?? 0} avis</span>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-reviews-prev">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page}/{totalPages || 1}</span>
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-reviews-next">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">Aucun avis pour ce filtre.</Card>
      ) : (
        <div className="space-y-3">
          {data?.rows.map(review => (
            <Card key={review.id} className="p-4 space-y-3" data-testid={`card-review-${review.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" data-testid={`text-review-user-${review.id}`}>{review.username || review.email || review.userId}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 border ${TIER_COLORS[review.subscriptionTier] ?? "bg-muted text-muted-foreground"}`}>
                      {review.subscriptionTier}
                    </Badge>
                    {review.verified && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Vérifié
                      </Badge>
                    )}
                    <Badge className={`text-[10px] px-1.5 py-0 border ml-auto ${STATUS_CONFIG[review.status]?.color ?? ""}`}>
                      {STATUS_CONFIG[review.status]?.label ?? review.status}
                    </Badge>
                  </div>
                  <StarsRating rating={review.rating} />
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-review-comment-${review.id}`}>{review.comment}</p>
                  <p className="text-[11px] text-muted-foreground/60">{new Date(review.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                {review.status !== "approved" && (
                  <Button size="sm" variant="outline" className="h-7 text-green-400 border-green-500/30 hover:bg-green-500/10 gap-1" onClick={() => updateMutation.mutate({ id: review.id, status: "approved" })} disabled={updateMutation.isPending} data-testid={`button-review-approve-${review.id}`}>
                    <ThumbsUp className="w-3.5 h-3.5" />Approuver
                  </Button>
                )}
                {review.status !== "rejected" && (
                  <Button size="sm" variant="outline" className="h-7 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1" onClick={() => updateMutation.mutate({ id: review.id, status: "rejected" })} disabled={updateMutation.isPending} data-testid={`button-review-reject-${review.id}`}>
                    <ThumbsDown className="w-3.5 h-3.5" />Refuser
                  </Button>
                )}
                {review.status !== "pending" && (
                  <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateMutation.mutate({ id: review.id, status: "pending" })} disabled={updateMutation.isPending} data-testid={`button-review-pending-${review.id}`}>
                    <RotateCcw className="w-3.5 h-3.5" />En attente
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 ml-auto" onClick={() => deleteMutation.mutate(review.id)} disabled={deleteMutation.isPending} data-testid={`button-review-delete-${review.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GameLogsSection({ getAccessToken, isSuperAdmin }: { getAccessToken: () => Promise<string | null>; isSuperAdmin?: boolean }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: "", dateFrom: "", dateTo: "" });
  const [applied, setApplied] = useState({ userId: "", dateFrom: "", dateTo: "" });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleDeleteGameLog(id: number) {
    setDeletingId(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/superadmin/game-logs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-logs"] });
      toast({ title: "Log supprimé" });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setDeletingId(null); }
  }

  async function handleClearGameLogs() {
    if (!confirm("Supprimer TOUS les logs de jeu ?")) return;
    setClearing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/superadmin/game-logs/clear", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-logs"] });
      toast({ title: `${data.deleted} log(s) supprimé(s)` });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setClearing(false); }
  }

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery<{ rows: GameLog[]; total: number }>({
    queryKey: ["/api/admin/game-logs", applied, page],
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (applied.userId) params.set("userId", applied.userId);
      if (applied.dateFrom) params.set("dateFrom", applied.dateFrom);
      if (applied.dateTo) params.set("dateTo", applied.dateTo);
      const res = await fetch(`/api/admin/game-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Erreur ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const rows: GameLog[] = Array.isArray(data?.rows) ? data.rows : [];
  const total: number = typeof data?.total === "number" ? data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const totalScore = rows.reduce((a, r) => a + (r.score ?? 0), 0);
  const totalCredits = rows.reduce((a, r) => a + (r.creditsEarned ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">User ID</Label>
            <Input data-testid="input-gamelog-userid" placeholder="UUID" value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date début</Label>
            <Input data-testid="input-gamelog-datefrom" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date fin</Label>
            <Input data-testid="input-gamelog-dateto" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button data-testid="button-gamelog-filter" size="sm" className="h-8 flex-1" onClick={() => { setApplied({ ...filters }); setPage(1); }}>
              <Filter className="w-3.5 h-3.5 mr-1.5" />Filtrer
            </Button>
            <Button data-testid="button-gamelog-reset" size="sm" variant="outline" className="h-8" onClick={() => { const e = { userId: "", dateFrom: "", dateTo: "" }; setFilters(e); setApplied(e); setPage(1); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button data-testid="button-gamelog-refresh" size="sm" variant="outline" className="h-8" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats + pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span>{total} partie(s)</span>
          {rows.length > 0 && (
            <>
              <span className="text-amber-400 font-medium">Score total : {totalScore.toLocaleString("fr-FR")}</span>
              <span className="text-primary font-medium">Crédits : {totalCredits.toLocaleString("fr-FR")}</span>
            </>
          )}
          {isSuperAdmin && (
            <Button size="sm" variant="destructive" className="h-7" onClick={handleClearGameLogs} disabled={clearing} data-testid="button-clear-game-logs">
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Tout supprimer
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-gamelog-prev">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs">Page {page}/{totalPages}</span>
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-gamelog-next">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <Card className="p-6 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Erreur lors du chargement des logs de jeu</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{(error as Error)?.message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Si la table <code className="bg-muted px-1 rounded text-[11px]">game_logs</code> n'existe pas encore sur le VPS, exécuter <code className="bg-muted px-1 rounded text-[11px]">npm run db:push</code> puis redémarrer.
              </p>
            </div>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">Aucun log de jeu pour ces filtres.</Card>
      ) : (
        <div className="space-y-1.5">
          {data.rows.map(log => (
            <Card key={log.id} className="px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`row-gamelog-${log.id}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="text-[10px] px-1.5 py-0 font-mono bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {log.score.toLocaleString("fr-FR")} pts
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary font-mono">
                    +{log.creditsEarned} cr
                  </Badge>
                  {log.boostMultiplier > 1 && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30">
                      x{log.boostMultiplier} {log.boostName ?? "Boost"}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate max-w-[160px]" data-testid={`text-gamelog-user-${log.id}`}>{log.username || "Agent"}</span>
                    {log.email && <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]" data-testid={`text-gamelog-email-${log.id}`}>{log.email}</span>}
                    {log.sessionEmail && log.sessionEmail !== log.email && (
                      <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[180px]">({log.sessionEmail})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                    {log.ipAddress && <span className="font-mono" data-testid={`text-gamelog-ip-${log.id}`}>{log.ipAddress}</span>}
                    {log.discordId && <span className="text-indigo-400 font-mono">@{log.discordId}</span>}
                    {log.uniqueId && <span className="font-mono">#{log.uniqueId}</span>}
                    <span>{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteGameLog(log.id)}
                    disabled={deletingId === log.id}
                    data-testid={`button-delete-game-log-${log.id}`}
                  >
                    {deletingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

class AdminErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-xl w-full space-y-4 text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Erreur dans le panel admin</h2>
            <p className="text-sm text-muted-foreground">Une erreur JavaScript s'est produite. Vérifiez la console du navigateur pour plus de détails.</p>
            <pre className="text-xs text-left bg-muted p-4 rounded-lg overflow-auto max-h-48 text-red-400 border border-destructive/20">
              {this.state.error?.message}
              {"\n"}
              {this.state.error?.stack}
            </pre>
            <Button onClick={() => this.setState({ hasError: false })}>Réessayer</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Admin Tickets Section ────────────────────────────────────────────────────
function AdminTicketsSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");

  const { data: ticketsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tickets", statusFilter],
    queryFn: async () => {
      const token = getAccessToken();
      const params = statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`/api/admin/tickets${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 30_000,
  });
  const tickets: any[] = Array.isArray(ticketsData) ? ticketsData : [];

  const { data: detail } = useQuery<{ ticket: any; replies: any[] }>({
    queryKey: ["/api/admin/tickets/detail", selectedId],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch(`/api/tickets/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: selectedId !== null,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const token = getAccessToken();
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets/detail"] });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: number) => {
      const token = getAccessToken();
      const res = await fetch(`/api/admin/tickets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      if (selectedId !== null) setSelectedId(null);
      toast({ title: "Ticket supprimé" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      const res = await fetch(`/api/tickets/${selectedId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets/detail", selectedId] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const STATUS_COLORS: Record<string, string> = {
    ouvert: "bg-green-500/15 text-green-400 border-green-500/30",
    "en cours": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    "fermé": "bg-muted text-muted-foreground border-border",
  };
  const PRIORITY_COLORS: Record<string, string> = {
    faible: "bg-muted text-muted-foreground border-border",
    moyen: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    urgent: "bg-destructive/15 text-destructive border-destructive/30",
  };

  if (selectedId !== null && detail) {
    const { ticket, replies } = detail;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Retour
          </Button>
          <h2 className="text-lg font-semibold flex-1 truncate">{ticket.subject}</h2>
          <Select value={ticket.status} onValueChange={v => updateStatus.mutate({ id: ticket.id, status: v })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ouvert">Ouvert</SelectItem>
              <SelectItem value="en cours">En cours</SelectItem>
              <SelectItem value="fermé">Fermé</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Supprimer ce ticket ?")) deleteTicket.mutate(ticket.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}>{ticket.status}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>{ticket.priority}</span>
          <span className="text-xs text-muted-foreground">{ticket.category}</span>
          <span className="text-xs text-muted-foreground">— {ticket.username} ({ticket.email})</span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {replies.map((r: any) => (
            <div key={r.id} className={`flex gap-2 ${r.isAdmin ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.isAdmin ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {r.isAdmin ? "A" : (r.username?.[0] ?? "?").toUpperCase()}
              </div>
              <div className={`flex-1 max-w-[80%] ${r.isAdmin ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <span className="text-xs text-muted-foreground">{r.isAdmin ? "Support" : r.username} · {new Date(r.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <div className={`rounded-xl px-3 py-2 text-sm ${r.isAdmin ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>{r.message}</div>
              </div>
            </div>
          ))}
        </div>
        {ticket.status !== "fermé" && (
          <div className="flex gap-2">
            <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Répondre au ticket..." rows={2} className="flex-1 resize-none" />
            <Button onClick={() => sendReply.mutate()} disabled={sendReply.isPending || !reply.trim()}>
              {sendReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold flex-1">Tickets Support</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ouvert">Ouverts</SelectItem>
            <SelectItem value="en cours">En cours</SelectItem>
            <SelectItem value="fermé">Fermés</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun ticket.</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <div key={t.id} onClick={() => setSelectedId(t.id)} className="p-4 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.username} ({t.email}) · {new Date(t.updatedAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[t.priority] ?? ""}`}>{t.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[t.status] ?? ""}`}>{t.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Chat Section ───────────────────────────────────────────────────────
function AdminChatSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/chat"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/chat", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const deleteMsg = useMutation({
    mutationFn: async (id: number) => {
      const token = getAccessToken();
      const res = await fetch(`/api/admin/chat/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/chat"] }),
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/chat", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat"] });
      toast({ title: "Chat effacé" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const muteUser = useMutation({
    mutationFn: async ({ userId, durationMinutes, reason }: { userId: string; durationMinutes?: number; reason?: string }) => {
      const token = getAccessToken();
      const res = await fetch("/api/admin/chat/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, durationMinutes, reason }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => toast({ title: "Utilisateur muté" }),
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const unmuteUser = useMutation({
    mutationFn: async (userId: string) => {
      const token = getAccessToken();
      const res = await fetch(`/api/admin/chat/mute/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => toast({ title: "Utilisateur démuté" }),
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const TIER_COLORS: Record<string, string> = {
    admin: "text-red-400", pro: "text-yellow-400", vip: "text-primary",
    business: "text-purple-400", api: "text-green-400", free: "text-muted-foreground",
  };
  const CHAT_TIER_BADGE: Record<string, { cls: string; label: string }> = {
    admin:    { cls: "bg-red-500/20 text-red-400 border-red-500/40",          label: "ADMIN" },
    pro:      { cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", label: "PRO" },
    vip:      { cls: "bg-primary/20 text-primary border-primary/40",          label: "VIP" },
    business: { cls: "bg-purple-500/20 text-purple-400 border-purple-500/40", label: "BUSINESS" },
    api:      { cls: "bg-green-500/20 text-green-400 border-green-500/40",    label: "API" },
    free:     { cls: "bg-muted/60 text-muted-foreground border-border",       label: "FREE" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold flex-1">Chat Global — Modération</h2>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1"><RefreshCw className="w-3.5 h-3.5" /> Rafraîchir</Button>
        <Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Effacer tous les messages ?")) clearAll.mutate(); }} className="gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Tout effacer
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (messages as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun message dans le chat.</div>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {(messages as any[]).map((m: any) => (
            <div key={m.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 group transition-colors">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" /> : <span className={TIER_COLORS[m.tier] ?? ""}>{m.username?.[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold ${TIER_COLORS[m.tier] ?? ""}`}>{m.username}</span>
                  <span className={`text-[9px] px-1.5 py-px rounded border font-bold tracking-wide ${CHAT_TIER_BADGE[m.tier]?.cls ?? CHAT_TIER_BADGE.free.cls}`}>
                    {CHAT_TIER_BADGE[m.tier]?.label ?? "FREE"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm break-all">{m.message}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => deleteMsg.mutate(m.id)} className="text-muted-foreground hover:text-destructive p-1" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { const d = window.prompt("Durée du mute (min, vide=perm):"); if (d === null) return; const r = window.prompt("Raison :") ?? undefined; muteUser.mutate({ userId: m.userId, durationMinutes: d ? parseInt(d) : undefined, reason: r || undefined }); }} className="text-muted-foreground hover:text-yellow-500 p-1" title="Muter">
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => unmuteUser.mutate(m.userId)} className="text-muted-foreground hover:text-green-500 p-1" title="Démuter">
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPageInner() {
  const { user, role, loading: authLoading, getAccessToken, uniqueId } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Acces interdit</h2>
          <p className="text-muted-foreground text-sm">
            Cette page est reservee aux administrateurs.
          </p>
          <Button onClick={() => navigate("/")} data-testid="button-go-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour a l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  const activeTabDef = ADMIN_TABS.find(t => t.key === activeTab)!;
  const activeGroup = ADMIN_GROUPS.find(g => g.key === activeTabDef.group)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-[1440px] mx-auto h-14 flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Discreen" className="w-7 h-7 rounded-md object-contain shrink-0" />
            <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
              Di<span className="text-primary">screen</span>
            </span>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4" data-testid="badge-admin">ADMIN</Badge>
            <span className="text-border mx-1 hidden sm:block">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <activeGroup.icon className={`w-3.5 h-3.5 ${activeGroup.color}`} />
              <span className={activeGroup.color}>{activeGroup.label}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{activeTabDef.shortLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <MaintenanceToggle getAccessToken={getAccessToken} />
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="button-back-home" className="h-8">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile Tab Strip ── */}
      <div className="lg:hidden border-b border-border/40 bg-background/80 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0.5 px-3 py-1.5 min-w-max">
          {ADMIN_GROUPS.map(group => {
            const groupTabs = ADMIN_TABS.filter(t => t.group === group.key);
            const isGroupActive = groupTabs.some(t => t.key === activeTab);
            const GroupIcon = group.icon;
            return (
              <div key={group.key} className="relative">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isGroupActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => {
                    const first = groupTabs[0];
                    if (first) setActiveTab(first.key);
                  }}
                  data-testid={`button-mobile-group-${group.key}`}
                >
                  <GroupIcon className={`w-3.5 h-3.5 ${isGroupActive ? "text-primary" : group.color}`} />
                  {group.label}
                </button>
              </div>
            );
          })}
        </div>
        {/* Sub-tabs for active group */}
        <div className="flex items-center gap-0.5 px-3 pb-1.5 min-w-max border-t border-border/20 mt-0.5 pt-1">
          {ADMIN_TABS.filter(t => t.group === activeTabDef.group).map(tab => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-mobile-tab-${tab.key}`}
              >
                <Icon className="w-3 h-3" />
                {tab.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-[1440px] mx-auto flex min-h-[calc(100vh-3.5rem)]">

        {/* ── Sidebar ── */}
        <nav className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border-r border-border/40 bg-background/50">
          <div className="flex-1 overflow-y-auto py-3 space-y-4 sticky top-14 max-h-[calc(100vh-3.5rem)]">
            {ADMIN_GROUPS.map(group => {
              const groupTabs = ADMIN_TABS.filter(t => t.group === group.key);
              const GroupIcon = group.icon;
              return (
                <div key={group.key}>
                  {/* Group header */}
                  <div className={`flex items-center gap-2 px-3 mb-1`}>
                    <GroupIcon className={`w-3.5 h-3.5 ${group.color}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${group.color} opacity-80`}>{group.label}</span>
                  </div>
                  {/* Group tabs */}
                  <div className="space-y-0.5 px-1.5">
                    {groupTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = tab.key === activeTab;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left group relative ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                          data-testid={`button-tab-${tab.key}`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                          )}
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                          <span className="flex-1 truncate text-[13px]">{tab.shortLabel}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-primary/60" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Section header */}
          <div className="border-b border-border/40 px-5 xl:px-8 py-4 bg-background/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg bg-muted/60 shrink-0`}>
                  <activeTabDef.icon className={`w-5 h-5 ${activeGroup.color}`} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold leading-tight truncate" data-testid="text-section-title">{activeTabDef.label}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug hidden sm:block">{activeTabDef.description}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${activeGroup.color} border-current/30`}>
                {activeGroup.label}
              </Badge>
            </div>
          </div>

          {/* Section body */}
          <div className="flex-1 px-5 xl:px-8 py-5">
            {activeTab === "users" && (
              <UsersSection getAccessToken={getAccessToken} userId={user.id} />
            )}
            {activeTab === "keys" && (
              <KeysSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "blacklist" && (
              <BlacklistSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "info" && (
              <InfoRequestsSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "wanted" && (
              <WantedSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "dof" && (
              <DofSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "ipblock" && (
              <IpBlacklistSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "logs" && (
              <LoginLogsSection getAccessToken={getAccessToken} isSuperAdmin={uniqueId === 1} />
            )}
            {activeTab === "search-logs" && (
              <SearchLogsSection getAccessToken={getAccessToken} isSuperAdmin={uniqueId === 1} />
            )}
            {activeTab === "game-logs" && (
              <GameLogsSection getAccessToken={getAccessToken} isSuperAdmin={uniqueId === 1} />
            )}
            {activeTab === "reviews" && (
              <AdminReviewsSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "notifications" && (
              <NotificationsSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "game-boosts" && (
              <GameBoostsSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "discounts" && (
              <DiscountCodesSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "services" && (
              <ServiceStatusSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "tickets" && (
              <AdminTicketsSection getAccessToken={getAccessToken} />
            )}
            {activeTab === "chat" && (
              <AdminChatSection getAccessToken={getAccessToken} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminPageInner />
    </AdminErrorBoundary>
  );
}
