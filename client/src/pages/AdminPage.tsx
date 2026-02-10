import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, BlacklistRequest, BlacklistEntry, InfoRequest, WantedProfile, InsertWantedProfile, InsertBlacklistEntry } from "@shared/schema";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getIconComponent, AVAILABLE_ICONS } from "@/components/CategoriesPanel";

interface UserProfile {
  id: string;
  email: string;
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

type AdminTab = "users" | "blacklist" | "info" | "wanted";

const ADMIN_TABS: { key: AdminTab; label: string; icon: typeof Users }[] = [
  { key: "users", label: "Gestion des utilisateurs", icon: Users },
  { key: "blacklist", label: "Demandes de blacklist", icon: ShieldBan },
  { key: "info", label: "Demandes d'information", icon: FileText },
  { key: "wanted", label: "Wanted", icon: Crosshair },
];

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

function WantedProfileForm({ getAccessToken }: { getAccessToken: () => string | null }) {
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
    notes: ""
  });

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, ""]);
  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(prev => prev.filter((_, i) => i !== index));
  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => setter(prev => prev.map((v, i) => i === index ? value : v));

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

      const res = await fetch("/api/admin/wanted-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: "Profil cree", description: "Le profil Wanted a ete ajoute avec succes." });
        setForm({
          nom: "", prenom: "", adresse: "",
          ville: "", codePostal: "", civilite: "M.", dateNaissance: "",
          pseudo: "", discord: "", discordId: "", password: "", iban: "", notes: ""
        });
        setEmails([""]);
        setPhones([""]);
        setIps([""]);
        setDiscordIds([""]);
        setAddresses([""]);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/wanted-profiles"] });
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

        <div className="space-y-2">
          <label className="text-sm font-medium">IBAN</label>
          <Input value={form.iban || ""} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} placeholder="FR76..." data-testid="input-iban" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes / Signalement</label>
          <Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Informations complementaires..." className="min-h-[100px]" data-testid="input-notes" />
        </div>

        <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-wanted">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Entrer les informations
        </Button>
      </form>
    </Card>
  );
}

function WantedHistorySection({ getAccessToken }: { getAccessToken: () => string | null }) {
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
      ((p as any).addresses || []).some((a: string) => a.toLowerCase().includes(q))
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
                    {profile.password && <div><span className="text-muted-foreground">MDP:</span> {profile.password}</div>}
                    {profile.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {profile.notes}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
                  </div>
                </div>
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

function UsersSection({ getAccessToken, userId }: { getAccessToken: () => string | null; userId: string }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");

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
    const username = u.email.split("@")[0].toLowerCase();
    const uid = u.unique_id ? `${u.unique_id}` : u.id.slice(0, 8);
    return username.includes(q) || u.email.toLowerCase().includes(q) || uid.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="pl-9"
          data-testid="input-user-search"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun utilisateur trouve.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => {
            const currentRole = pendingChanges[u.id] || u.role;
            const hasChange = pendingChanges[u.id] !== undefined && pendingChanges[u.id] !== u.role;
            const username = u.email.split("@")[0];
            const shortId = u.unique_id ? `${u.unique_id}` : u.id.slice(0, 8).toUpperCase();

            return (
              <Card key={u.id} className={`p-4 ${u.frozen ? "border-blue-500/50 bg-blue-500/5" : ""}`} data-testid={`card-user-${u.id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid={`text-username-${u.id}`}>{username}</p>
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

function WantedSection({ getAccessToken }: { getAccessToken: () => string | null }) {
  const [wantedSubTab, setWantedSubTab] = useState<"form" | "history">("form");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={wantedSubTab === "form" ? "default" : "outline"}
          onClick={() => setWantedSubTab("form")}
          className="toggle-elevate"
          data-testid="button-wanted-form-tab"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter un profil
        </Button>
        <Button
          variant={wantedSubTab === "history" ? "default" : "outline"}
          onClick={() => setWantedSubTab("history")}
          className="toggle-elevate"
          data-testid="button-wanted-history-tab"
        >
          <Clock className="w-4 h-4 mr-2" />
          Historique
        </Button>
      </div>

      {wantedSubTab === "form" ? (
        <WantedProfileForm getAccessToken={getAccessToken} />
      ) : (
        <WantedHistorySection getAccessToken={getAccessToken} />
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, role, loading: authLoading, getAccessToken } = useAuth();
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

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto h-16 flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Di<span className="text-primary">screen</span>
            </span>
            <Badge variant="destructive" className="ml-2" data-testid="badge-admin">Admin</Badge>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1">
              {ADMIN_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors text-left ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover-elevate"
                    }`}
                    data-testid={`button-tab-${tab.key}`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-display font-bold" data-testid="text-section-title">
                {ADMIN_TABS.find(t => t.key === activeTab)?.label}
              </h1>
            </div>

            {activeTab === "users" && (
              <UsersSection getAccessToken={getAccessToken} userId={user.id} />
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
          </main>
        </div>
      </div>
    </div>
  );
}
