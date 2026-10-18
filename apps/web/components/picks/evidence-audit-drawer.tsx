"use client";

/**
 * EvidenceAuditDrawer — the public "Pick receipt" for a pick.
 *
 * Renders a right-anchored drawer that fetches /api/picks/[id]/audit on open
 * and displays the reader-facing receipt: when the pick was scored, the
 * books, line movement, the data pulls behind it, and the pre-mortem /
 * fragility notes. Operator internals the API also returns (signal-category
 * topology, payload hash prefixes and byte counts, gate states, model
 * version, the death-clock tape) are deliberately not rendered here.
 *
 * Tier-gated content is decided server-side. The client renders whatever
 * the API returns — never inspects entitlements directly. The trigger
 * button is visible to ALL tiers (drives upgrade); contents follow tier.
 *
 * No raw payload data is ever rendered; the bytes stay server-side.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AuditPayload,
  AuditPayloadDetailed,
  AuditPayloadSummary,
} from "@sports/types";
import Link from "next/link";

interface EvidenceAuditDrawerProps {
  pickId: string;
  /**
   * Optional label override. Defaults to "Pick receipt".
   * Pick cards in different contexts may want different labels.
   */
  label?: string;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loaded";
      audit: AuditPayload;
      preMortem: PickPremortemNote | null;
      fragility: FragilityView | null;
    }
  | { status: "error"; message: string };

interface PickPremortemNote {
  readonly status: "READY" | "NEEDS_SNAPSHOT";
  readonly headline: string;
  readonly summary: string;
  readonly riskDrivers: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly modelVersion: string;
}

interface FragilityView {
  readonly score: number;
  readonly band: "low" | "moderate" | "high" | "severe";
  readonly components: readonly {
    readonly name: string;
    readonly points: number;
    readonly max: number;
    readonly why: string;
  }[];
  readonly weakness: string;
}

const RECEIPT_NOT_YET = "Receipt not available for this pick yet.";
const RECEIPT_UNAVAILABLE = "Receipt unavailable right now.";

function formatShortTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EvidenceAuditDrawer({ pickId, label }: EvidenceAuditDrawerProps) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    if (load.status === "loaded" || load.status === "loading") return;
    setLoad({ status: "loading" });
    try {
      const res = await fetch(`/api/picks/${encodeURIComponent(pickId)}/audit`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setLoad({
          status: "error",
          message: res.status === 404 ? RECEIPT_NOT_YET : RECEIPT_UNAVAILABLE,
        });
        return;
      }
      const body = (await res.json()) as {
        success?: boolean;
        audit?: AuditPayload;
        preMortem?: PickPremortemNote;
        fragility?: FragilityView | null;
      };
      if (!body.success || !body.audit) {
        setLoad({ status: "error", message: RECEIPT_UNAVAILABLE });
        return;
      }
      setLoad({
        status: "loaded",
        audit: body.audit,
        preMortem: body.preMortem ?? null,
        fragility: body.fragility ?? null,
      });
    } catch {
      setLoad({ status: "error", message: RECEIPT_UNAVAILABLE });
    }
  }, [pickId, load.status]);

  const handleClose = useCallback(() => setOpen(false), []);

  // Escape key to close + focus management
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Focus the close button on open for keyboard users
    closeBtnRef.current?.focus();
    // Lock body scroll while drawer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-ion-blue/30 bg-ion-blue/5 px-4 py-2 text-[11px] font-medium tracking-wide text-ion-blue/90 transition hover:border-ion-blue/50 hover:bg-ion-blue/10 hover:text-ion-blue-glow sm:w-auto"
        aria-label="Open the receipt for this pick"
      >
        <span aria-hidden="true" className="text-ion-blue/80">⌬</span>
        {label ?? "Pick receipt"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick receipt"
          className="fixed inset-0 z-50 flex justify-end motion-safe:animate-[fadeIn_120ms_ease-out]"
        >
          {/* Backdrop */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close pick receipt"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <aside
            className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-titanium bg-obsidian text-ion-white shadow-2xl motion-safe:animate-[slideInRight_180ms_ease-out]"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-titanium bg-obsidian/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ion-blue/80">
                  Galaxy Sports Edge
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Pick receipt
                </h2>
                <p className="mt-1 text-xs text-ion-2">
                  When this pick was scored, the books behind it, and how the line has moved.
                </p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-ion-2 transition hover:bg-titanium hover:text-white"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="flex-1 px-6 py-5" aria-live="polite" aria-busy={load.status === "loading"}>
              {load.status === "loading" && <DrawerSkeleton />}
              {load.status === "error" && (
                <p role="alert" className="text-sm text-alert/90">{load.message}</p>
              )}
              {load.status === "loaded" && load.audit.tier === "FREE" && (
                <SummaryAudit
                  audit={load.audit as AuditPayloadSummary}
                  preMortem={load.preMortem}
                  fragility={load.fragility}
                />
              )}
              {load.status === "loaded" && load.audit.tier !== "FREE" && (
                <DetailedAudit
                  audit={load.audit as AuditPayloadDetailed}
                  preMortem={load.preMortem}
                  fragility={load.fragility}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(24px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Subviews
// ─────────────────────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-3 w-24 animate-pulse rounded bg-titanium" />
      <div className="h-20 animate-pulse rounded-lg bg-titanium/60" />
      <div className="h-3 w-32 animate-pulse rounded bg-titanium" />
      <div className="h-40 animate-pulse rounded-lg bg-titanium/60" />
    </div>
  );
}

function SummaryAudit({
  audit,
  preMortem,
  fragility,
}: {
  audit: AuditPayloadSummary;
  preMortem: PickPremortemNote | null;
  fragility: FragilityView | null;
}) {
  return (
    <div className="space-y-6">
      <PremortemPanel preMortem={preMortem} />
      <FragilityPanel fragility={fragility} />

      <section>
        <SectionHeader title="Receipt" />
        <dl className="mt-3 space-y-2 text-xs">
          <Row
            k="Last data update"
            v={audit.mostRecentSnapshotAt ? formatShortTime(audit.mostRecentSnapshotAt) : "—"}
          />
        </dl>
      </section>

      <section className="rounded-lg border border-plasma/40 bg-plasma/5 p-4">
        <p className="text-sm font-medium text-plasma-glow">
          Upgrade to see the full receipt
        </p>
        <p className="mt-1 text-xs text-ion-2">
          Pro and Elite see confidence at scoring, the number of books, line
          movement, and the data pulls behind this pick.
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-plasma px-4 py-2 text-xs font-semibold text-plasma-ink transition hover:bg-plasma-glow"
        >
          See pricing
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}

function DetailedAudit({
  audit,
  preMortem,
  fragility,
}: {
  audit: AuditPayloadDetailed;
  preMortem: PickPremortemNote | null;
  fragility: FragilityView | null;
}) {
  return (
    <div className="space-y-6">
      <PremortemPanel preMortem={preMortem} />
      <FragilityPanel fragility={fragility} />

      <section>
        <SectionHeader title="The pick" />
        <dl className="mt-3 space-y-2 text-xs">
          <Row
            k="Scored at"
            v={new Date(audit.generatedAt).toLocaleString()}
          />
          <Row
            k="Confidence"
            v={`${audit.confidenceAtPrediction}/100`}
          />
          <Row k="Data quality" v={`${audit.dataQualityScore}`} />
          <Row k="Books" v={`${audit.bookmakerCount}`} />
          {audit.lineMovementDelta !== null && (
            <Row
              k="Line movement"
              v={`${audit.lineMovementDelta > 0 ? "+" : ""}${audit.lineMovementDelta.toFixed(2)}`}
            />
          )}
          {audit.restAdvantageNet !== null && (
            <Row k="Rest advantage" v={`${audit.restAdvantageNet}`} />
          )}
          {audit.atsFormSampleSize !== null && (
            <Row k="ATS sample" v={`${audit.atsFormSampleSize}`} />
          )}
          {audit.h2hSampleSize !== null && (
            <Row k="H2H sample" v={`${audit.h2hSampleSize}`} />
          )}
        </dl>
      </section>

      {audit.sourceSnapshots.length > 0 && (
        <section>
          <SectionHeader title="Data pulls" />
          <ul className="mt-3 space-y-1.5">
            {audit.sourceSnapshots.map((snap) => (
              <li
                key={snap.id}
                className="flex items-center justify-between gap-2 rounded-md border border-titanium bg-carbon/50 px-3 py-2 text-[11px] leading-relaxed"
              >
                <span className="font-medium text-ion-1">{snap.provider}</span>
                <span className="text-right text-ion-2">
                  {new Date(snap.fetchedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PremortemPanel({ preMortem }: { preMortem: PickPremortemNote | null }) {
  if (!preMortem) return null;

  return (
    <section className="rounded-lg border border-ion-blue/35 bg-ion-blue/5 p-4">
      <SectionHeader title="What would change the read" />
      <h4 className="mt-3 text-sm font-semibold text-white">
        {preMortem.headline}
      </h4>
      <p className="mt-2 text-xs leading-5 text-ion-blue/75">
        {preMortem.summary}
      </p>
      {preMortem.riskDrivers.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {preMortem.riskDrivers.map((driver) => (
            <li key={driver} className="text-xs leading-5 text-ion-1">
              {driver}
            </li>
          ))}
        </ul>
      )}
      {preMortem.status === "NEEDS_SNAPSHOT" && (
        <p className="mt-3 text-[11px] text-plasma-glow">
          This note fills in once the latest data is in.
        </p>
      )}
    </section>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ion-blue/80">
      {title}
    </h3>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-titanium pb-1.5 last:border-0">
      <dt className="text-ion-1">{k}</dt>
      <dd
        className={`text-right text-ion-white ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {v}
      </dd>
    </div>
  );
}

// ── Fragility panel — structural risk, published weights ──

const FRAGILITY_BAND_STYLES: Record<FragilityView["band"], string> = {
  low: "border-verify/50 bg-verify/10 text-verify",
  moderate: "border-ion-blue/50 bg-ion-blue/10 text-ion-blue",
  high: "border-ultraviolet/50 bg-ultraviolet/10 text-ultraviolet-glow",
  severe: "border-plasma/50 bg-plasma/10 text-plasma",
};

function FragilityPanel({ fragility }: { fragility: FragilityView | null }) {
  if (!fragility) return null;
  return (
    <section data-testid="fragility-score">
      <SectionHeader title="Fragility score: structural" />
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-numerals text-2xl font-semibold tabular-nums text-white">
          {fragility.score}
          <span className="text-sm font-normal text-ion-1"> / 100</span>
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${FRAGILITY_BAND_STYLES[fragility.band]}`}
        >
          {fragility.band}
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-xs">
        {fragility.components.map((c) => (
          <Row
            key={c.name}
            k={`${c.name} (${c.points}/${c.max})`}
            v={c.why}
          />
        ))}
      </dl>
      <p className="mt-2 text-[10px] leading-relaxed text-ion-2">
        {fragility.weakness}
      </p>
    </section>
  );
}
