"use client";

/**
 * GalaxyCursor — Unseen-style custom cursor: a signal dot that tracks the
 * pointer 1:1 and a lagging orbital ring that eases after it (rAF lerp,
 * zero React re-renders). The ring swells over interactive elements.
 *
 * Self-disabling: touch/coarse pointers and prefers-reduced-motion get the
 * native cursor and nothing else. The native cursor is never hidden — the
 * overlay rides WITH it (mix-blend difference), so usability never regresses.
 */

import { useEffect, useRef } from "react";

export function GalaxyCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    dot.style.opacity = "1";
    ring.style.opacity = "1";

    let x = -100, y = -100, rx = -100, ry = -100, hot = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };
    const onOver = (e: MouseEvent) => {
      hot = Boolean((e.target as Element | null)?.closest?.("a, button, [role='button']"));
    };
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      const scale = hot ? 1.9 : 1;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] h-1.5 w-1.5 rounded-full opacity-0"
        style={{ background: "#00E5FF", boxShadow: "0 0 10px #00E5FFAA", willChange: "transform" }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] h-8 w-8 rounded-full border opacity-0 transition-[border-color] duration-200"
        style={{ borderColor: "rgba(246, 247, 250, 0.45)", mixBlendMode: "difference", willChange: "transform" }}
      />
    </>
  );
}
