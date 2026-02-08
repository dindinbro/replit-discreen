import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Users, Loader2, Trash2 } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Vouch {
  id: number;
  discordUserId: string;
  discordUsername: string;
  discordAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

function StarsDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function VouchCard({ vouch, index, isAdmin, onDelete }: { vouch: Vouch; index: number; isAdmin: boolean; onDelete: (id: number) => void }) {
  const date = new Date(vouch.createdAt);
  const formattedDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="hover-elevate" data-testid={`card-vouch-${vouch.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0" data-testid={`img-avatar-${vouch.id}`}>
              {vouch.discordAvatar ? (
                <img
                  src={vouch.discordAvatar}
                  alt={vouch.discordUsername}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <SiDiscord className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" data-testid={`text-vouch-username-${vouch.id}`}>
                    {vouch.discordUsername}
                  </span>
                  <StarsDisplay rating={vouch.rating} />
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(vouch.id)}
                    data-testid={`button-delete-vouch-${vouch.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1.5" data-testid={`text-vouch-comment-${vouch.id}`}>
                {vouch.comment}
              </p>
              <span className="text-xs text-muted-foreground/60 mt-2 inline-block">
                {formattedDate}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VouchesPage() {
  const { role, getAccessToken } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const { data: vouches, isLoading } = useQuery<Vouch[]>({
    queryKey: ["/api/vouches"],
    refetchInterval: 5000, // Actualisation toutes les 5 secondes
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = getAccessToken();
      const res = await fetch(`/api/vouches/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la suppression");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouches"] });
      toast({
        title: "Succès",
        description: "L'avis a été supprimé.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const avgRating = vouches && vouches.length > 0
    ? (vouches.reduce((sum, v) => sum + v.rating, 0) / vouches.length).toFixed(1)
    : "0";

  const totalVouches = vouches?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container max-w-5xl mx-auto px-4 py-16 text-center">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <SiDiscord className="w-3 h-3" />
            Avis Discord
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Avis de la communaute
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Les avis sont publies via notre <a href="https://discord.gg/discreen" target="_blank" rel="noopener noreferrer" className="text-primary">bot Discord</a> avec la commande <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">/vouch</code>
          </p>

          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex flex-col items-center" data-testid="stat-total-vouches">
              <div className="flex items-center gap-1.5 text-2xl font-bold">
                <Users className="w-5 h-5 text-primary" />
                {totalVouches}
              </div>
              <span className="text-xs text-muted-foreground mt-1">Avis</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col items-center" data-testid="stat-avg-rating">
              <div className="flex items-center gap-1.5 text-2xl font-bold">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                {avgRating}
              </div>
              <span className="text-xs text-muted-foreground mt-1">Note moyenne</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container max-w-3xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : vouches && vouches.length > 0 ? (
          <div className="flex flex-col gap-3">
            {vouches.map((vouch, index) => (
              <VouchCard
                key={vouch.id}
                vouch={vouch}
                index={index}
                isAdmin={isAdmin}
                onDelete={(id) => {
                  if (confirm("Voulez-vous vraiment supprimer cet avis ?")) {
                    deleteMutation.mutate(id);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun avis pour le moment.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                <a href="https://discord.gg/discreen" target="_blank" rel="noopener noreferrer" className="text-primary">Rejoignez notre Discord</a> et utilisez <code className="bg-secondary px-1 py-0.5 rounded">/vouch</code> pour laisser un avis.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
