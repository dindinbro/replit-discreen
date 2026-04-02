import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trophy, Play, RotateCcw, Coins } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════ */
const CW = 800;
const CH = 270;
const GROUND = 238;
const PX = 130;
const GRAVITY = 0.68;
const JUMP1 = -14.5;
const JUMP2 = -11.5;
const INIT_SPEED = 5;
const MAX_SPEED = 14;
const SPEED_INC = 0.0009;
const GOLD = "#D4A017";
const GOLD_A = "rgba(212,160,23,0.25)";
const RED = "#ef4444";
const BG = "#070707";

type Status = "idle" | "playing" | "dead";

interface Player { y: number; vy: number; grounded: boolean; jumps: number; }
interface Obs { x: number; y: number; w: number; h: number; }
interface Pkt { x: number; y: number; alive: boolean; }
interface GS {
  p: Player; obs: Obs[]; pkts: Pkt[];
  speed: number; score: number; frame: number;
  nextObs: number; gridOff: number; t: number;
}

/* ═══════════════════════════════════════════════════════
   Drawing helpers
═══════════════════════════════════════════════════════ */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGrid(ctx: CanvasRenderingContext2D, off: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(212,160,23,0.05)";
  ctx.lineWidth = 1;
  const gap = 64;
  for (let x = off % gap; x < CW; x += gap) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }
  for (let y = 0; y < CH; y += gap) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, GROUND - 2, 0, GROUND + 18);
  g.addColorStop(0, "rgba(212,160,23,0.55)");
  g.addColorStop(1, "rgba(212,160,23,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND - 1, CW, 20);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(CW, GROUND); ctx.stroke();
}

function drawSpider(ctx: CanvasRenderingContext2D, py: number, t: number, grounded: boolean) {
  const x = PX, y = py;
  ctx.save();

  // Silk thread when airborne
  if (!grounded) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, y - 27); ctx.lineTo(x, GROUND); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;
  const cyc = grounded ? Math.sin(t * 11) * 3.5 : 0;

  // Abdomen
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x - 12, y - 2, 15, 17, -0.12, 0, Math.PI * 2); ctx.stroke();

  // Pedicel
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 1, y - 3); ctx.lineTo(x + 2, y - 4); ctx.stroke();

  // Cephalothorax
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x + 9, y - 3, 11, 10, 0.12, 0, Math.PI * 2); ctx.stroke();

  // Abdomen chevron mark
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x - 20, y - 6); ctx.quadraticCurveTo(x - 12, y - 10, x - 4, y - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 22, y + 2); ctx.quadraticCurveTo(x - 12, y - 2, x - 2, y + 2); ctx.stroke();
  ctx.restore();

  // Eyes
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(x + 16, y - 6, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 16, y + 0.5, 2.8, 0, Math.PI * 2); ctx.fill();

  // Chelicerae
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x + 19, y + 4); ctx.lineTo(x + 24, y + 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 19, y - 6); ctx.lineTo(x + 24, y - 12); ctx.stroke();

  // 8 legs with walk animation
  ctx.lineWidth = 1.9;
  const LL: [number, number, number, number, number, number][] = [
    [x - 2, y - 12, x - 18, y - 26 + cyc,  x - 38, y - 18],
    [x,     y - 5,  x - 20, y - 9 - cyc,   x - 40, y + 5],
    [x,     y + 3,  x - 18, y + 17 + cyc,  x - 38, y + 30],
    [x - 2, y + 10, x - 14, y + 28 - cyc,  x - 26, y + 44],
    [x + 14,y - 12, x + 30, y - 28 + cyc,  x + 48, y - 20],
    [x + 16,y - 5,  x + 32, y - 7 - cyc,   x + 52, y + 6],
    [x + 16,y + 3,  x + 30, y + 19 + cyc,  x + 48, y + 32],
    [x + 14,y + 10, x + 26, y + 30 - cyc,  x + 40, y + 46],
  ];
  for (const [ax, ay, kx, ky, tx, ty] of LL) {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.lineTo(tx, ty); ctx.stroke();
  }

  ctx.restore();
}

function drawFirewall(ctx: CanvasRenderingContext2D, obs: Obs, t: number) {
  ctx.save();
  ctx.shadowColor = RED; ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(239,68,68,0.10)";
  rr(ctx, obs.x, obs.y, obs.w, obs.h, 6); ctx.fill();

  ctx.strokeStyle = RED; ctx.lineWidth = 2;
  ctx.setLineDash([7, 4]); ctx.lineDashOffset = -t * 28;
  rr(ctx, obs.x, obs.y, obs.w, obs.h, 6); ctx.stroke();
  ctx.setLineDash([]);

  ctx.shadowBlur = 0;
  ctx.fillStyle = RED;
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("⊗", obs.x + obs.w / 2, obs.y + obs.h / 2 - 5);
  ctx.font = "bold 8px monospace";
  ctx.fillText("FIREWALL", obs.x + obs.w / 2, obs.y + obs.h / 2 + 10);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawPacket(ctx: CanvasRenderingContext2D, p: Pkt, t: number) {
  ctx.save();
  const pulse = 1 + 0.18 * Math.sin(t * 5 + p.x);
  ctx.shadowColor = GOLD; ctx.shadowBlur = 16;

  ctx.beginPath(); ctx.arc(p.x, p.y, 10 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = GOLD_A; ctx.fill();

  ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = GOLD; ctx.fill();

  ctx.strokeStyle = BG; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 3.5); ctx.lineTo(p.x + 3.5, p.y);
  ctx.lineTo(p.x, p.y + 3.5); ctx.lineTo(p.x - 3.5, p.y);
  ctx.closePath(); ctx.stroke();

  ctx.restore();
}

function collide(py: number, obs: Obs): boolean {
  const px = PX - 14, pw = 28, pTop = py - 27, pH = 31;
  return px < obs.x + obs.w && px + pw > obs.x && pTop < obs.y + obs.h && pTop + pH > obs.y;
}

function makeObs(spd: number): Obs {
  const tall = Math.random() > 0.38;
  const w = tall ? 42 : 70;
  const h = tall ? 55 + Math.random() * 30 : 28;
  const y = tall ? GROUND - h : GROUND - h;
  return { x: CW + 40, y, w, h };
}

function makeObs2(spd: number): Obs | null {
  if (Math.random() > 0.4) return null;
  const w = 30;
  const h = 28;
  return { x: CW + 40 + 180 + Math.random() * 80, y: GROUND - h, w, h };
}

/* ═══════════════════════════════════════════════════════
   GamePage component
═══════════════════════════════════════════════════════ */
export default function GamePage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arachnrun_best") || "0"));
  const [credits, setCredits] = useState(0);
  const [serverBest, setServerBest] = useState(0);

  const { data: leaderboard = [] } = useQuery<Array<{ userId: string; username: string; score: number; rank: number }>>({
    queryKey: ["/api/game/scores"],
    refetchInterval: 30_000,
  });

  const submitMut = useMutation({
    mutationFn: (s: number) => apiRequest("POST", "/api/game/submit", { score: s }),
    onSuccess: (data: any) => {
      if (data?.best) setServerBest(data.best);
      queryClient.invalidateQueries({ queryKey: ["/api/game/scores"] });
    },
  });

  const initGS = useCallback((): GS => ({
    p: { y: GROUND, vy: 0, grounded: true, jumps: 2 },
    obs: [],
    pkts: [],
    speed: INIT_SPEED,
    score: 0,
    frame: 0,
    nextObs: 120,
    gridOff: 0,
    t: 0,
  }), []);

  const handleJump = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    if (gs.p.grounded) {
      gs.p.vy = JUMP1;
      gs.p.grounded = false;
      gs.p.jumps = 1;
    } else if (gs.p.jumps > 0) {
      gs.p.vy = JUMP2;
      gs.p.jumps = 0;
    }
  }, []);

  const startGame = useCallback(() => {
    gsRef.current = initGS();
    setStatus("playing");
    setScore(0);
    setCredits(0);
  }, [initGS]);

  // Key / click input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (status === "idle" || status === "dead") { startGame(); return; }
        handleJump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, startGame, handleJump]);

  // Game loop
  useEffect(() => {
    if (status !== "playing") {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let prev = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - prev) / 16.67, 3);
      prev = now;
      const gs = gsRef.current!;
      gs.frame++;
      gs.t += 0.016 * dt;

      // Speed ramp
      gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INC * dt);
      gs.gridOff -= gs.speed * 0.3 * dt;

      // Physics
      if (!gs.p.grounded) {
        gs.p.vy += GRAVITY * dt;
        gs.p.y += gs.p.vy * dt;
        if (gs.p.y >= GROUND) {
          gs.p.y = GROUND;
          gs.p.vy = 0;
          gs.p.grounded = true;
          gs.p.jumps = 2;
        }
      }

      // Move obstacles + packets
      gs.obs = gs.obs.filter(o => o.x > -100);
      gs.obs.forEach(o => o.x -= gs.speed * dt);
      gs.pkts = gs.pkts.filter(p => p.alive && p.x > -20);
      gs.pkts.forEach(p => p.x -= gs.speed * dt);

      // Spawn
      gs.nextObs -= gs.speed * dt;
      if (gs.nextObs <= 0) {
        gs.obs.push(makeObs(gs.speed));
        const extra = makeObs2(gs.speed);
        if (extra) gs.obs.push(extra);
        if (Math.random() < 0.55) {
          const hOff = 40 + Math.random() * 80;
          gs.pkts.push({ x: CW + 40 + Math.random() * 100, y: GROUND - hOff, alive: true });
        }
        gs.nextObs = 280 + Math.random() * 260;
      }

      // Collision — obstacles
      for (const o of gs.obs) {
        if (collide(gs.p.y, o)) {
          // Game over
          const finalScore = Math.floor(gs.score);
          const earned = Math.min(20, Math.floor(finalScore / 60));
          setScore(finalScore);
          setCredits(earned);
          if (finalScore > best) {
            setBest(finalScore);
            localStorage.setItem("arachnrun_best", String(finalScore));
          }
          if (user) submitMut.mutate(finalScore);
          setStatus("dead");
          return;
        }
      }

      // Collision — packets
      for (const p of gs.pkts) {
        const dx = p.x - PX, dy = p.y - gs.p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          p.alive = false;
          gs.score += 35;
        }
      }

      // Score increment
      gs.score += 0.08 * dt * (gs.speed / INIT_SPEED);

      setScore(Math.floor(gs.score));

      // ── Draw ────────────────────────────────────────
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CW, CH);

      drawGrid(ctx, gs.gridOff);
      drawGround(ctx);
      gs.pkts.forEach(p => drawPacket(ctx, p, gs.t));
      gs.obs.forEach(o => drawFirewall(ctx, o, gs.t));
      drawSpider(ctx, gs.p.y, gs.t, gs.p.grounded);

      // Score HUD
      ctx.save();
      ctx.fillStyle = GOLD;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "right";
      ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
      ctx.fillText(`${Math.floor(gs.score)}`, CW - 16, 28);
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(212,160,23,0.5)";
      ctx.fillText(`BEST ${best}`, CW - 16, 46);
      ctx.textAlign = "left";
      ctx.restore();

      // Speed indicator
      const pct = (gs.speed - INIT_SPEED) / (MAX_SPEED - INIT_SPEED);
      ctx.save();
      ctx.fillStyle = "rgba(212,160,23,0.12)";
      ctx.fillRect(16, 20, 80, 5);
      ctx.fillStyle = GOLD;
      ctx.shadowColor = GOLD; ctx.shadowBlur = 6;
      ctx.fillRect(16, 20, 80 * pct, 5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(212,160,23,0.45)";
      ctx.font = "9px monospace";
      ctx.fillText("VITESSE", 16, 15);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(ts => { prev = ts; loop(ts); });
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, best, user]);

  // Draw idle / dead frame on canvas
  useEffect(() => {
    if (status === "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CW, CH);
    drawGrid(ctx, 0);
    drawGround(ctx);
    drawSpider(ctx, GROUND, 0, true);
  }, [status]);

  const creditsEarned = Math.min(20, Math.floor(score / 60));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-black tracking-tight text-primary font-mono">ARACHN.RUN</span>
            <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded uppercase tracking-widest">Mini-Jeu</span>
          </div>
          <p className="text-sm text-muted-foreground">Évite les firewalls · Collecte les données dorées · Bats les records</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="text-primary font-mono font-bold text-lg">{score.toLocaleString()}</div>
          <div className="text-xs opacity-60">BEST {best.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* Game area */}
        <div className="space-y-3">
          <div
            className="relative rounded-xl overflow-hidden border border-primary/20 cursor-pointer select-none"
            style={{ background: BG }}
            onClick={() => {
              if (status === "idle" || status === "dead") startGame();
              else handleJump();
            }}
          >
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className="w-full h-auto block"
              style={{ imageRendering: "pixelated" }}
            />

            {/* Idle overlay */}
            {status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-[1px]">
                <div className="text-center space-y-1">
                  <div className="text-primary font-black text-3xl font-mono tracking-tight">ARACHN.RUN</div>
                  <div className="text-muted-foreground text-sm">L'araignée Discreen dans le darkweb</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); startGame(); }}
                  className="flex items-center gap-2 bg-primary text-black font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  data-testid="button-start-game"
                >
                  <Play className="w-4 h-4" />
                  JOUER
                </button>
                <div className="text-xs text-muted-foreground/70">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">ESPACE</kbd> ou clic pour sauter · Double saut supporté
                </div>
              </div>
            )}

            {/* Dead overlay */}
            {status === "dead" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-[1px]">
                <div className="text-center space-y-2">
                  <div className="text-red-500 font-black text-2xl font-mono">GAME OVER</div>
                  <div className="text-4xl font-black text-primary font-mono">{score.toLocaleString()}</div>
                  {score >= best && score > 0 && (
                    <div className="text-xs text-primary/80 font-mono animate-pulse">✦ NOUVEAU RECORD ✦</div>
                  )}
                  {creditsEarned > 0 && (
                    <div className="flex items-center gap-1.5 justify-center text-sm text-yellow-400/90">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">+{creditsEarned} crédits gagnés</span>
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

            {/* Live score overlay (playing) */}
            {status === "playing" && (
              <div className="absolute bottom-2 left-3 text-[10px] text-primary/40 font-mono select-none pointer-events-none">
                ESPACE / CLIC = SAUT
              </div>
            )}
          </div>

          {/* Controls info */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground/60">
            <span><kbd className="px-1 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">ESPACE</kbd> Sauter</span>
            <span><kbd className="px-1 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">ESPACE×2</kbd> Double saut</span>
            <span className="ml-auto">🕷 <span className="text-primary/70">Données</span> = +35 pts · 60 pts = 1 crédit</span>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card/40 border border-border/30 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Classement</span>
          </div>
          <div className="divide-y divide-border/20">
            {leaderboard.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground/50">
                Aucun score encore.<br />Sois le premier !
              </div>
            )}
            {leaderboard.map((entry, i) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 px-4 py-2.5 ${user && entry.userId === (user as any).id ? "bg-primary/8" : ""}`}
                data-testid={`row-leaderboard-${i}`}
              >
                <span className={`w-5 text-center text-xs font-bold shrink-0 ${
                  i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground/50"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <span className="flex-1 text-sm font-medium truncate" title={entry.username}>
                  {entry.username}
                </span>
                <span className="text-xs font-mono text-primary tabular-nums">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {!user && (
            <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground/60 text-center">
              Connecte-toi pour sauver ton score
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
