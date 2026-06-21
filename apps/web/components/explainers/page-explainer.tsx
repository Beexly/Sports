"use client";

/**
 * PageExplainerAuto — Nova's "how this page works" guide, on every registered page.
 *
 * Mounted once in the root layout. It reads the current pathname, looks up the
 * page-explainer registry, and renders an unobtrusive launcher only when an
 * explainer exists for this route (so cockpit/admin/auth stay clean). Clicking it
 * opens an accessible modal where Nova walks the visitor through the surface, one
 * captioned beat at a time.
 *
 * Code-native by default (no generation spend, reduced-motion safe). When a real
 * Nova video asset is produced and approved, the registry's `videoAssetId` will
 * be preferred and these beats become the fallback. Nothing plays on load; the
 * guide only opens on an explicit click.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getExplainer, type PageExplainer } from "@/lib/explainers/registry";
import { BRAND_COLORS } from "@/lib/brand";

export function PageExplainerAuto() {
  const pathname = usePathname();
  const explainer = pathname ? getExplainer(pathname) : undefined;
  if (!explainer) return null;
  return <PageExplainer explainer={explainer} />;
}

export function PageExplainer({ explainer }: { explainer: PageExplainer }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* A labeled, branded launcher — gradient-ringed in the signal fade, with
          Nova and a clear two-line label. Deliberately not a faint pill: it is
          the front door to understanding any surface. A short, one-time
          attention pulse (reduced-motion safe) draws the eye, then it settles. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="explainer-launcher group fixed bottom-5 left-5 z-[60] inline-flex rounded-full p-[1.5px]"
        style={{ backgroundImage: "var(--signal-fade)" }}
        aria-haspopup="dialog"
        aria-label={`${explainer.title} — guided walkthrough, ${explainer.durationLabel}`}
      >
        <span className="inline-flex items-center gap-2.5 rounded-full bg-obsidian/95 px-3 py-2 backdrop-blur-sm transition-colors group-hover:bg-eclipse sm:px-4 sm:py-2.5">
          <NovaMark size={24} />
          <span className="flex flex-col items-start leading-none">
            <span className="text-[13px] font-semibold text-ion-white">
              <span className="hidden sm:inline">How this page works</span>
              <span className="sm:hidden">Guide</span>
            </span>
            <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-ion-2 sm:inline">
              Guided by Nova · {explainer.durationLabel}
            </span>
          </span>
          <span
            aria-hidden
            className="ml-0.5 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-obsidian sm:ml-1"
            style={{ backgroundImage: "var(--signal-fade)" }}
          >
            ▸
          </span>
        </span>
      </button>
      {open && <ExplainerModal explainer={explainer} onClose={() => setOpen(false)} />}
    </>
  );
}

function ExplainerModal({ explainer, onClose }: { explainer: PageExplainer; onClose: () => void }) {
  const [i, setI] = useState(0);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const beats = explainer.beats;
  const beat = beats[i]!;
  const onFirst = i === 0;
  const onLast = i === beats.length - 1;

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(beats.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [beats.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={explainer.title}
    >
      {/* backdrop */}
      <button type="button" aria-label="Close guide" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="surface-card relative z-10 w-full max-w-lg overflow-hidden p-0">
        {/* header — Nova */}
        <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <NovaMark size={40} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{explainer.title}</p>
            <p className="truncate text-xs text-ink-400">Nova · {explainer.intro}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="ml-auto rounded-full px-2 py-1 text-ink-400 transition-colors hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {/* current beat */}
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">{beat.tag}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-white">{beat.body}</p>

          {/* progress dots */}
          <div className="mt-5 flex items-center gap-1.5" aria-hidden>
            {beats.map((b, idx) => (
              <span
                key={b.tag}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: idx === i ? 22 : 8,
                  background: idx === i ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray,
                }}
              />
            ))}
          </div>

          {/* transport */}
          <div className="mt-5 flex items-center gap-2">
            <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={onFirst} className="btn btn-ghost btn-sm disabled:opacity-40">
              ‹ Back
            </button>
            <span className="font-mono text-xs text-ink-500">{i + 1}/{beats.length}</span>
            {onLast ? (
              <button type="button" onClick={onClose} className="btn btn-primary btn-sm ml-auto">
                Got it
              </button>
            ) : (
              <button type="button" onClick={() => setI((x) => Math.min(beats.length - 1, x + 1))} className="btn btn-primary btn-sm ml-auto">
                Next ›
              </button>
            )}
          </div>
        </div>

        {/* disclosure */}
        <p className="border-t p-3 text-[10px] leading-relaxed text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
          Nova is Galaxy Sports Edge&apos;s synthetic presenter. This walkthrough is scripted and human-reviewed.
        </p>
      </div>
    </div>
  );
}

/** Stylized brand avatar — a gradient mark, deliberately not a photoreal person. */
function NovaMark({ size }: { size: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet} 70%, ${BRAND_COLORS.obsidianBlack})`,
        boxShadow: `0 0 12px ${BRAND_COLORS.orbitalCyan}55`,
      }}
      aria-hidden
    >
      <span className="font-display font-bold text-white" style={{ fontSize: size * 0.42 }}>N</span>
    </span>
  );
}
