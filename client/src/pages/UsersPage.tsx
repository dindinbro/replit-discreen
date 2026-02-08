import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Loader2, Crown, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useMemo } from "react";

interface PublicUser {
  id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Rejoint aujourd'hui";
  if (diffDays === 1) return "Rejoint hier";
  if (diffDays < 30) return `Rejoint il y a ${diffDays} jours`;

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `Rejoint le ${day}/${month}/${year}`;
}

function getDisplayIdentifier(user: PublicUser): string {
  if (user.display_name) return user.display_name;
  return "Utilisateur";
}

function getInitials(user: PublicUser): string {
  const name = user.display_name || "U";
  return name.slice(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-yellow-500/50 text-yellow-500"
      data-testid={`badge-role-${role}`}
    >
      <Crown className="w-3 h-3" />
      {role.toUpperCase()}
    </Badge>
  );
}

function UserCard({ user }: { user: PublicUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover-elevate" data-testid={`card-user-${user.id}`}>
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="w-12 h-12 border-2 border-primary/30">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={getDisplayIdentifier(user)} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-bold text-foreground truncate"
                data-testid={`text-user-displayname-${user.id}`}
              >
                {getDisplayIdentifier(user)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-user-joined-${user.id}`}>
              {formatJoinDate(user.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<{ users: PublicUser[] }>({
    queryKey: ["/api/users"],
  });

  const users = data?.users || [];

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) => u.display_name && u.display_name.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const adminUsers = filteredUsers.filter((u) => u.role === "admin");

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-users">
            Utilisateurs
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          L'equipe derriere Discreen
        </p>
      </motion.div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {adminUsers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-yellow-500" />
                <h2 className="font-semibold text-lg" data-testid="heading-admin-section">
                  ADMIN
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({adminUsers.length})
                </span>
              </div>
              <div className="space-y-2">
                {adminUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground" data-testid="text-no-users">
                  Aucun utilisateur trouve.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
