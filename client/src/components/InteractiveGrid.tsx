import { useEffect, useRef } from "react";

export default function InteractiveGrid() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const handleMouseMove = (e: MouseEvent) => {
      glow.style.setProperty("--mx", `${e.clientX}px`);
      glow.style.setProperty("--my", `${e.clientY}px`);
      glow.style.opacity = "1";
    };

    const handleMouseLeave = () => {
      glow.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <>
      <div className="interactive-grid-lines" aria-hidden="true" />
      <div
        ref={glowRef}
        className="interactive-grid-glow"
        aria-hidden="true"
        style={{ "--mx": "-1000px", "--my": "-1000px", opacity: 0 } as React.CSSProperties}
      />
    </>
  );
}
