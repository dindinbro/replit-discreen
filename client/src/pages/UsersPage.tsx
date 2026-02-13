import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface WantedProfile {
  pseudo: string;
  realName: string;
  description: string;
  images: string[];
}

const WANTED_PROFILES: WantedProfile[] = [
  {
    pseudo: "Zaza",
    realName: "Zaza",
    description: "Profil recherche — fichier en cours de traitement.",
    images: [],
  },
  {
    pseudo: "Yanis",
    realName: "Yanis",
    description: "Profil recherche — fichier en cours de traitement.",
    images: [],
  },
];

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

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
        <div className="rounded-xl overflow-hidden bg-[#1a1d25] border border-white/[0.06] shadow-xl hover:border-white/[0.12] transition-colors duration-300 group">
          <div
            className="relative aspect-[4/5] bg-[#12141a] cursor-pointer overflow-hidden"
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
                  <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl font-bold text-white/20">
                      {profile.pseudo.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white/20 text-xs">Aucune photo</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 space-y-1.5">
            <h3 className="text-lg font-bold text-[#6c7cff] tracking-wide uppercase">
              {profile.pseudo}
            </h3>
            <p className="text-sm text-white/70 font-medium">{profile.realName}</p>
            <p className="text-xs text-white/40 leading-relaxed pt-1">{profile.description}</p>
          </div>
        </div>
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

export default function UsersPage() {
  return (
    <div className="min-h-[80vh] bg-[#0d0f14] relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mb-8 -mt-4 px-4 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <Sparkle className="absolute top-[8%] right-[12%] text-white/20 animate-pulse" />
      <Sparkle className="absolute top-[15%] left-[8%] text-white/10 w-4 h-4" />
      <Sparkle className="absolute top-[35%] right-[25%] text-white/15 w-3 h-3 animate-pulse" />
      <Sparkle className="absolute top-[55%] left-[15%] text-white/10 w-5 h-5" />
      <Sparkle className="absolute top-[70%] right-[10%] text-white/[0.07] w-4 h-4 animate-pulse" />
      <Sparkle className="absolute top-[45%] left-[45%] text-white/10 w-3 h-3" />
      <Sparkle className="absolute bottom-[20%] left-[30%] text-white/[0.07] w-4 h-4 animate-pulse" />
      <Sparkle className="absolute bottom-[10%] right-[35%] text-white/10 w-3 h-3" />

      <div className="relative z-10 px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkle className="text-white/30 w-6 h-6" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight" data-testid="heading-wanted">
              <span className="text-white">DISCREEN </span>
              <span className="text-[#6c7cff]">OF FAME</span>
            </h1>
            <Sparkle className="text-white/30 w-6 h-6" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="inline-block"
          >
            <div className="border border-white/10 rounded-full px-6 py-2">
              <p className="text-white/40 text-sm italic tracking-wide">
  Trophee De Discreen
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Sparkle className="text-white/20 w-5 h-5 mx-auto" />
          </motion.div>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {WANTED_PROFILES.map((profile, index) => (
              <ProfileCard key={profile.pseudo} profile={profile} index={index} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-20"
        >
          <p className="text-white/15 text-xs tracking-widest uppercase">
            {WANTED_PROFILES.length} profil{WANTED_PROFILES.length > 1 ? "s" : ""} recense{WANTED_PROFILES.length > 1 ? "s" : ""}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
