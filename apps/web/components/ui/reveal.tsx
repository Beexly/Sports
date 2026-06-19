"use client";
/**
 * Reveal — scroll-triggered fade-up wrapper.
 *
 * Wraps children in a div that fades up when scrolled into view.
 * Uses useScrollReveal hook + native CSS animation.
 * Honors prefers-reduced-motion (shows immediately, no animation).
 * Zero npm deps.
 */
import { useScrollReveal } from "@/lib/hooks/use-scroll-reveal";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Animation delay in ms (applied via inline style) */
  delay?: number;
  /** Which animation to use */
  animation?: "fade-up" | "fade-in" | "slide-in-left" | "slide-in-right" | "scale-up";
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: RevealProps) {
  const { ref, revealed } = useScrollReveal();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={
        revealed
          ? {
              animation: `${animation} 0.6s ease-out forwards`,
              animationDelay: `${delay}ms`,
            }
          : { opacity: 0 }
      }
    >
      {children}
    </div>
  );
}
