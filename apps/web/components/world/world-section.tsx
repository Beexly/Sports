import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";

/**
 * WorldSection — chapter wrapper for the Galaxy public-world journey.
 *
 * Gives every homepage chapter the same skeleton: a mono chapter index with a
 * signal hairline, an eyebrow, a display title, an optional lede, then the
 * chapter body. Scroll-reveals via the shared Reveal primitive (reduced-motion
 * safe). Doctrine: docs/design/GALAXY_2026_PUBLIC_WORLD.md §6.
 */
export function WorldSection({
  index,
  eyebrow,
  title,
  lede,
  children,
  id,
  className = "",
  tone = "void",
}: {
  /** Mono chapter marker, e.g. "02". */
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  /** Background atmosphere: nebula band or deep void. */
  tone?: "void" | "nebula" | "deep";
}): JSX.Element {
  const atmosphere =
    tone === "nebula" ? "gw-nebula" : tone === "deep" ? "gw-nebula-deep" : "";
  return (
    <section
      id={id}
      className={`relative isolate scroll-mt-20 overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 ${atmosphere} ${className}`}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="gw-chapter-index">
            <span className="text-orbital-cyan">{index}</span>
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-display-lg font-semibold text-balance text-white">
            {title}
          </h2>
          {lede ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">{lede}</p>
          ) : null}
        </Reveal>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
