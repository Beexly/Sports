"use client";

/**
 * EvidenceAuditDrawer — the public, on-brand proof of provenance for a pick.
 *
 * Renders a right-anchored drawer that fetches /api/picks/[id]/audit on open
 * and displays the forensic chain: pick metadata, signal-category topology
 * (LIVE vs SHADOW vs ABSENT), and the SourceSnapshot list with payload
 * hash prefixes and byte counts.
 *
 * Tier-gated content is decided server-side. The client renders whatever
 * the API returns — never inspects entitlements directly. The trigger
 * button is visible to ALL tiers (drives upgrade); contents follow tier.
 *
 * No raw payload data is ever rendered. The audit shows that the data
 * exists, hashes match, and timestamps line up — but the bytes stay
 * server-side.
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
   * Optional label override. Defaults to "View evidence".
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
          message: res.status === 503
            ? "Audit unavailable in bootstrap mode."
            : `Audit unavailable (HTTP ${res.status}).`,
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
        setLoad({ status: "error", message: "Audit response malformed." });
        return;
      }
      setLoad({
        status: "loaded",
        audit: body.audit,
        preMortem: body.preMortem ?? null,
        fragility: body.fragility ?? null,
      });
    } catch (err) {
      setLoad({
        status: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
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
        aria-label="Open evidence audit for this pick"
      >
        <span aria-hidden="true" className="text-ion-blue/80">⌬</span>
        {label ?? "View evidence"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Evidence audit"
          className="fixed inset-0 z-50 flex justify-end motion-safe:animate-[fadeIn_120ms_ease-out]"
        >
          {/* Backdrop */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close evidence audit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <aside
            className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-800 bg-gray-950 text-gray-100 shadow-2xl motion-safe:animate-[slideInRight_180ms_ease-out]"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-800 bg-gray-950/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ion-blue/80">
                  Galaxy Sports Edge
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Evidence audit
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Every signal, every snapshot, every hash. No fabrications.
                </p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
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

            <div className="flex-1 px-6 py-5">
              {load.status === "loading" && <DrawerSkeleton />}
              {load.status === "error" && (
                <p className="text-sm text-alert/90">{load.message}</p>
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

            <footer className="border-t border-gray-800 px-6 py-4 text-[11px] leading-relaxed text-ion-1">
              Snapshots are SHA-256 hashed at ingestion. Hash prefixes are
              shown for operator verification; raw payload bytes remain
              server-side.
            </footer>
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
      <div className="h-3 w-24 animate-pulse rounded bg-gray-800" />
      <div className="h-20 animate-pulse rounded-lg bg-gray-800/60" />
      <div className="h-3 w-32 animate-pulse rounded bg-gray-800" />
      <div className="h-40 animate-pulse rounded-lg bg-gray-800/60" />
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
        <SectionHeader title="Provenance topology" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat
            label="Signals tracked"
            value={String(audit.signalCategoryCount)}
          />
          <Stat
            label="Live at scoring"
            value={String(audit.signalCategoryActiveCount)}
            accent="cyan"
          />
          <Stat
            label="Source snapshots"
            value={String(audit.sourceSnapshotCount)}
          />
          <Stat
            label="Latest snapshot"
            value={
              audit.mostRecentSnapshotAt
                ? new Date(audit.mostRecentSnapshotAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"
            }
          />
        </div>
        {audit.mostRecentSnapshotProvider && (
          <p className="mt-3 text-[11px] uppercase tracking-wider text-ion-1">
            Most recent provider:{" "}
            <span className="text-gray-300">
              {audit.mostRecentSnapshotProvider}
            </span>
          </p>
        )}
      </section>

      <section className="rounded-lg border border-plasma/40 bg-plasma/5 p-4">
        <p className="text-sm font-medium text-plasma-glow">
          Upgrade to see the full chain
        </p>
        <p className="mt-1 text-xs text-plasma/70">
          Pro and Elite tiers see every signal flag at prediction time, line
          movement deltas, payload hashes, and the gates that were active
          when this pick was scored.
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

      {audit.isBootstrap && (
        <div className="rounded-md border border-ultraviolet/40 bg-ultraviolet/5 px-3 py-2 text-[11px] text-ultraviolet-glow">
          Bootstrap-mode pick — recorded for review, not part of canonical
          performance history.
        </div>
      )}

      <section>
        <SectionHeader title="Pick lineage" />
        <dl className="mt-3 space-y-2 text-xs">
          <Row
            k="Model version"
            v={audit.modelVersion || "—"}
            mono
          />
          <Row
            k="Generated at"
            v={new Date(audit.generatedAt).toLocaleString()}
          />
          <Row
            k="Confidence at scoring"
            v={`${audit.confidenceAtPrediction}`}
          />
          <Row k="Data quality" v={`${audit.dataQualityScore}`} />
          <Row k="Bookmaker count" v={`${audit.bookmakerCount}`} />
          {audit.lineMovementDelta !== null && (
            <Row
              k="Line movement δ"
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

      {audit.deathClock && (
        <section data-testid="death-clock">
          <SectionHeader title="Death clock — market since publish" />
          <dl className="mt-3 space-y-2 text-xs">
            <Row
              k="Published"
              v={formatClockAge(audit.deathClock.minutesSincePublish)}
            />
            <Row
              k={clockMetricLabel(audit.deathClock.metric)}
              v={`${formatClockNumber(audit.deathClock.atPublish, audit.deathClock.metric)} → ${formatClockNumber(audit.deathClock.latest, audit.deathClock.metric)}`}
              mono
            />
            <Row
              k="Movement"
              v={
                audit.deathClock.direction === "flat"
                  ? "flat — the market hasn't moved"
                  : `${audit.deathClock.delta > 0 ? "+" : ""}${audit.deathClock.delta} ${audit.deathClock.direction === "toward_pick" ? "toward this pick" : "against this pick"} · ${audit.deathClock.ratePerHour}/h`
              }
            />
            <Row
              k="Basis"
              v={`${audit.deathClock.booksUsed} books quoted both sides of publish · latest capture ${new Date(audit.deathClock.latestCaptureAt).toLocaleTimeString()}`}
            />
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
            Price movement only — what the books charge now vs when this pick
            was published. Median across books; describes the market, not the
            outcome.
          </p>
        </section>
      )}

      <section>
        <SectionHeader title="Signal topology" />
        <ul className="mt-3 space-y-1.5">
          {audit.signalCategories.map((row) => (
            <li
              key={row.category}
              className="flex items-start justify-between gap-3 rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2"
            >
              <div>
                <p className="text-[13px] font-medium text-gray-100">
                  {row.category}
                </p>
                <p className="text-[11px] text-ion-1">{row.description}</p>
              </div>
              <SignalStatusBadge status={row.status} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeader title="Source snapshots" />
        {audit.sourceSnapshots.length === 0 ? (
          <p className="mt-3 text-xs text-ion-1">
            No SourceSnapshot rows recorded for this pick's game window.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {audit.sourceSnapshots.map((snap) => (
              <li
                key={snap.id}
                className="rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-[11px] leading-relaxed"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-200">
                    {snap.provider}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-ion-blue/70">
                    {snap.sourceKind}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-3 text-gray-400">
                  <span>
                    {new Date(snap.fetchedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="text-right">
                    {snap.payloadBytes.toLocaleString()} bytes
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-ion-1">
                  sha256:{snap.payloadHashPrefix}…
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title="Gates at prediction time" />
        <dl className="mt-3 space-y-2 text-xs">
          <Row
            k="Canonical history"
            v={audit.gatesAtPrediction.canonicalHistory ? "OPEN" : "CLOSED"}
          />
          <Row
            k="Derived model history"
            v={audit.gatesAtPrediction.derivedModelHistory ? "OPEN" : "CLOSED"}
          />
          <Row
            k="Outcome learning"
            v={audit.gatesAtPrediction.outcomeLearning ? "OPEN" : "CLOSED"}
          />
        </dl>
      </section>
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
            <li key={driver} className="text-xs leading-5 text-gray-300">
              {driver}
            </li>
          ))}
        </ul>
      )}
      {preMortem.status === "NEEDS_SNAPSHOT" && (
        <p className="mt-3 text-[11px] text-plasma-glow">
          Signal snapshot is required before this note can publish.
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan";
}) {
  return (
    <div className="rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-ion-1">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tracking-tight ${
          accent === "cyan" ? "text-ion-blue-glow" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-900 pb-1.5 last:border-0">
      <dt className="text-ion-1">{k}</dt>
      <dd
        className={`text-right text-gray-100 ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {v}
      </dd>
    </div>
  );
}

function SignalStatusBadge({
  status,
}: {
  status: "LIVE" | "SHADOW" | "ABSENT";
}) {
  const styles =
    status === "LIVE"
      ? "border-verify/50 bg-verify/10 text-verify"
      : status === "SHADOW"
      ? "border-ultraviolet/50 bg-ultraviolet/10 text-ultraviolet-glow"
      : "border-gray-800 bg-gray-900 text-ion-1";

  const label =
    status === "LIVE" ? "Live" : status === "SHADOW" ? "Shadow" : "Absent";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}
    >
      {label}
    </span>
  );
}

// ── Death clock formatting (price space only) ──

function formatClockAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

function clockMetricLabel(
  metric: "spread_points" | "total_points" | "moneyline_price"
): string {
  if (metric === "spread_points") return "Spread (home line)";
  if (metric === "total_points") return "Total";
  return "Side price (American)";
}

function formatClockNumber(
  value: number,
  metric: "spread_points" | "total_points" | "moneyline_price"
): string {
  if (metric === "total_points") return `${value}`;
  return value > 0 ? `+${value}` : `${value}`;
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
      <SectionHeader title="Fragility score — structural" />
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
      <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
        {fragility.weakness}
      </p>
    </section>
  );
}
