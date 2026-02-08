import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, BlacklistRequest, BlacklistEntry, InfoRequest } from "@shared/schema";
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

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
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
      if (!token) throw new Error("Non authentifié");

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
      toast({ title: editCategory ? "Catégorie mise à jour" : "Catégorie créée" });
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
            {editCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <DialogDescription>
            {editCategory ? "Modifiez les informations de la catégorie." : "Ajoutez une nouvelle catégorie pour organiser vos bases de données."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nom</label>
            <Input
              data-testid="input-category-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Réseaux sociaux"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Input
              data-testid="input-category-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ex: Bases de données des réseaux sociaux"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Icône</label>
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
              <p className="font-medium text-sm">{form.name || "Aperçu"}</p>
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
              {editCategory ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { user, role, loading: authLoading, getAccessToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "admin") return;

    async function fetchUsers() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else {
          toast({ title: "Erreur", description: "Impossible de charger les utilisateurs", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erreur", description: "Erreur réseau", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    }

    fetchUsers();
  }, [authLoading, user, role, getAccessToken, toast]);

  const handleRoleChange = (userId: string, newRole: string) => {
    setPendingChanges(prev => ({ ...prev, [userId]: newRole }));
  };

  const saveRole = async (userId: string) => {
    const newRole = pendingChanges[userId];
    if (!newRole) return;

    const token = getAccessToken();
    if (!token) return;

    setSavingId(userId);

    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setPendingChanges(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        toast({ title: "Rôle mis à jour", description: `Rôle changé en "${newRole}"` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.message || "Impossible de changer le rôle", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur réseau", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const toggleFreeze = async (userId: string, freeze: boolean) => {
    const token = getAccessToken();
    if (!token) return;

    setFreezingId(userId);

    try {
      const res = await fetch("/api/admin/freeze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, frozen: freeze }),
      });

      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, frozen: freeze } : u));
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

  const deleteCategory = async (id: number) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        toast({ title: "Catégorie supprimée" });
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur réseau", variant: "destructive" });
    }
  };

  const [blacklistRequests, setBlacklistRequests] = useState<BlacklistRequest[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const [infoRequests, setInfoRequests] = useState<InfoRequest[]>([]);
  const [loadingInfoRequests, setLoadingInfoRequests] = useState(true);
  const [processingInfoRequestId, setProcessingInfoRequestId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !user || role !== "admin") return;
    async function fetchBlacklistRequests() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/blacklist-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setBlacklistRequests(await res.json());
        }
      } catch {}
      setLoadingBlacklist(false);
    }
    async function fetchInfoRequests() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/info-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setInfoRequests(await res.json());
        }
      } catch {}
      setLoadingInfoRequests(false);
    }
    fetchBlacklistRequests();
    fetchInfoRequests();
  }, [authLoading, user, role, getAccessToken]);

  const updateRequestStatus = async (requestId: number, status: "approved" | "rejected") => {
    const token = getAccessToken();
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      const res = await fetch(`/api/admin/blacklist-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    setProcessingRequestId(null);
  };

  const updateInfoRequestStatus = async (requestId: number, status: "approved" | "rejected" | "completed") => {
    const token = getAccessToken();
    if (!token) return;
    setProcessingInfoRequestId(requestId);
    try {
      const res = await fetch(`/api/admin/info-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    setProcessingInfoRequestId(null);
  };

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
          <h2 className="text-xl font-semibold">Accès interdit</h2>
          <p className="text-muted-foreground text-sm">
            Cette page est réservée aux administrateurs.
          </p>
          <Button onClick={() => navigate("/")} data-testid="button-go-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
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

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-10">
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">Gestion des utilisateurs</h1>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
                data-testid="input-user-search"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun utilisateur trouvé.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {users.filter(u => {
                if (!userSearch.trim()) return true;
                const q = userSearch.toLowerCase();
                const username = u.email.split("@")[0].toLowerCase();
                const uid = u.unique_id ? `${u.unique_id}` : u.id.slice(0, 8);
                return username.includes(q) || u.email.toLowerCase().includes(q) || uid.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
              }).map(u => {
                const currentRole = pendingChanges[u.id] || u.role;
                const hasChange = pendingChanges[u.id] !== undefined && pendingChanges[u.id] !== u.role;
                const username = u.email.split("@")[0];
                const shortId = u.unique_id ? `${u.unique_id}` : u.id.slice(0, 8).toUpperCase();

                return (
                  <Card key={u.id} className={`p-4 ${u.frozen ? "border-blue-500/50 bg-blue-500/5" : ""}`} data-testid={`card-user-${u.id}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium" data-testid={`text-username-${u.id}`}>
                            {username}
                          </p>
                          <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-id-${u.id}`}>
                            #{shortId}
                          </Badge>
                          {u.frozen && (
                            <Badge variant="secondary" className="gap-1 text-blue-500" data-testid={`badge-frozen-${u.id}`}>
                              <Snowflake className="w-3 h-3" />
                              Gele
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-email-${u.id}`}>
                          {u.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={currentRole}
                          onValueChange={(val) => handleRoleChange(u.id, val)}
                          disabled={u.id === user.id}
                        >
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
                          <Button
                            size="sm"
                            onClick={() => saveRole(u.id)}
                            disabled={savingId === u.id}
                            data-testid={`button-save-role-${u.id}`}
                          >
                            {savingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" />
                                Sauvegarder
                              </>
                            )}
                          </Button>
                        )}

                        {u.id !== user.id && (
                          <Button
                            variant={u.frozen ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleFreeze(u.id, !u.frozen)}
                            disabled={freezingId === u.id}
                            title={u.frozen ? "Degeler le compte" : "Geler le compte"}
                            data-testid={`button-freeze-${u.id}`}
                          >
                            {freezingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Snowflake className="w-4 h-4 mr-1" />
                                {u.frozen ? "Degeler" : "Geler"}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldBan className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-bold">Demandes de blacklist</h2>
          </div>

          {loadingBlacklist ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : blacklistRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune demande de blacklist.</p>
            </Card>
          ) : (
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
                          <Button
                            size="sm"
                            onClick={() => updateRequestStatus(req.id, "approved")}
                            disabled={processingRequestId === req.id}
                            data-testid={`button-approve-${req.id}`}
                          >
                            {processingRequestId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Approuver</>}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateRequestStatus(req.id, "rejected")}
                            disabled={processingRequestId === req.id}
                            data-testid={`button-reject-${req.id}`}
                          >
                            {processingRequestId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" />Rejeter</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-bold">Demandes d'information</h2>
          </div>

          {loadingInfoRequests ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : infoRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune demande d'information.</p>
            </Card>
          ) : (
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
                          <Button
                            size="sm"
                            onClick={() => updateInfoRequestStatus(req.id, "approved")}
                            disabled={processingInfoRequestId === req.id}
                            data-testid={`button-approve-info-${req.id}`}
                          >
                            {processingInfoRequestId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Approuver</>}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateInfoRequestStatus(req.id, "rejected")}
                            disabled={processingInfoRequestId === req.id}
                            data-testid={`button-reject-info-${req.id}`}
                          >
                            {processingInfoRequestId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" />Rejeter</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-display font-bold">Gestion des catégories</h2>
            </div>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setCategoryDialogOpen(true);
              }}
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {loadingCategories ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !categories || categories.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune catégorie. Cliquez sur "Ajouter" pour en créer une.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const Icon = getIconComponent(cat.icon);
                return (
                  <Card key={cat.id} className="p-4" data-testid={`card-category-${cat.id}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {cat.name}
                          </p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryDialogOpen(true);
                          }}
                          title="Modifier"
                          data-testid={`button-edit-category-${cat.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCategory(cat.id)}
                          title="Supprimer"
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        editCategory={editingCategory}
        getAccessToken={getAccessToken}
      />
    </div>
  );
}
