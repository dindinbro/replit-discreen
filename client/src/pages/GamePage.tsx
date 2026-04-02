import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
interface SpikeObs   { kind: "spike";   x: number; side: "ground"|"ceil"; w: number; h: number; }
interface WallObs    { kind: "wall";    x: number; gapTop: number; gapH: number; }
type Obs = SpikeObs | WallObs;

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

/* ─── Spike obstacle ─────────────────────────────── */
function drawSpike(ctx: CanvasRenderingContext2D, sp: SpikeObs, t: number) {
  ctx.save();
  ctx.shadowColor = RED; ctx.shadowBlur = 18;
  const count = Math.round(sp.w / 22);
  for (let i = 0; i < count; i++) {
    const sx = sp.x + i * 22 + 11;
    const baseY = sp.side === "ground" ? GROUND_Y : CEIL_Y;
    const tipY  = sp.side === "ground" ? GROUND_Y - sp.h : CEIL_Y + sp.h;
    ctx.beginPath();
    ctx.moveTo(sx - 10, baseY);
    ctx.lineTo(sx,       tipY);
    ctx.lineTo(sx + 10,  baseY);
    ctx.closePath();
    ctx.fillStyle = REDA; ctx.fill();
    ctx.strokeStyle = RED; ctx.lineWidth = 1.6;
    ctx.setLineDash([5,3]); ctx.lineDashOffset = -t * 22;
    ctx.stroke(); ctx.setLineDash([]);
  }
  // glow strip at base
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(239,68,68,0.25)";
  if (sp.side === "ground") ctx.fillRect(sp.x, GROUND_Y - 3, sp.w, 3);
  else                      ctx.fillRect(sp.x, CEIL_Y, sp.w, 3);
  ctx.restore();
}

/* ─── Wall obstacle ──────────────────────────────── */
function drawWall(ctx: CanvasRenderingContext2D, wl: WallObs, t: number) {
  const WW = 24;
  ctx.save();
  ctx.shadowColor = RED; ctx.shadowBlur = 20;

  const drawBlock = (y: number, h: number) => {
    if (h <= 0) return;
    ctx.fillStyle = REDA; ctx.fillRect(wl.x, y, WW, h);
    ctx.strokeStyle = RED; ctx.lineWidth = 1.5;
    ctx.setLineDash([5,4]); ctx.lineDashOffset = -t * 26;
    ctx.strokeRect(wl.x, y, WW, h);
    ctx.setLineDash([]);
    if (h > 22) {
      ctx.shadowBlur = 0; ctx.fillStyle = RED;
      ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("FW", wl.x + WW / 2, y + h / 2 + 3);
    }
  };

  drawBlock(CEIL_Y,          wl.gapTop - CEIL_Y);
  drawBlock(wl.gapTop + wl.gapH, GROUND_Y - wl.gapTop - wl.gapH);

  // Gap highlight
  const gGrad = ctx.createLinearGradient(wl.x, 0, wl.x + WW, 0);
  gGrad.addColorStop(0,   "rgba(212,160,23,0)");
  gGrad.addColorStop(0.5, "rgba(212,160,23,0.12)");
  gGrad.addColorStop(1,   "rgba(212,160,23,0)");
  ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
  ctx.fillStyle = gGrad;
  ctx.fillRect(wl.x, wl.gapTop, WW, wl.gapH);

  ctx.restore();
}

/* ─── Spawn helpers ──────────────────────────────── */
function spawnObs(score: number): Obs {
  const prog = Math.min(1, score / 600);
  const roll = Math.random();

  if (roll < 0.32) {
    // Ground spike cluster
    const cnt = 1 + Math.floor(Math.random() * (1 + Math.round(prog * 2)));
    return { kind: "spike", x: CW + 80, side: "ground", w: cnt * 22, h: 28 + Math.random() * 32 };
  } else if (roll < 0.55) {
    // Ceiling spike cluster
    const cnt = 1 + Math.floor(Math.random() * (1 + Math.round(prog * 2)));
    return { kind: "spike", x: CW + 80, side: "ceil",   w: cnt * 22, h: 22 + Math.random() * 26 };
  } else {
    // Wall with gap — gap shrinks from 130 to 75px as score increases
    const gapH   = Math.max(75, 130 - prog * 55);
    const minTop = CEIL_Y + 28;
    const maxTop = GROUND_Y - gapH - 28;
    const gapTop = minTop + Math.random() * Math.max(0, maxTop - minTop);
    return { kind: "wall", x: CW + 80, gapTop, gapH };
  }
}

function hitTest(pY: number, o: Obs): boolean {
  const px1 = PLAYER_X - HIT_R, px2 = PLAYER_X + HIT_R;
  const py1 = pY - HIT_R,      py2 = pY + HIT_R;

  if (o.kind === "spike") {
    if (px2 < o.x || px1 > o.x + o.w) return false;
    return o.side === "ground" ? py2 > GROUND_Y - o.h
                               : py1 < CEIL_Y + o.h;
  } else {
    const WW = 24;
    if (px2 < o.x || px1 > o.x + WW) return false;
    const inGap = py2 > o.gapTop && py1 < o.gapTop + o.gapH;
    return !inGap;
  }
}

/* ═══════════════════════════════════════════════
   Component
═══════════════════════════════════════════════ */
export default function GamePage() {
  const { user } = useAuth();
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

  const { data: leaderboard = [] } = useQuery<
    Array<{ userId: string; username: string; score: number; rank: number }>
  >({ queryKey: ["/api/game/scores"], refetchInterval: 8_000 });

  const { data: gameCredits, refetch: refetchCredits } = useQuery<{ total: number; gamesPlayed: number }>({
    queryKey: ["/api/game/credits"],
    enabled: !!user,
  });

  const submitMut = useMutation({
    mutationFn: (s: number) => apiRequest("POST", "/api/game/submit", { score: s }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game/scores"] });
      refetchCredits();
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
        // Spacing shrinks slightly as game speeds up
        gs.nextObs = 380 + Math.random() * 340 - Math.min(120, gs.score * 0.12);
      }

      /* Collision */
      for (const o of gs.obs) {
        if (hitTest(gs.playerY, o)) {
          const final = Math.floor(gs.score);
          const earned = Math.min(20, Math.floor(final / 60));
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
      gs.obs.forEach(o => o.kind === "spike" ? drawSpike(ctx, o, gs.t) : drawWall(ctx, o, gs.t));
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

  const creditsEarned = Math.min(20, Math.floor(score / 60));

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
            Évite les pièges · Passe dans les brèches · Survive le plus longtemps
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
                    Évite les pièges au sol, passe dans<br />les brèches des firewalls.
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
                  {creditsEarned > 0 && (
                    <div className="flex items-center gap-1.5 justify-center text-sm text-yellow-400/90 mt-1">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">+{creditsEarned} crédit{creditsEarned > 1 ? "s" : ""} gagnés</span>
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
        <div className="bg-card/40 border border-border/30 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Classement</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">actu ~8s</span>
          </div>
          <div className="divide-y divide-border/20 flex-1">
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
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/35 bg-muted/20">
                  <Lock className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground/60">Pas d'offre pour le moment</div>
                    <div className="text-xs text-muted-foreground/40 mt-0.5">Les offres de conversion arrivent bientôt.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
