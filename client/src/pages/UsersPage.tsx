import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Disc3, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface DofProfile {
  id: number;
  pseudo: string;
  description: string;
  imageUrl: string;
  tier: string;
  sortOrder: number;
}

function ProfileCard({ profile, index }: { profile: DofProfile; index: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasImage = !!profile.imageUrl;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
        className="w-[280px] sm:w-[300px] flex-shrink-0"
        data-testid={`card-dof-${profile.pseudo}`}
      >
        <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
          <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
            {hasImage ? (
              <img
                src={profile.imageUrl}
                alt={profile.pseudo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                onClick={() => setModalOpen(true)}
                data-testid={`img-profile-${profile.pseudo}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/50 border border-border flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl font-bold text-muted-foreground/40">
                      {profile.pseudo.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted-foreground/40 text-xs">Aucune photo</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 space-y-1.5">
            <h3 className="text-lg font-bold tracking-wide uppercase flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400">{profile.pseudo}</span>
            </h3>
            <p className="text-sm text-foreground/70 font-medium">
              {profile.tier === "diamant" ? "Disque de Diamant" : profile.tier === "platine" ? "Disque de Platine" : "Label"}
            </p>
            {profile.description && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">{profile.description}</p>
            )}
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {modalOpen && hasImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={profile.imageUrl}
                alt={profile.pseudo}
                className="max-w-full max-h-[85vh] rounded-lg object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SmallProfileCard({ profile, index }: { profile: DofProfile; index: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasImage = !!profile.imageUrl;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="w-[200px] sm:w-[220px] flex-shrink-0"
        data-testid={`card-secondary-${profile.pseudo}`}
      >
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 group">
          <div className="relative aspect-square bg-muted/30 overflow-hidden">
            {hasImage ? (
              <img
                src={profile.imageUrl}
                alt={profile.pseudo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                onClick={() => setModalOpen(true)}
                data-testid={`img-profile-${profile.pseudo}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-muted/50 border border-border flex items-center justify-center">
                  <span className="text-xl font-bold text-muted-foreground/40">
                    {profile.pseudo.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 space-y-1">
            <h3 className="text-sm font-bold tracking-wide uppercase">
              <span className="bg-gradient-to-r from-slate-300 via-gray-100 to-slate-400 bg-clip-text text-transparent drop-shadow-sm">{profile.pseudo}</span>
            </h3>
            <p className="text-xs text-foreground/60 font-medium">
              {profile.tier === "label" ? "Label" : "Disque de Platine"}
            </p>
            {profile.description && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{profile.description}</p>
            )}
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {modalOpen && hasImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={profile.imageUrl}
                alt={profile.pseudo}
                className="max-w-full max-h-[85vh] rounded-lg object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<DofProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dof-profiles")
      .then((res) => res.json())
      .then((data) => setProfiles(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const diamantProfiles = profiles.filter((p) => p.tier === "diamant");
  const platineProfiles = profiles.filter((p) => p.tier === "platine");
  const labelProfiles = profiles.filter((p) => p.tier === "label");
  const totalProfiles = profiles.length;

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <Disc3 className="w-7 h-7 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="heading-dof">
            <span className="text-foreground">{t("dof.titlePart1", "LES DISQUES")} </span>
            <span className="text-primary">{t("dof.titlePart2", "DE DISCREEN")}</span>
          </h1>
        </div>

        <p className="text-muted-foreground text-sm italic">
          {t("dof.subtitle", "La Page d'Or")}
        </p>
      </motion.div>

      {totalProfiles === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Disc3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("dof.empty", "Aucun profil pour le moment.")}</p>
        </motion.div>
      ) : (
        <>
          {diamantProfiles.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
              {diamantProfiles.map((profile, index) => (
                <ProfileCard key={profile.id} profile={profile} index={index} />
              ))}
            </div>
          )}

          {platineProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-14"
            >
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="h-px bg-border flex-1 max-w-[80px]" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{t("dof.platine", "Disques de Platine")}</span>
                <div className="h-px bg-border flex-1 max-w-[80px]" />
              </div>

              <div className="flex flex-wrap justify-center gap-5">
                {platineProfiles.map((profile, index) => (
                  <SmallProfileCard key={profile.id} profile={profile} index={index} />
                ))}
              </div>
            </motion.div>
          )}

          {labelProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-14"
            >
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="h-px bg-border flex-1 max-w-[80px]" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{t("dof.labels", "Labels")}</span>
                <div className="h-px bg-border flex-1 max-w-[80px]" />
              </div>

              <div className="flex flex-wrap justify-center gap-5">
                {labelProfiles.map((profile, index) => (
                  <SmallProfileCard key={profile.id} profile={profile} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-16"
      >
        <p className="text-muted-foreground/50 text-xs tracking-widest uppercase">
          {totalProfiles} {t("dof.profilesCounted", "profil(s) recenses")}
        </p>
      </motion.div>
    </div>
  );
}
