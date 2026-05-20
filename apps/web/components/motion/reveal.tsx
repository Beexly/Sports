"use client";

/**
 * Reveal — IntersectionObserver-backed scroll reveal primitive.
 *
 * Wraps children in a section that fades + translates into view the first time
 * it enters the viewport. Replaces "everything fades on every scroll" libraries
 * with a tiny, dependency-free component that the brief asks for:
 * motion as identity, cinematic transitions, ambient movement.
 *
 * Honors `prefers-reduced-motion` — users who opted out see the content
 * immediately with no transform or transition.
 *
 * Usage:
 *   <Reveal>...</Reveal>                       // default: fade + translate-up
 *   <Reveal direction="left" delay={120}>...   // staggered children
 *   <Reveal threshold={0.4}>...                // wait until 40% in view
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Direction = "up" | "right" | "left" | "scale" | "none";

export interface RevealProps {
  children: ReactNode;
  /** Direction the content travels from. Default: "up". */
  direction?: Direction;
  /** Animation delay in ms. Use for stagger. */
  delay?: number;
  /** IntersectionObserver threshold (0–1). Default: 0.15. */
  threshold?: number;
  /** Distance (px or rem) the element travels. Default: 28. */
  distance?: number;
  /** Custom duration in ms. Default: 700. */
  duration?: number;
  /** Optional class names applied to the wrapper. */
  className?: string;
  /** Set true when the element should animate every time it scrolls into view. */
  replay?: boolean;
  /** Render as a different element. Default: div. */
  as?: keyof JSX.IntrinsicElements;
}

function travelOffset(direction: Direction, distance: number): string {
  switch (direction) {
    case "up":
      return `translate3d(0, ${distance}px, 0)`;
    case "right":
      return `translate3d(-${distance}px, 0, 0)`;
    case "left":
      return `translate3d(${distance}px, 0, 0)`;
    case "scale":
      return "scale(0.96)";
    case "none":
    default:
      return "none";
  }
}

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  threshold = 0.15,
  distance = 28,
  duration = 700,
  className = "",
  replay = false,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Detect reduced-motion once on mount. We treat any change after mount as a
  // no-op since IntersectionObserver setup would race the media query listener.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (!replay) observer.unobserve(node);
          } else if (replay) {
            setVisible(false);
          }
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, replay, reduced]);

  const style: CSSProperties = reduced
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : travelOffset(direction, distance),
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
      };

  // Use a `ref` callback typed against the chosen element so JSX.IntrinsicElements
  // doesn't complain about generic ref shapes.
  const Component = Tag as unknown as React.ElementType;
  return (
    <Component ref={ref} className={className} style={style}>
      {children}
    </Component>
  );
}

/**
 * Stagger — convenience wrapper that walks its children and applies an
 * increasing delay so they reveal in sequence.
 */
export function Stagger({
  children,
  step = 80,
  start = 0,
  className = "",
  ...rest
}: { children: ReactNode[]; step?: number; start?: number; className?: string } & Omit<
  RevealProps,
  "children" | "delay" | "className"
>) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={start + i * step} {...rest}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
