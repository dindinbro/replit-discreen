function TickMarks({ radius, count, length }: { radius: number; length: number; count: number }) {
  const ticks = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const x1 = 200 + Math.cos(angle) * radius;
    const y1 = 200 + Math.sin(angle) * radius;
    const x2 = 200 + Math.cos(angle) * (radius - length);
    const y2 = 200 + Math.sin(angle) * (radius - length);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
  return <>{ticks}</>;
}

export default function HudRings() {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] md:w-[760px] md:h-[760px] text-primary"
      aria-hidden="true"
    >
      <div className="hud-sweep" />
      <svg
        className="hud-rings absolute inset-0 w-full h-full"
        viewBox="0 0 400 400"
        focusable="false"
      >
        <circle
          className="hud-core"
          cx="200"
          cy="200"
          r="16"
          fill="currentColor"
          style={{ filter: "blur(12px)" }}
        />
        <circle cx="200" cy="200" r="4" fill="currentColor" opacity={0.9} />

        <circle
          className="hud-ring"
          cx="200"
          cy="200"
          r="60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity={0.65}
          style={{ animationDuration: "18s" }}
        />

        <g className="hud-ring hud-ring--rev" opacity={0.55} style={{ animationDuration: "34s" }}>
          <circle
            cx="200"
            cy="200"
            r="105"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="26 6 2 6"
          />
        </g>

        <g className="hud-ring" stroke="currentColor" strokeWidth="1.25" opacity={0.5} style={{ animationDuration: "48s" }}>
          <circle cx="200" cy="200" r="145" fill="none" strokeDasharray="1 7" />
          <TickMarks radius={145} length={7} count={36} />
        </g>

        <circle
          className="hud-ring hud-ring--rev"
          cx="200"
          cy="200"
          r="184"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="0.5 5"
          opacity={0.35}
          style={{ animationDuration: "70s" }}
        />

        <g className="hud-ring" style={{ animationDuration: "34s" }}>
          <circle cx="305" cy="200" r="3.5" fill="currentColor" opacity={0.9} />
        </g>
        <g className="hud-ring hud-ring--rev" style={{ animationDuration: "48s" }}>
          <circle cx="200" cy="55" r="3" fill="currentColor" opacity={0.8} />
        </g>
        <g className="hud-ring hud-ring--rev" style={{ animationDuration: "70s" }}>
          <circle cx="16" cy="200" r="2.5" fill="currentColor" opacity={0.6} />
        </g>
      </svg>
    </div>
  );
}
