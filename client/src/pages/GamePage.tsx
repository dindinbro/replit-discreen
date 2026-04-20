import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, RotateCcw, Play, Coins, Lock, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════
   STING.EXE — Endless Runner
   Saute par-dessus les pièges, passe dans les brèches
═══════════════════════════════════════════════ */
const CW = 800;
const CH = 320;
const GROUND_Y = 278;         // y of ground line
const CEIL_Y   = 22;          // y of ceiling line
const PLAYER_X = 130;         // fixed horizontal position
const HIT_R    = 9;           // collision radius (tighter than visual)
const GRAVITY  = 1700;        // px / s²
const JUMP_VEL = -580;        // px / s  (upward)
const INIT_SPEED = 320;       // px / s
const MAX_SPEED  = 820;       // px / s
const SPEED_INC  = 22;        // px / s per second of play
const GOLD  = "#D4A017";
const GOLDA = "rgba(212,160,23,0.18)";
const RED   = "#ef4444";
const REDA  = "rgba(239,68,68,0.18)";
const BG    = "#070707";

type Status = "idle" | "playing" | "dead";

/* ─── Obstacle types ─────────────────────────────── */
interface CactusGroup { kind: "cactus"; x: number; cacti: Array<{ h: number; large: boolean }>; }
interface PteroObs    { kind: "ptero";  x: number; y: number; }
type Obs = CactusGroup | PteroObs;

const CACTUS_GAP = 11; // px gap between trunks in a group
function cactusMetrics(c: { large: boolean }) {
  return { tw: c.large ? 14 : 10, aw: c.large ? 17 : 12, ah: c.large ? 11 : 8 };
}

interface GS {
  playerY: number;
  velY:    number;
  onGround: boolean;
  speed:   number;
  score:   number;
  obs:     Obs[];
  nextObs: number;    // px until next obstacle
  t:       number;
  bgOff:   number;
}

/* ─── Background grid ────────────────────────────── */
function drawBg(ctx: CanvasRenderingContext2D, off: number) {
  ctx.save();
  const GSIZ = 55;
  ctx.strokeStyle = "rgba(212,160,23,0.055)";
  ctx.lineWidth = 1;
  for (let x = ((off % GSIZ) + GSIZ) % GSIZ; x < CW; x += GSIZ) {
    ctx.beginPath(); ctx.moveTo(x, CEIL_Y); ctx.lineTo(x, GROUND_Y); ctx.stroke();
  }
  const ROWS = 5;
  for (let i = 0; i <= ROWS; i++) {
    const y = CEIL_Y + i * (GROUND_Y - CEIL_Y) / ROWS;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }
  // Ground line
  ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
  const gGrad = ctx.createLinearGradient(0, 0, CW, 0);
  gGrad.addColorStop(0,   "rgba(212,160,23,0.2)");
  gGrad.addColorStop(0.5, "rgba(212,160,23,0.55)");
  gGrad.addColorStop(1,   "rgba(212,160,23,0.2)");
  ctx.strokeStyle = gGrad; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CW, GROUND_Y); ctx.stroke();
  // Ceiling line
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(212,160,23,0.14)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, CEIL_Y); ctx.lineTo(CW, CEIL_Y); ctx.stroke();
  ctx.restore();
}

/* ─── Scorpion (vue de profil) ───────────────────── */
function drawScorpion(ctx: CanvasRenderingContext2D, y: number, t: number, inAir: boolean) {
  const x = PLAYER_X;
  ctx.save();
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = GOLD;
  ctx.strokeStyle = GOLD;
  ctx.fillStyle   = GOLD;

  // animations
  const walk = inAir ? 0 : Math.sin(t * 12) * 3;
  const sway = Math.sin(t * 2.2) * 4; // queue qui ondule

  /* ── Corps horizontal segmenté (opisthosoma) ──
     5 segments allant de gauche (arrière) vers le centre */
  ctx.shadowBlur = 8; ctx.lineWidth = 2;
  const segs = 5;
  const segW = 10;
  const bodyLeft = x - 42;
  for (let i = 0; i < segs; i++) {
    const cx = bodyLeft + i * segW + segW / 2;
    const rw = segW / 2 + 0.5;
    const rh = 8 - i * 0.5; // légère diminution vers l'avant
    ctx.beginPath(); ctx.ellipse(cx, y, rw, rh, 0, 0, Math.PI * 2); ctx.stroke();
  }

  /* ── Céphalothorax (prosoma) — tête/thorax, côté droit ── */
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(x + 16, y - 1, 14, 10, 0, 0, Math.PI * 2); ctx.stroke();

  /* ── Œil ── */
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(x + 26, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();

  /* ── Queue (metasoma) — arc depuis l'arrière vers l'avant au-dessus ──
     Démarre à l'extrémité gauche du corps, monte haut, se recourbe
     en avant pour que le stinger pointe vers le bas */
  ctx.shadowBlur = 12; ctx.lineWidth = 2.6;
  const tailStart = { x: bodyLeft - 2, y: y - 4 };
  ctx.beginPath();
  ctx.moveTo(tailStart.x, tailStart.y);
  // coude gauche-arrière
  ctx.bezierCurveTo(
    bodyLeft - 18, y - 6  + sway,   // part en arrière
    bodyLeft - 22, y - 36 + sway,   // monte
    x - 10,        y - 50            // sommet de l'arc, au-dessus du corps
  );
  // descend vers l'avant pour former le stinger
  ctx.bezierCurveTo(
    x + 10, y - 56,
    x + 30, y - 50,
    x + 28, y - 34                   // base du stinger
  );
  ctx.stroke();

  /* ── Telson (bulbe du stinger) ── */
  ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(x + 28, y - 34, 4.5, 0, Math.PI * 2); ctx.fill();

  /* ── Pointe du stinger (crochet vers le bas) ── */
  ctx.shadowBlur = 4; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 28, y - 29);
  ctx.quadraticCurveTo(x + 32, y - 22, x + 30, y - 16);
  ctx.stroke();

  /* ── Chélicères/Pédipalpes (pinces) vers la droite ── */
  ctx.shadowBlur = 4; ctx.lineWidth = 1.9;
  // bras supérieur
  ctx.beginPath(); ctx.moveTo(x + 28, y - 7); ctx.lineTo(x + 42, y - 13); ctx.stroke();
  const cg1 = 3.5 + 2 * Math.abs(Math.sin(t * 3.2));
  ctx.beginPath(); ctx.moveTo(x + 42, y - 13); ctx.lineTo(x + 54, y -  8); ctx.stroke(); // fixe
  ctx.beginPath(); ctx.moveTo(x + 42, y - 13); ctx.lineTo(x + 54, y - 13 - cg1); ctx.stroke(); // mobile
  // bras inférieur
  ctx.beginPath(); ctx.moveTo(x + 28, y + 4); ctx.lineTo(x + 42, y + 11); ctx.stroke();
  const cg2 = 3.5 + 2 * Math.abs(Math.sin(t * 3.2 + 1.2));
  ctx.beginPath(); ctx.moveTo(x + 42, y + 11); ctx.lineTo(x + 54, y +  6); ctx.stroke(); // fixe
  ctx.beginPath(); ctx.moveTo(x + 42, y + 11); ctx.lineTo(x + 54, y + 11 + cg2); ctx.stroke(); // mobile

  /* ── 4 paires de pattes (sous le corps) ── */
  ctx.shadowBlur = 0; ctx.lineWidth = 1.6;
  // positions X le long de l'opisthosoma
  const legRoots = [x - 36, x - 26, x - 16, x - 6];
  for (let i = 0; i < 4; i++) {
    const lx = legRoots[i];
    const ph = (i % 2 === 0) ? walk : -walk; // alternance avant/arrière
    // patte avant (inclinée vers l'avant)
    ctx.beginPath();
    ctx.moveTo(lx,      y + 8);
    ctx.lineTo(lx + 8 - ph, y + 17);
    ctx.lineTo(lx + 14 - ph, y + 24);
    ctx.stroke();
    // patte arrière (inclinée vers l'arrière)
    ctx.beginPath();
    ctx.moveTo(lx,      y + 8);
    ctx.lineTo(lx - 8 + ph, y + 17);
    ctx.lineTo(lx - 12 + ph, y + 24);
    ctx.stroke();
  }

  ctx.restore();
}

/* ─── Cactus group obstacle ──────────────────────── */
function drawCactusGroup(ctx: CanvasRenderingContext2D, cg: CactusGroup) {
  ctx.save();
  ctx.lineCap   = "square";
  ctx.lineJoin  = "miter";
  ctx.shadowColor = RED;
  ctx.shadowBlur  = 14;
  ctx.lineWidth   = 1.6;

  let cx = cg.x;
  for (const c of cg.cacti) {
    const { tw, aw, ah } = cactusMetrics(c);
    const armY = GROUND_Y - Math.round(c.h * 0.58); // arm attachment height

    // trunk
    ctx.fillStyle = REDA; ctx.fillRect(cx, GROUND_Y - c.h, tw, c.h);
    ctx.strokeStyle = RED; ctx.strokeRect(cx, GROUND_Y - c.h, tw, c.h);

    // left arm — horizontal bar
    ctx.fillStyle = REDA; ctx.fillRect(cx - aw, armY, aw, ah);
    ctx.strokeStyle = RED; ctx.strokeRect(cx - aw, armY, aw, ah);
    // left arm — vertical tip
    const ltw = Math.round(tw * 0.6);
    ctx.fillRect(cx - aw, armY - Math.round(ah * 2), ltw, Math.round(ah * 2));
    ctx.strokeRect(cx - aw, armY - Math.round(ah * 2), ltw, Math.round(ah * 2));

    // right arm — horizontal bar
    ctx.fillRect(cx + tw, armY, aw, ah);
    ctx.strokeRect(cx + tw, armY, aw, ah);
    // right arm — vertical tip
    ctx.fillRect(cx + tw + aw - ltw, armY - Math.round(ah * 2), ltw, Math.round(ah * 2));
    ctx.strokeRect(cx + tw + aw - ltw, armY - Math.round(ah * 2), ltw, Math.round(ah * 2));

    cx += tw + CACTUS_GAP;
  }

  // glow at ground base
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(239,68,68,0.22)";
  const { aw: faw } = cactusMetrics(cg.cacti[0]);
  const totalW = cg.cacti.reduce((s, c) => s + cactusMetrics(c).tw + CACTUS_GAP, 0)
    - CACTUS_GAP + cactusMetrics(cg.cacti[cg.cacti.length - 1]).aw;
  ctx.fillRect(cg.x - faw, GROUND_Y - 3, totalW + faw, 3);

  ctx.restore();
}

/* ─── Pterodactyl obstacle ───────────────────────── */
function drawPtero(ctx: CanvasRenderingContext2D, pt: PteroObs, t: number) {
  ctx.save();
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = RED;
  ctx.shadowColor = RED;
  ctx.shadowBlur  = 12;
  ctx.lineWidth   = 2;

  const { x, y } = pt;
  const flap = Math.sin(t * 9) * 12; // wing oscillation

  // body
  ctx.fillStyle = REDA;
  ctx.beginPath(); ctx.ellipse(x + 10, y, 13, 7, -0.1, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // head (facing right)
  ctx.beginPath(); ctx.ellipse(x + 21, y - 6, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // beak
  ctx.beginPath();
  ctx.moveTo(x + 28, y - 7);
  ctx.lineTo(x + 42, y - 4);
  ctx.lineTo(x + 28, y - 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.arc(x + 24, y - 7, 2, 0, Math.PI * 2); ctx.fill();

  // upper wing (animated)
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 5);
  ctx.bezierCurveTo(x - 10, y - 10 - flap, x - 28, y - 18 - flap, x - 34, y - 10 - flap);
  ctx.stroke();
  // wing membrane fill
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 5);
  ctx.bezierCurveTo(x - 10, y - 10 - flap, x - 28, y - 18 - flap, x - 34, y - 10 - flap);
  ctx.lineTo(x + 4, y + 5);
  ctx.closePath();
  ctx.fillStyle = "rgba(239,68,68,0.11)"; ctx.fill();

  // lower wing hint (counter-flap)
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 3);
  ctx.bezierCurveTo(x - 6, y + 6 + flap * 0.4, x - 18, y + 10 + flap * 0.4, x - 22, y + 7 + flap * 0.4);
  ctx.stroke();

  // tail fork
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 2);
  ctx.lineTo(x - 16, y + 9);
  ctx.lineTo(x - 22, y + 4);
  ctx.moveTo(x - 16, y + 9);
  ctx.lineTo(x - 20, y + 15);
  ctx.stroke();

  ctx.restore();
}

/* ─── Spawn ──────────────────────────────────────── */
function spawnObs(score: number): Obs {
  const prog = Math.min(1, score / 500);

  // Ptero: unlocks at score 80, probability grows with progress (capped at ~38%)
  if (score >= 80 && Math.random() > 0.72 - prog * 0.10) {
    // 3 heights: low (must jump over), mid, high (walk under)
    // At high scores reduce low-ptero frequency so it doesn't combine unfairly with cactus
    const lowWeight = Math.max(0.10, 0.33 - prog * 0.18);
    const r = Math.random();
    const y = r < lowWeight
      ? GROUND_Y - 38
      : r < lowWeight + 0.34
        ? GROUND_Y - 72
        : GROUND_Y - 108;
    return { kind: "ptero", x: CW + 80, y };
  }

  // Cactus group: 1-3 cacti, size proportional to progress
  const roll = Math.random();
  const n    = roll < 0.52 ? 1 : roll < 0.80 ? 2 : 3;
  const cacti = Array.from({ length: n }, () => ({
    h:     26 + Math.random() * 36,
    large: Math.random() < 0.42,
  }));
  return { kind: "cactus", x: CW + 80, cacti };
}

/* ─── Hit test ───────────────────────────────────── */
function hitTest(pY: number, o: Obs): boolean {
  const px1 = PLAYER_X - HIT_R, px2 = PLAYER_X + HIT_R;
  const py1 = pY - HIT_R,       py2 = pY + HIT_R;

  if (o.kind === "cactus") {
    const { aw: faw } = cactusMetrics(o.cacti[0]);
    const last = o.cacti[o.cacti.length - 1];
    const { tw, aw } = cactusMetrics(last);
    const groupRight = o.cacti.reduce((s, c) => s + cactusMetrics(c).tw + CACTUS_GAP, o.x)
      - CACTUS_GAP + aw;
    const groupLeft = o.x - faw;
    if (px2 < groupLeft || px1 > groupRight) return false;
    const maxH = Math.max(...o.cacti.map(c => c.h));
    return py2 > GROUND_Y - maxH + 4;
  } else {
    // Ptero: bounding box ~70px wide, 28px tall centred on (x+4, y)
    if (px2 < o.x - 34 || px1 > o.x + 42) return false;
    if (py2 < o.y - 18 || py1 > o.y + 12) return false;
    return true;
  }
}

/* ═══════════════════════════════════════════════
   Component
═══════════════════════════════════════════════ */
export default function GamePage() {
  const { user, role, getAccessToken } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef     = useRef<GS | null>(null);
  const rafRef    = useRef(0);
  const jumpRef   = useRef(false);   // pending jump input
  const bestRef   = useRef(0);

  const [status,  setStatus]  = useState<Status>("idle");
  const [score,   setScore]   = useState(0);
  const [best,    setBest]    = useState(() => {
    const v = parseInt(localStorage.getItem("sting_exe_best") || "0");
    bestRef.current = v;
    return v;
  });
  const [credits, setCredits] = useState(0);

  const LEADERBOARD_INTERVAL = 3 * 60 * 1000; // 3 minutes
  const REFRESH_COOLDOWN    = 30;             // seconds

  const { data: leaderboard = [], refetch: refetchLeaderboard, dataUpdatedAt } = useQuery<
    Array<{ userId: string; username: string; score: number; rank: number }>
  >({ queryKey: ["/api/game/scores"], refetchInterval: LEADERBOARD_INTERVAL });

  const [cooldown, setCooldown] = useState(0); // seconds remaining

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleRefreshLeaderboard = useCallback(() => {
    if (cooldown > 0) return;
    refetchLeaderboard();
    setCooldown(REFRESH_COOLDOWN);
  }, [cooldown, refetchLeaderboard]);

  const { data: gameCredits, refetch: refetchCredits } = useQuery<{ total: number; gamesPlayed: number }>({
    queryKey: ["/api/game/credits"],
    enabled: !!user,
  });

  const [redeemPending, setRedeemPending] = useState<"pro" | null>(null);

  const redeemMut = useMutation({
    mutationFn: async (plan: "pro") => {
      setRedeemPending(plan);
      const res = await apiRequest("POST", "/api/game/redeem", { plan });
      return res.json();
    },
    onSuccess: (_, plan) => {
      setRedeemPending(null);
      toast({ title: `Plan ${plan.toUpperCase()} activé !`, description: "Ton plan a été mis à jour avec succès." });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game/credits"] });
    },
    onError: (err: Error) => {
      setRedeemPending(null);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const [boostInput, setBoostInput] = useState("");
  const [appliedBoost, setAppliedBoost] = useState<{ name: string; multiplier: number; code: string } | null>(null);
  const [boostError, setBoostError] = useState<string | null>(null);

  const validateBoostMut = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/game/boost/validate", { code });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Code invalide"); }
      return res.json() as Promise<{ valid: boolean; name: string; multiplier: number; code: string }>;
    },
    onSuccess: (data) => {
      setAppliedBoost({ name: data.name, multiplier: data.multiplier, code: data.code });
      setBoostError(null);
    },
    onError: (err: Error) => {
      setAppliedBoost(null);
      setBoostError(err.message);
    },
  });

  const submitMut = useMutation({
    mutationFn: async (s: number) => {
      const res = await apiRequest("POST", "/api/game/submit", { score: s, boostCode: appliedBoost?.code ?? undefined });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game/scores"] });
      refetchCredits();
    },
    onError: (err: Error) => {
      toast({
        title: "Score non sauvegardé",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const initGS = useCallback((): GS => ({
    playerY:  GROUND_Y - 22,
    velY:     0,
    onGround: true,
    speed:    INIT_SPEED,
    score:    0,
    obs:      [],
    nextObs:  500,
    t:        0,
    bgOff:    0,
  }), []);

  const startGame = useCallback(() => {
    jumpRef.current = false;
    gsRef.current   = initGS();
    setStatus("playing");
    setScore(0);
    setCredits(0);
  }, [initGS]);

  /* Keyboard & click input */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (["Space", "ArrowUp", "KeyW", "ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        if (status !== "playing") { startGame(); return; }
        jumpRef.current = true;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, startGame]);

  /* Game loop */
  useEffect(() => {
    if (status !== "playing") { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let prev = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const gs = gsRef.current!;

      gs.t     += dt;
      gs.bgOff -= gs.speed * dt;
      gs.speed  = Math.min(MAX_SPEED, gs.speed + SPEED_INC * dt);

      /* Physics */
      if (!gs.onGround) gs.velY += GRAVITY * dt;
      gs.playerY += gs.velY * dt;

      // Ground
      if (gs.playerY >= GROUND_Y - 22) {
        gs.playerY  = GROUND_Y - 22;
        gs.velY     = 0;
        gs.onGround = true;
      } else {
        gs.onGround = false;
      }
      // Ceiling
      if (gs.playerY <= CEIL_Y + 22) {
        gs.playerY = CEIL_Y + 22;
        gs.velY    = Math.max(0, gs.velY);
      }

      // Jump input
      if (jumpRef.current && gs.onGround) {
        gs.velY     = JUMP_VEL;
        gs.onGround = false;
      }
      jumpRef.current = false;

      /* Obstacles */
      gs.obs = gs.obs.filter(o => o.x > -80);
      gs.obs.forEach(o => { o.x -= gs.speed * dt; });

      gs.nextObs -= gs.speed * dt;
      if (gs.nextObs <= 0) {
        gs.obs.push(spawnObs(gs.score));
        // Gap shrinks with score but enforces a safe minimum so the game stays fair at high speed
        const baseGap = 460 + Math.random() * 320;
        const reduction = Math.min(80, gs.score * 0.06);
        gs.nextObs = Math.max(380, baseGap - reduction);
      }

      /* Collision */
      for (const o of gs.obs) {
        if (hitTest(gs.playerY, o)) {
          const final = Math.floor(gs.score);
          const earned = Math.floor(final / 60);
          setScore(final);
          setCredits(earned);
          if (final > bestRef.current) {
            bestRef.current = final;
            setBest(final);
            localStorage.setItem("sting_exe_best", String(final));
          }
          if (user) submitMut.mutate(final);
          setStatus("dead");
          return;
        }
      }

      /* Score */
      gs.score += gs.speed * dt / 9;
      setScore(Math.floor(gs.score));

      /* ── Draw ─────────────────────────────────── */
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CW, CH);

      // Vignette
      const vig = ctx.createRadialGradient(CW/2, CH/2, CH*0.15, CW/2, CH/2, CW*0.72);
      vig.addColorStop(0, "transparent"); vig.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

      drawBg(ctx, gs.bgOff);
      gs.obs.forEach(o => o.kind === "cactus" ? drawCactusGroup(ctx, o) : drawPtero(ctx, o, gs.t));
      drawScorpion(ctx, gs.playerY, gs.t, !gs.onGround);

      // Shadow under scorpion on ground
      if (gs.onGround) {
        ctx.save();
        ctx.shadowBlur = 0;
        const sg = ctx.createRadialGradient(PLAYER_X, GROUND_Y, 0, PLAYER_X, GROUND_Y, 22);
        sg.addColorStop(0, "rgba(212,160,23,0.25)"); sg.addColorStop(1, "transparent");
        ctx.fillStyle = sg; ctx.fillRect(PLAYER_X - 22, GROUND_Y - 4, 44, 6);
        ctx.restore();
      }

      // HUD — score
      ctx.save();
      ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
      ctx.fillStyle = GOLD; ctx.font = "bold 18px monospace"; ctx.textAlign = "right";
      ctx.fillText(Math.floor(gs.score).toString(), CW - 14, 26);
      ctx.font = "9px monospace"; ctx.fillStyle = "rgba(212,160,23,0.4)";
      ctx.fillText(`BEST ${bestRef.current}`, CW - 14, 41);

      // Speed bar
      ctx.textAlign = "left"; ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(212,160,23,0.3)"; ctx.font = "8px monospace";
      ctx.fillText("VITESSE", 30, 16);
      ctx.fillStyle = "rgba(212,160,23,0.1)"; ctx.fillRect(30, 20, 76, 3);
      ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 5;
      ctx.fillRect(30, 20, 76 * Math.min(1, (gs.speed - INIT_SPEED) / (MAX_SPEED - INIT_SPEED)), 3);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(ts => { prev = ts; loop(ts); });
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, user]);

  /* Static frame when idle / dead */
  useEffect(() => {
    if (status === "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, CW, CH);
    const vig = ctx.createRadialGradient(CW/2, CH/2, CH*0.15, CW/2, CH/2, CW*0.72);
    vig.addColorStop(0, "transparent"); vig.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);
    drawBg(ctx, 0);
    drawScorpion(ctx, GROUND_Y - 22, 1.2, false);
  }, [status]);

  const creditsEarned = appliedBoost
    ? Math.floor(Math.floor(score / 60) * appliedBoost.multiplier)
    : Math.floor(score / 60);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-black tracking-tight text-primary font-mono">STING.EXE</span>
            <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded uppercase tracking-widest">Mini-Jeu</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Saute par-dessus les cactus · Évite les ptéros · Survive le plus longtemps
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="text-primary font-mono font-bold text-xl tabular-nums">{score.toLocaleString()}</div>
          <div className="text-xs opacity-60 font-mono">BEST {best.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* Canvas */}
        <div className="space-y-3">
          <div
            className="relative rounded-xl overflow-hidden border border-primary/20 cursor-pointer select-none"
            style={{ background: BG }}
            onClick={() => {
              if (status !== "playing") { startGame(); return; }
              jumpRef.current = true;
            }}
          >
            <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-auto block" />

            {/* Idle overlay */}
            {status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/65 backdrop-blur-[1px]">
                <div className="text-center space-y-2">
                  <div className="text-primary font-black text-3xl font-mono tracking-tight">STING.EXE</div>
                  <div className="text-muted-foreground text-sm max-w-xs leading-relaxed text-center">
                    Saute par-dessus les cactus.<br />Évite les ptéros volants. Survive.
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); startGame(); }}
                  className="flex items-center gap-2 bg-primary text-black font-bold px-8 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="button-start-game"
                >
                  <Play className="w-4 h-4" />
                  JOUER
                </button>
                <div className="text-xs text-muted-foreground/55 font-mono">
                  ESPACE · ↑ · Clic — Sauter
                </div>
              </div>
            )}

            {/* Dead overlay */}
            {status === "dead" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/72 backdrop-blur-[1px]">
                <div className="text-center space-y-1.5">
                  <div className="text-red-400 font-mono font-bold tracking-widest text-sm uppercase">Connexion perdue</div>
                  <div className="text-5xl font-black text-primary font-mono tabular-nums">{score.toLocaleString()}</div>
                  {score > 0 && score >= best && (
                    <div className="text-xs text-primary/80 font-mono animate-pulse">✦ NOUVEAU RECORD ✦</div>
                  )}
                  {user ? (
                    creditsEarned > 0 && (
                      <div className="flex flex-col items-center gap-0.5 mt-1">
                        <div className="flex items-center gap-1.5 justify-center text-sm text-yellow-400/90">
                          <Coins className="w-4 h-4" />
                          <span className="font-bold">+{creditsEarned} crédit{creditsEarned > 1 ? "s" : ""} gagnés</span>
                          {appliedBoost && (
                            <span className="text-xs text-green-400/80 font-mono">×{appliedBoost.multiplier} {appliedBoost.name}</span>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-muted-foreground/60 mt-1 font-mono">
                      🔒 Connecte-toi pour sauvegarder ton score
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); startGame(); }}
                  className="flex items-center gap-2 bg-primary text-black font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  data-testid="button-restart-game"
                >
                  <RotateCcw className="w-4 h-4" />
                  REJOUER
                </button>
              </div>
            )}

            {/* In-game hint */}
            {status === "playing" && (
              <div className="absolute bottom-2 left-3 pointer-events-none select-none">
                <span className="text-[9px] text-primary/25 font-mono">ESPACE / ↑ / Clic — Sauter</span>
              </div>
            )}
          </div>

          {/* Boost code input */}
          {user && (
            <div className="flex items-center gap-2">
              {appliedBoost ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono flex-1">
                  <span className="font-bold">⚡ {appliedBoost.name}</span>
                  <span className="opacity-70">×{appliedBoost.multiplier} actif</span>
                  <button
                    className="ml-auto text-green-400/50 hover:text-green-400 transition-colors"
                    data-testid="button-remove-boost"
                    onClick={() => { setAppliedBoost(null); setBoostInput(""); setBoostError(null); }}
                  >✕</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={boostInput}
                    onChange={e => { setBoostInput(e.target.value.toUpperCase()); setBoostError(null); }}
                    onKeyDown={e => { if (e.key === "Enter" && boostInput.trim()) validateBoostMut.mutate(boostInput.trim()); }}
                    placeholder="CODE BOOST (optionnel)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-card/60 border border-border/40 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                    data-testid="input-boost-code"
                  />
                  <button
                    disabled={!boostInput.trim() || validateBoostMut.isPending}
                    onClick={() => validateBoostMut.mutate(boostInput.trim())}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="button-validate-boost"
                  >
                    {validateBoostMut.isPending ? "..." : "VALIDER"}
                  </button>
                </>
              )}
              {boostError && <span className="text-xs text-red-400 font-mono">{boostError}</span>}
            </div>
          )}

          {/* Controls bar */}
          <div className="flex items-center gap-5 text-xs text-muted-foreground/55 flex-wrap">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">ESPACE</kbd>
              <span className="ml-1">ou</span>
              <kbd className="mx-1 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">↑</kbd>
              Sauter
            </span>
            <span className="ml-auto text-primary/50">60 pts = 1 crédit · max 20 / partie</span>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card/40 border border-border/30 rounded-xl overflow-hidden flex flex-col self-start">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Classement</span>
            <div className="ml-auto flex items-center gap-2">
              {dataUpdatedAt > 0 && (
                <span className="text-[10px] text-muted-foreground/40 font-mono">
                  actu {new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={handleRefreshLeaderboard}
                disabled={cooldown > 0}
                title={cooldown > 0 ? `Disponible dans ${cooldown}s` : "Actualiser le classement"}
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  cooldown > 0
                    ? "border-border/20 text-muted-foreground/30 cursor-not-allowed"
                    : "border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 cursor-pointer"
                }`}
                data-testid="button-refresh-leaderboard"
              >
                <RotateCcw className={`w-2.5 h-2.5 ${cooldown > 0 ? "" : "group-hover:rotate-180 transition-transform"}`} />
                {cooldown > 0 ? `${cooldown}s` : "↺"}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/20">
            {leaderboard.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground/50">
                Aucun score encore.<br />Sois le premier !
              </div>
            )}
            {leaderboard.map((entry, i) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 px-4 py-2.5 ${user && (user as any).id === entry.userId ? "bg-primary/8" : ""}`}
                data-testid={`row-leaderboard-${i}`}
              >
                <span className={`w-5 text-center text-xs font-bold shrink-0 ${
                  i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground/40"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{entry.username}</span>
                <span className="text-xs font-mono text-primary tabular-nums">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {!user && (
            <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground/55 text-center">
              Connecte-toi pour sauver ton score
            </div>
          )}
        </div>
      </div>

      {/* Credits section */}
      <div className="border border-primary/20 rounded-xl overflow-hidden bg-card/30">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/25">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Crédits STING.EXE</span>
        </div>

        {!user ? (
          <div className="px-5 py-6 text-sm text-muted-foreground/60 text-center">
            Connecte-toi pour voir tes crédits accumulés.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border/25">
            <div className="px-6 py-5 flex flex-col gap-1 sm:min-w-[200px]">
              <div className="text-xs text-muted-foreground/60 uppercase tracking-widest font-mono">Solde</div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl font-black text-primary font-mono tabular-nums leading-none">
                  {gameCredits?.total ?? 0}
                </span>
                <span className="text-sm text-muted-foreground/70 mb-0.5">crédits</span>
              </div>
              <div className="text-[11px] text-muted-foreground/45 font-mono mt-1">
                {gameCredits?.gamesPlayed ?? 0} partie{(gameCredits?.gamesPlayed ?? 0) !== 1 ? "s" : ""} jouée{(gameCredits?.gamesPlayed ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="px-6 py-5 space-y-4 flex-1">
              <div>
                <div className="text-xs text-muted-foreground/50 uppercase tracking-widest font-mono mb-2">Comment gagner</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Survive : 60 pts = <span className="text-primary font-semibold">1 crédit</span> · max 20 crédits par partie</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground/50 uppercase tracking-widest font-mono mb-2">Dépenser ses crédits</div>
                <div className="flex flex-col gap-2">
                  {[
                    { plan: "pro",  label: "PRO",  cost: 30000, color: "text-primary",    border: "border-primary/20",    bg: "bg-primary/5"    },
                  ].map(({ plan, label, cost, color, border, bg }) => {
                    const credits    = gameCredits?.total ?? 0;
                    const pct        = Math.min(100, Math.round((credits / cost) * 100));
                    const hasEnough  = credits >= cost;
                    const alreadyHas = role === plan || role === "admin";
                    return (
                      <div key={plan} className={`rounded-lg border ${border} ${bg} p-3`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black tracking-widest font-mono ${color}`}>{label}</span>
                            <span className="text-xs text-muted-foreground/50 font-mono">{cost.toLocaleString()} crédits</span>
                          </div>
                          {alreadyHas ? (
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${color} opacity-80`}>✓ Actif</span>
                          ) : (
                            <button
                              data-testid={`btn-redeem-${plan}`}
                              disabled={!hasEnough || redeemPending === plan}
                              onClick={() => redeemMut.mutate(plan as "pro")}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all ${
                                hasEnough
                                  ? `${color} border ${border} hover:bg-white/5 cursor-pointer`
                                  : "text-muted-foreground/30 border border-border/20 cursor-not-allowed"
                              }`}
                            >
                              {redeemPending === plan ? "..." : "Réclamer"}
                            </button>
                          )}
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border/20 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${hasEnough ? "bg-primary" : "bg-muted-foreground/30"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground/40 font-mono mt-1">
                          {credits.toLocaleString()} / {cost.toLocaleString()} crédits {!alreadyHas && !hasEnough && `· encore ${(cost - credits).toLocaleString()}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
