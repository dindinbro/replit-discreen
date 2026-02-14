import { useEffect, useRef } from "react";

export default function InteractiveGrid() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spotlight = spotlightRef.current;
    if (!spotlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      spotlight.style.setProperty("--mx", `${e.clientX}px`);
      spotlight.style.setProperty("--my", `${e.clientY}px`);
      spotlight.style.opacity = "1";
    };

    const handleMouseLeave = () => {
      spotlight.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMouseMove);
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
        ref={spotlightRef}
        className="interactive-grid-spotlight"
        aria-hidden="true"
        style={{ "--mx": "-1000px", "--my": "-1000px", opacity: 0 } as React.CSSProperties}
      />
    </>
  );
}
