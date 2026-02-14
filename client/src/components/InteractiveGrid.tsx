import { useEffect, useRef, useCallback } from "react";

export default function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const prevMouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);
  const needsDrawRef = useRef(true);

  const CELL_SIZE = 60;
  const LINE_COLOR_BASE = "rgba(255, 255, 255, 0.04)";
  const GLOW_RADIUS = 200;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const hasMoved =
      Math.abs(mx - prevMouseRef.current.x) > 0.5 ||
      Math.abs(my - prevMouseRef.current.y) > 0.5;

    if (!hasMoved && !needsDrawRef.current) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    prevMouseRef.current = { x: mx, y: my };
    needsDrawRef.current = false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    const cols = Math.ceil(w / CELL_SIZE) + 1;
    const rows = Math.ceil(h / CELL_SIZE) + 1;

    for (let col = 0; col <= cols; col++) {
      const x = col * CELL_SIZE;
      const dist = Math.abs(x - mx);

      if (dist < GLOW_RADIUS) {
        const intensity = 1 - dist / GLOW_RADIUS;
        const alpha = 0.04 + intensity * 0.2;
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
        ctx.lineWidth = 0.5 + intensity * 0.6;
      } else {
        ctx.strokeStyle = LINE_COLOR_BASE;
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let row = 0; row <= rows; row++) {
      const y = row * CELL_SIZE;
      const dist = Math.abs(y - my);

      if (dist < GLOW_RADIUS) {
        const intensity = 1 - dist / GLOW_RADIUS;
        const alpha = 0.04 + intensity * 0.2;
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
        ctx.lineWidth = 0.5 + intensity * 0.6;
      } else {
        ctx.strokeStyle = LINE_COLOR_BASE;
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const nearCols: number[] = [];
    const nearRows: number[] = [];

    for (let col = 0; col <= cols; col++) {
      if (Math.abs(col * CELL_SIZE - mx) < GLOW_RADIUS) nearCols.push(col);
    }
    for (let row = 0; row <= rows; row++) {
      if (Math.abs(row * CELL_SIZE - my) < GLOW_RADIUS) nearRows.push(row);
    }

    for (const col of nearCols) {
      for (const row of nearRows) {
        const cx = col * CELL_SIZE;
        const cy = row * CELL_SIZE;
        const dist = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);

        if (dist < GLOW_RADIUS) {
          const intensity = (1 - dist / GLOW_RADIUS) ** 2;
          ctx.fillStyle = `rgba(52, 211, 153, ${intensity * 0.12})`;
          ctx.fillRect(
            cx - CELL_SIZE / 2,
            cy - CELL_SIZE / 2,
            CELL_SIZE,
            CELL_SIZE
          );
        }
      }
    }

    if (mx > -500 && my > -500) {
      const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, GLOW_RADIUS * 0.8);
      gradient.addColorStop(0, "rgba(52, 211, 153, 0.05)");
      gradient.addColorStop(0.6, "rgba(52, 211, 153, 0.015)");
      gradient.addColorStop(1, "rgba(52, 211, 153, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(mx - GLOW_RADIUS, my - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = vw * dpr;
      canvas.height = vh * dpr;
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      needsDrawRef.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
      needsDrawRef.current = true;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
