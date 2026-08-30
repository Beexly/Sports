"use client";

/**
 * SignalDecode — Text that decrypts from noise.
 *
 * When the element scrolls into view, the text animates from random
 * characters to its final value, like a terminal decoding an intercepted
 * signal. Uses the brand mono font for maximum intelligence-terminal feel.
 *
 * Props:
 *  - children: the final text string
 *  - className: additional classes
 *  - delay: ms before animation starts
 *  - speed: ms per character decode
 *
 * Reduced motion → shows final text instantly.
 */

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
const SIGNAL_CHARS = "01XYΔΣΩ∑√∞≠≤≥◆●";
const ALL_CHARS = CHARS + SIGNAL_CHARS;

function randomChar() {
  return ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function SignalDecode({
  children,
  className = "",
  delay = 0,
  speed = 24,
}: {
  children: string;
  className?: string;
  delay?: number;
  speed?: number;
}) {
  const [display, setDisplay] = useState(children);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduced = useRef(prefersReducedMotion());

  useEffect(() => {
    if (reduced.current) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || reduced.current) return;

    const text = children;
    const len = text.length;
    let pos = 0;
    let raf = 0;
    let lastTime = 0;

    const tick = (now: number) => {
      if (now - lastTime < speed) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastTime = now;

      if (pos < len) {
        pos++;
      }

      let out = "";
      for (let i = 0; i < len; i++) {
        if (text[i] === " ") {
          out += " ";
        } else if (i < pos) {
          out += text[i];
        } else {
          out += randomChar();
        }
      }
      setDisplay(out);

      if (pos < len) {
        raf = requestAnimationFrame(tick);
      }
    };

    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [started, children, delay, speed]);

  return (
    <span ref={ref} className={`font-mono ${className}`} aria-label={children}>
      {display}
    </span>
  );
}
