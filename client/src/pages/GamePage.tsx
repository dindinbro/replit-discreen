import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trophy, RotateCcw, Play, Coins, ChevronUp, ChevronDown, Lock, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════
   ARACHN.RUN — Web Strand Navigator
   3 silk threads · switch lanes · avoid firewalls
═══════════════════════════════════════════════ */
const CW = 800;
const CH = 320;
const LANE_Y = [80, 170, 260];  // Y positions of 3 web strands
const SPIDER_X = 140;
const LERP_SPEED = 0.18;        // lane-switch smoothness
const INIT_SPEED = 4.5;
const MAX_SPEED = 14;
const SPEED_INC = 0.0007;
const GOLD = "#D4A017";
const GOLD_A = "rgba(212,160,23,0.2)";
const RED = "#ef4444";
const BG = "#070707";

type Status = "idle" | "playing" | "dead";

interface Obstacle {
  x: number;
  lanes: number[];   // which strands this block covers (0/1/2)
  w: number;
  h: number;
  flash: number;
}
interface GS {
  currentLane: number;
  spiderY: number;
  speed: number;
  score: number;
  frame: number;
  nextObs: number;
  obstacles: Obstacle[];
  t: number;
  webOff: number;
}

/* ─── Drawing helpers ─────────────────────────────── */

function drawWeb(ctx: CanvasRenderingContext2D, off: number) {
  ctx.save();
  // Vertical silk threads (parallax connectors)
  ctx.strokeStyle = "rgba(212,160,23,0.08)";
  ctx.lineWidth = 1;
  const gap = 90;
  for (let x = off % gap; x < CW; x += gap) {
    for (let li = 0; li < LANE_Y.length - 1; li++) {
      ctx.beginPath();
      ctx.moveTo(x, LANE_Y[li]);
      ctx.lineTo(x + 12, LANE_Y[li + 1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 12, LANE_Y[li]);
      ctx.lineTo(x, LANE_Y[li + 1]);
      ctx.stroke();
    }
  }
  // Horizontal strands
  for (let li = 0; li < LANE_Y.length; li++) {
    const grad = ctx.createLinearGradient(0, 0, CW, 0);
    grad.addColorStop(0, "rgba(212,160,23,0.15)");
    grad.addColorStop(0.5, "rgba(212,160,23,0.35)");
    grad.addColorStop(1, "rgba(212,160,23,0.15)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -(off * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, LANE_Y[li]);
    ctx.lineTo(CW, LANE_Y[li]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lane label on left
    ctx.fillStyle = "rgba(212,160,23,0.18)";
    ctx.font = "9px monospace";
    ctx.fillText(`THREAD-${li + 1}`, 8, LANE_Y[li] - 6);
  }
  ctx.restore();
}

function drawSpider(ctx: CanvasRenderingContext2D, y: number, t: number, switching: boolean) {
  const x = SPIDER_X;
  ctx.save();
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;

  // Silk anchor above spider (to simulate hanging from the strand)
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 32); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Walking/swinging cycle
  const cyc = switching ? Math.sin(t * 18) * 5 : Math.sin(t * 9) * 3.5;

  // Abdomen (lower body)
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x - 12, y + 2, 14, 15, -0.1, 0, Math.PI * 2); ctx.stroke();

  // Abdomen markings
  ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x - 20, y - 2); ctx.quadraticCurveTo(x - 12, y - 6, x - 4, y - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 21, y + 5); ctx.quadraticCurveTo(x - 12, y + 1, x - 3, y + 5); ctx.stroke();
  ctx.restore();

  // Pedicel
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 1, y - 1); ctx.lineTo(x + 2, y - 2); ctx.stroke();

  // Cephalothorax (upper body)
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x + 9, y - 2, 10, 9, 0.1, 0, Math.PI * 2); ctx.stroke();

  // Eyes
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(x + 15, y - 5, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 15, y + 1, 2.8, 0, Math.PI * 2); ctx.fill();

  // Chelicerae
  ctx.shadowBlur = 0; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 18, y + 3); ctx.lineTo(x + 23, y + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 18, y - 5); ctx.lineTo(x + 23, y - 11); ctx.stroke();

  // 8 articulated legs gripping the web strand
  ctx.lineWidth = 1.9;
  const legs: [number, number, number, number, number, number][] = [
    // Leg pairs — gripping the strand (tips converge toward strand y)
    [x - 2, y - 10,  x - 18, y - 24 + cyc,  x - 40, y - 15],
    [x,     y - 4,   x - 20, y - 7 - cyc,   x - 42, y + 4],
    [x,     y + 5,   x - 18, y + 18 + cyc,  x - 38, y + 30],
    [x - 2, y + 11,  x - 14, y + 26 - cyc,  x - 26, y + 42],
    [x + 14,y - 10,  x + 28, y - 26 + cyc,  x + 48, y - 16],
    [x + 16,y - 4,   x + 32, y - 6 - cyc,   x + 52, y + 5],
    [x + 16,y + 5,   x + 30, y + 20 + cyc,  x + 48, y + 32],
    [x + 14,y + 11,  x + 26, y + 28 - cyc,  x + 40, y + 44],
  ];
  for (const [ax, ay, kx, ky, tx, ty] of legs) {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.lineTo(tx, ty); ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, t: number) {
  ctx.save();
  ctx.shadowColor = RED; ctx.shadowBlur = 20;

  for (const li of obs.lanes) {
    const cy = LANE_Y[li];
    const ox = obs.x;
    const oy = cy - obs.h / 2;
    const ow = obs.w;
    const oh = obs.h;

    // Fill
    ctx.fillStyle = "rgba(239,68,68,0.12)";
    rrect(ctx, ox, oy, ow, oh, 6); ctx.fill();

    // Border
    ctx.strokeStyle = RED; ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 26;
    rrect(ctx, ox, oy, ow, oh, 6); ctx.stroke();
    ctx.setLineDash([]);

    // Icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = RED;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⊗", ox + ow / 2, cy - 5);
    ctx.font = "bold 8px monospace";
    ctx.fillText("FW", ox + ow / 2, cy + 10);
    ctx.textAlign = "left";

    // Anchor threads connecting to strand
    ctx.strokeStyle = "rgba(239,68,68,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox + ow / 2, oy); ctx.lineTo(ox + ow / 2, cy - obs.h / 2 - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + ow / 2, oy + oh); ctx.lineTo(ox + ow / 2, cy + obs.h / 2 + 6); ctx.stroke();
  }

  // Bridge bar if blocking 2+ adjacent lanes
  if (obs.lanes.length > 1) {
    const sorted = [...obs.lanes].sort();
    for (let i = 0; i < sorted.length - 1; i++) {
      const y1 = LANE_Y[sorted[i]];
      const y2 = LANE_Y[sorted[i + 1]];
      ctx.strokeStyle = "rgba(239,68,68,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w / 2, y1 + obs.h / 2);
      ctx.lineTo(obs.x + obs.w / 2, y2 - obs.h / 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}


function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function hitTest(lane: number, obs: Obstacle): boolean {
  return obs.lanes.includes(lane) &&
    obs.x < SPIDER_X + 22 &&
    obs.x + obs.w > SPIDER_X - 14;
}

function spawnObs(speed: number): Obstacle {
  // Randomly block 1 or 2 of 3 lanes, always leaving at least 1 free
  const all = [0, 1, 2];
  const blockCount = Math.random() < 0.35 ? 2 : 1;
  const shuffled = all.sort(() => Math.random() - 0.5);
  const lanes = shuffled.slice(0, blockCount).sort();
  return { x: CW + 60, lanes, w: 46, h: 46, flash: 0 };
}

/* ═══════════════════════════════════════════════
   Component
═══════════════════════════════════════════════ */
export default function GamePage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arachnrun_best") || "0"));
  const [credits, setCredits] = useState(0);

  const { data: leaderboard = [], refetch: refetchBoard } = useQuery<
    Array<{ userId: string; username: string; score: number; rank: number }>
  >({
    queryKey: ["/api/game/scores"],
    refetchInterval: 8_000,
  });

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
    currentLane: 1,
    spiderY: LANE_Y[1],
    speed: INIT_SPEED,
    score: 0,
    frame: 0,
    nextObs: 160,
    obstacles: [],
    t: 0,
    webOff: 0,
  }), []);

  const switchLane = useCallback((dir: -1 | 1) => {
    const gs = gsRef.current;
    if (!gs) return;
    const next = Math.max(0, Math.min(2, gs.currentLane + dir));
    if (next !== gs.currentLane) gs.currentLane = next;
  }, []);

  const startGame = useCallback(() => {
    gsRef.current = initGS();
    setStatus("playing");
    setScore(0);
    setCredits(0);
  }, [initGS]);

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (status === "idle" || status === "dead") { startGame(); return; }
        switchLane(-1);
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        if (status === "idle" || status === "dead") { startGame(); return; }
        switchLane(1);
      } else if (e.code === "Space") {
        e.preventDefault();
        if (status === "idle" || status === "dead") startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, startGame, switchLane]);

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
      gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INC * dt);
      gs.webOff -= gs.speed * dt;

      // Smooth lane transition
      const targetY = LANE_Y[gs.currentLane];
      gs.spiderY += (targetY - gs.spiderY) * LERP_SPEED * dt * 3;
      const switching = Math.abs(gs.spiderY - targetY) > 3;

      // Move obstacles
      gs.obstacles = gs.obstacles.filter(o => o.x > -80);
      gs.obstacles.forEach(o => { o.x -= gs.speed * dt; if (o.flash > 0) o.flash--; });

      // Spawn
      gs.nextObs -= gs.speed * dt;
      if (gs.nextObs <= 0) {
        gs.obstacles.push(spawnObs(gs.speed));
        gs.nextObs = 300 + Math.random() * 280;
      }

      // Collision — use rounded lane (snapped) not spiderY
      for (const o of gs.obstacles) {
        if (hitTest(gs.currentLane, o)) {
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

      // Score
      gs.score += 0.08 * dt * (gs.speed / INIT_SPEED);
      setScore(Math.floor(gs.score));

      // ── Draw ──────────────────────────────────────
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CW, CH);

      // Subtle vignette
      const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.2, CW / 2, CH / 2, CW * 0.75);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CW, CH);

      drawWeb(ctx, gs.webOff);
      gs.obstacles.forEach(o => drawObstacle(ctx, o, gs.t));
      drawSpider(ctx, gs.spiderY, gs.t, switching);

      // Lane indicator dots (left side)
      for (let li = 0; li < 3; li++) {
        const isActive = li === gs.currentLane;
        ctx.save();
        ctx.shadowColor = isActive ? GOLD : "transparent";
        ctx.shadowBlur = isActive ? 10 : 0;
        ctx.beginPath(); ctx.arc(16, LANE_Y[li], isActive ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? GOLD : "rgba(212,160,23,0.25)";
        ctx.fill();
        ctx.restore();
      }

      // HUD
      ctx.save();
      ctx.fillStyle = GOLD;
      ctx.font = "bold 17px monospace";
      ctx.textAlign = "right";
      ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
      ctx.fillText(`${Math.floor(gs.score)}`, CW - 16, 26);
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(212,160,23,0.45)";
      ctx.fillText(`BEST ${best}`, CW - 16, 43);

      // Speed bar
      ctx.textAlign = "left";
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(212,160,23,0.35)";
      ctx.font = "9px monospace";
      ctx.fillText("VITESSE", 28, 16);
      ctx.fillStyle = "rgba(212,160,23,0.1)";
      ctx.fillRect(28, 20, 80, 4);
      ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 5;
      ctx.fillRect(28, 20, 80 * Math.min(1, (gs.speed - INIT_SPEED) / (MAX_SPEED - INIT_SPEED)), 4);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(ts => { prev = ts; loop(ts); });
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, best, user]);

  // Draw static frame on idle/dead
  useEffect(() => {
    if (status === "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CW, CH);
    const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.2, CW / 2, CH / 2, CW * 0.75);
    vig.addColorStop(0, "transparent"); vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);
    drawWeb(ctx, 0);
    drawSpider(ctx, LANE_Y[1], 0, false);
  }, [status]);

  const creditsEarned = Math.min(20, Math.floor(score / 60));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-black tracking-tight text-primary font-mono">ARACHN.RUN</span>
            <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded uppercase tracking-widest">Mini-Jeu</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Navigate les 3 fils de toile · Évite les firewalls · Survive le plus longtemps
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="text-primary font-mono font-bold text-xl tabular-nums">{score.toLocaleString()}</div>
          <div className="text-xs opacity-60 font-mono">BEST {best.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* Game canvas */}
        <div className="space-y-3">
          <div
            className="relative rounded-xl overflow-hidden border border-primary/20 cursor-pointer select-none"
            style={{ background: BG }}
            onClick={e => {
              if (status === "idle" || status === "dead") { startGame(); return; }
              // Click top half = go up, bottom half = go down
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const relY = e.clientY - rect.top;
              switchLane(relY < rect.height / 2 ? -1 : 1);
            }}
          >
            <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-auto block" />

            {/* Idle overlay */}
            {status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/65 backdrop-blur-[1px]">
                <div className="text-center space-y-2">
                  <div className="text-primary font-black text-3xl font-mono tracking-tight">ARACHN.RUN</div>
                  <div className="text-muted-foreground text-sm max-w-xs text-center leading-relaxed">
                    L'araignée navigue sur 3 fils de toile.<br />
                    Change de fil pour esquiver les firewalls.
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
                <div className="flex items-center gap-6 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1"><ChevronUp className="w-3 h-3" /> Fil supérieur</span>
                  <span className="flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Fil inférieur</span>
                </div>
              </div>
            )}

            {/* Dead overlay */}
            {status === "dead" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-[1px]">
                <div className="text-center space-y-2">
                  <div className="text-red-500 font-black text-2xl font-mono">FW BREACH</div>
                  <div className="text-4xl font-black text-primary font-mono tabular-nums">{score.toLocaleString()}</div>
                  {score > 0 && score >= best && (
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

            {/* In-game hint */}
            {status === "playing" && (
              <div className="absolute bottom-2 left-4 flex gap-4 pointer-events-none select-none">
                <span className="text-[10px] text-primary/30 font-mono">↑↓ ou W/S · clic haut/bas</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-5 text-xs text-muted-foreground/55 flex-wrap">
            <span><kbd className="px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">↑</kbd><kbd className="ml-0.5 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">↓</kbd> Changer de fil</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">W</kbd><kbd className="ml-0.5 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px]">S</kbd> Alternatif</span>
            <span className="ml-auto text-primary/50">60 pts de survie = 1 crédit (max 20)</span>
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
          <span className="font-bold text-sm">Crédits ARACHN.RUN</span>
        </div>

        {!user ? (
          <div className="px-5 py-6 text-sm text-muted-foreground/60 text-center">
            Connecte-toi pour voir tes crédits accumulés.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border/25">
            {/* Credit balance */}
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

            {/* How to earn + offers */}
            <div className="px-6 py-5 space-y-4 flex-1">
              {/* Earning rule */}
              <div>
                <div className="text-xs text-muted-foreground/50 uppercase tracking-widest font-mono mb-2">Comment gagner</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Survie en continu : 60 pts = <span className="text-primary font-semibold">1 crédit</span> · max 20 crédits par partie</span>
                </div>
              </div>

              {/* Offers — none for now */}
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
