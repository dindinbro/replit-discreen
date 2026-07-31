export default function HudRings() {
  return (
    <svg
      className="hud-rings absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] md:w-[720px] md:h-[720px] text-primary"
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="hud-core"
        cx="200"
        cy="200"
        r="14"
        fill="currentColor"
        style={{ filter: "blur(10px)" }}
      />

      <circle
        className="hud-ring"
        cx="200"
        cy="200"
        r="60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity={0.5}
        style={{ animationDuration: "18s" }}
      />

      <circle
        className="hud-ring hud-ring--rev"
        cx="200"
        cy="200"
        r="105"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="26 6 2 6"
        opacity={0.35}
        style={{ animationDuration: "34s" }}
      />

      <circle
        className="hud-ring"
        cx="200"
        cy="200"
        r="145"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="1 7"
        opacity={0.4}
        style={{ animationDuration: "50s" }}
      />

      <circle
        className="hud-ring hud-ring--rev"
        cx="200"
        cy="200"
        r="184"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="0.5 5"
        opacity={0.22}
        style={{ animationDuration: "70s" }}
      />

      <g className="hud-ring" style={{ animationDuration: "34s" }}>
        <circle cx="305" cy="200" r="3" fill="currentColor" opacity={0.8} />
      </g>
      <g className="hud-ring hud-ring--rev" style={{ animationDuration: "50s" }}>
        <circle cx="200" cy="55" r="2.5" fill="currentColor" opacity={0.7} />
      </g>
    </svg>
  );
}
