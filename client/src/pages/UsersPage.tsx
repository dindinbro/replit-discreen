import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Disc3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WantedProfile {
  pseudo: string;
  disc: string;
  description: string;
  images: string[];
}

const MAIN_PROFILES: WantedProfile[] = [
  {
    pseudo: "Zaza",
    disc: "Disque de Diamant",
    description: "Jefe Dalton, Master Early",
    images: ["https://cdn.discordapp.com/avatars/1458697577670246582/7b7477069dff6c92424641b8a67952e5.webp?size=1024"],
  },
  {
    pseudo: "Yanis",
    disc: "Disque de Diamant",
    description: "Badge Dev > Badge Quetes",
    images: ["https://cdn.discordapp.com/avatars/1205909587450921000/7a9f5341ec573f4ca071ec68c5160c24.webp?size=1024"],
  },
];

const SECONDARY_PROFILES: WantedProfile[] = [
  {
    pseudo: "IMAD",
    disc: "Disque de Platine",
    description: "Humain multi-taches",
    images: ["https://cdn.discordapp.com/avatars/1291217086907158529/5b68c25e221f67338cd3f4e88fe22de1.webp?size=1024"],
  },
  {
    pseudo: "GKM",
    disc: "Disque de Platine",
    description: "Grand hagar",
    images: ["https://cdn.discordapp.com/avatars/788515048569307154/0212df4a29f89e1bdbd3bdb77b114ce6.webp?size=1024"],
  },
  {
    pseudo: "Sinistral",
    disc: "Disque de Platine",
    description: "BDG BDB BDDB",
    images: ["https://cdn.discordapp.com/avatars/1457570822565793843/34b9e08128ff24080b5611397e499cf4.webp?size=1024"],
  },
];

function ProfileCard({ profile, index }: { profile: WantedProfile; index: number }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const hasImages = profile.images.length > 0;
  const totalImages = profile.images.length;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImages > 1) setCurrentImage((prev) => (prev + 1) % totalImages);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImages > 1) setCurrentImage((prev) => (prev - 1 + totalImages) % totalImages);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
        className="w-[280px] sm:w-[300px] flex-shrink-0"
        data-testid={`card-wanted-${profile.pseudo}`}
      >
        <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
          <div
            className="relative aspect-[4/5] bg-muted/30 cursor-pointer overflow-hidden"
            onClick={() => hasImages && setModalOpen(true)}
          >
            {hasImages ? (
              <>
                <img
                  src={profile.images[currentImage]}
                  alt={profile.pseudo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {totalImages > 1 && (
                  <>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {currentImage + 1}/{totalImages}
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {profile.images.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i === currentImage ? "bg-white" : "bg-white/30"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
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
              <span className="text-amber-400">👑</span>
              <span className="text-amber-400">{profile.pseudo}</span>
            </h3>
            <p className="text-sm text-foreground/70 font-medium flex items-center gap-1.5">
              <span className="text-base">💎</span> {profile.disc}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">{profile.description}</p>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {modalOpen && hasImages && (
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
                src={profile.images[currentImage]}
                alt={profile.pseudo}
                className="max-w-full max-h-[85vh] rounded-lg object-contain"
              />
              {totalImages > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <button
                    onClick={prevImage}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white text-sm font-medium">
                    {currentImage + 1} / {totalImages}
                  </span>
                  <button
                    onClick={nextImage}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SmallProfileCard({ profile, index }: { profile: WantedProfile; index: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasImages = profile.images.length > 0;

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
          <div
            className="relative aspect-square bg-muted/30 cursor-pointer overflow-hidden"
            onClick={() => hasImages && setModalOpen(true)}
          >
            {hasImages ? (
              <img
                src={profile.images[0]}
                alt={profile.pseudo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            <h3 className="text-sm font-bold tracking-wide uppercase text-foreground">
              {profile.pseudo}
            </h3>
            <p className="text-xs text-foreground/60 font-medium flex items-center gap-1">
              <span>🏆</span> {profile.disc}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{profile.description}</p>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {modalOpen && hasImages && (
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
                src={profile.images[0]}
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
  const totalProfiles = MAIN_PROFILES.length + SECONDARY_PROFILES.length;

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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="heading-wanted">
            <span className="text-foreground">LES DISQUES </span>
            <span className="text-primary">DE DISCREEN</span>
          </h1>
        </div>

        <p className="text-muted-foreground text-sm italic">
          La Page d'Or
        </p>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
        {MAIN_PROFILES.map((profile, index) => (
          <ProfileCard key={profile.pseudo} profile={profile} index={index} />
        ))}
      </div>

      {SECONDARY_PROFILES.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-14"
        >
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="h-px bg-border flex-1 max-w-[80px]" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Disques de Platine</span>
            <div className="h-px bg-border flex-1 max-w-[80px]" />
          </div>

          <div className="flex flex-wrap justify-center gap-5">
            {SECONDARY_PROFILES.map((profile, index) => (
              <SmallProfileCard key={profile.pseudo} profile={profile} index={index} />
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-16"
      >
        <p className="text-muted-foreground/50 text-xs tracking-widest uppercase">
          {totalProfiles} profil{totalProfiles > 1 ? "s" : ""} recenses
        </p>
      </motion.div>
    </div>
  );
}
