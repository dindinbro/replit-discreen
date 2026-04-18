import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Users, Loader2, Trash2, Send, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Review } from "@shared/schema";

interface Vouch {
  id: number;
  discordUserId: string;
  discordUsername: string;
  discordAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

function StarsDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${cls} ${i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-7 h-7 cursor-pointer transition-all ${(hover || value) >= n ? "text-amber-400 fill-amber-400 scale-110" : "text-muted-foreground/40 hover:text-amber-300"}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          data-testid={`star-${n}`}
        />
      ))}
      {value > 0 && <span className="text-sm text-amber-400 ml-2 font-medium">{["", "Mauvais", "Passable", "Bien", "Très bien", "Excellent"][value]}</span>}
    </div>
  );
}

function VouchCard({ vouch, index, isAdmin, onDelete }: { vouch: Vouch; index: number; isAdmin: boolean; onDelete: (id: number) => void }) {
  const formattedDate = new Date(vouch.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }}>
      <Card className="hover-elevate" data-testid={`card-vouch-${vouch.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              {vouch.discordAvatar ? (
                <img src={vouch.discordAvatar} alt={vouch.discordUsername} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <SiDiscord className="w-5 h-5 text-indigo-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" data-testid={`text-vouch-username-${vouch.id}`}>{vouch.discordUsername}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 gap-1 text-indigo-400 border-indigo-500/30">
                    <SiDiscord className="w-2.5 h-2.5" />Discord
                  </Badge>
                  <StarsDisplay rating={vouch.rating} />
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(vouch.id)} data-testid={`button-delete-vouch-${vouch.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed" data-testid={`text-vouch-comment-${vouch.id}`}>{vouch.comment}</p>
              <span className="text-xs text-muted-foreground/60 mt-1.5 inline-block">{formattedDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReviewCard({ review, index, isAdmin, onDelete }: { review: Review; index: number; isAdmin: boolean; onDelete: (id: number) => void }) {
  const formattedDate = new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const TIER_LABEL: Record<string, string> = { free: "Free", vip: "VIP", pro: "PRO", business: "Business", api: "API" };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }}>
      <Card className="hover-elevate" data-testid={`card-review-${review.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {(review.username || review.email || "?")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" data-testid={`text-review-username-${review.id}`}>{review.username || review.email?.split("@")[0] || "Utilisateur"}</span>
                  {review.subscriptionTier !== "free" && (
                    <Badge variant="outline" className="text-[10px] px-1.5">{TIER_LABEL[review.subscriptionTier] ?? review.subscriptionTier}</Badge>
                  )}
                  {review.verified && (
                    <Badge className="text-[10px] px-1.5 gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                      <ShieldCheck className="w-2.5 h-2.5" />Vérifié
                    </Badge>
                  )}
                  <StarsDisplay rating={review.rating} />
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(review.id)} data-testid={`button-delete-review-${review.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed" data-testid={`text-review-comment-${review.id}`}>{review.comment}</p>
              <span className="text-xs text-muted-foreground/60 mt-1.5 inline-block">{formattedDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { toast } = useToast();
  const { getAccessToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || `Erreur ${res.status}`);
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Avis envoyé !", description: "Votre avis est en attente de validation par un administrateur." });
      onSubmitted();
    },
    onError: (err: Error) => {
      toast({ title: "Impossible d'envoyer l'avis", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = rating > 0 && comment.trim().length >= 10;

  return (
    <Card className="border-primary/20 bg-primary/3">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">Laisser un avis</h3>
          <p className="text-sm text-muted-foreground">Partagez votre expérience avec Discreen. Votre avis sera examiné avant publication.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Note</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Commentaire <span className="text-muted-foreground font-normal">({comment.length}/1000)</span></label>
          <Textarea
            data-testid="input-review-comment"
            placeholder="Décrivez votre expérience… (min. 10 caractères)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            className="resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button data-testid="button-submit-review" disabled={!canSubmit || submitMutation.isPending} onClick={() => submitMutation.mutate()} className="gap-2">
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer l'avis
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />En attente de modération
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VouchesPage() {
  const { user, role, getAccessToken } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: vouches, isLoading: vouchesLoading } = useQuery<Vouch[]>({
    queryKey: ["/api/vouches"],
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<{ rows: Review[]; total: number }>({
    queryKey: ["/api/reviews"],
  });

  const { data: userReview } = useQuery<Review | null>({
    queryKey: ["/api/reviews/me"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/reviews/me", {
        headers: { Authorization: `Bearer ${await (getAccessToken as () => Promise<string | null>)()}` },
      });
      if (res.status === 404) return null;
      return res.json();
    },
  });

  const deleteVouchMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await (getAccessToken as () => Promise<string | null>)();
      const res = await fetch(`/api/vouches/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouches"] });
      toast({ title: "Avis supprimé" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await (getAccessToken as () => Promise<string | null>)();
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Avis supprimé" });
    },
  });

  const approvedReviews = reviewsData?.rows ?? [];
  const totalReviews = (vouches?.length ?? 0) + approvedReviews.length;
  const allRatings = [...(vouches?.map(v => v.rating) ?? []), ...approvedReviews.map(r => r.rating)];
  const avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : "0.0";

  const canLeaveReview = !!user && !userReview && !submitted;
  const hasSubmittedReview = !!userReview || submitted;

  const isLoading = vouchesLoading || reviewsLoading;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container max-w-5xl mx-auto px-4 py-14 text-center">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            Avis clients
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Ce que pensent nos utilisateurs</h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Avis vérifiés issus de notre plateforme et de notre communauté Discord.
          </p>

          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="flex flex-col items-center" data-testid="stat-total-reviews">
              <div className="flex items-center gap-1.5 text-2xl font-bold">
                <Users className="w-5 h-5 text-primary" />
                {totalReviews}
              </div>
              <span className="text-xs text-muted-foreground mt-1">Avis au total</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col items-center" data-testid="stat-avg-rating">
              <div className="flex items-center gap-1.5 text-2xl font-bold">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                {avgRating}
              </div>
              <span className="text-xs text-muted-foreground mt-1">Note moyenne</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col items-center" data-testid="stat-verified">
              <div className="flex items-center gap-1.5 text-2xl font-bold">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                {approvedReviews.filter(r => r.verified).length}
              </div>
              <span className="text-xs text-muted-foreground mt-1">Avis vérifiés</span>
            </div>
          </div>

          {user && !showForm && !hasSubmittedReview && (
            <Button className="mt-8 gap-2" onClick={() => setShowForm(true)} data-testid="button-open-review-form">
              <Star className="w-4 h-4" />
              Laisser un avis
            </Button>
          )}
          {hasSubmittedReview && (
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-full px-4 py-2">
              <Clock className="w-4 h-4" />
              {userReview?.status === "approved" ? "Votre avis a été publié." : "Votre avis est en attente de modération."}
            </div>
          )}
          {!user && (
            <p className="mt-6 text-sm text-muted-foreground">
              <a href="/auth" className="text-primary hover:underline">Connectez-vous</a> pour laisser un avis.
            </p>
          )}
        </div>
      </section>

      <section className="container max-w-3xl mx-auto px-4 py-10 space-y-6">
        {showForm && canLeaveReview && (
          <ReviewForm onSubmitted={() => { setShowForm(false); setSubmitted(true); queryClient.invalidateQueries({ queryKey: ["/api/reviews/me"] }); }} />
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (approvedReviews.length === 0 && (!vouches || vouches.length === 0)) ? (
          <Card>
            <CardContent className="p-10 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun avis pour le moment.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Soyez le premier à partager votre expérience.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {approvedReviews.map((review, i) => (
              <ReviewCard
                key={`review-${review.id}`}
                review={review}
                index={i}
                isAdmin={isAdmin}
                onDelete={id => {
                  if (confirm("Supprimer cet avis ?")) deleteReviewMutation.mutate(id);
                }}
              />
            ))}
            {vouches && vouches.length > 0 && (
              <>
                {approvedReviews.length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <SiDiscord className="w-3 h-3 text-indigo-400" />Avis Discord
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}
                {vouches.map((vouch, i) => (
                  <VouchCard
                    key={`vouch-${vouch.id}`}
                    vouch={vouch}
                    index={i}
                    isAdmin={isAdmin}
                    onDelete={id => {
                      if (confirm("Supprimer cet avis ?")) deleteVouchMutation.mutate(id);
                    }}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
