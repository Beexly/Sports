/**
 * Cockpit · Content Factory — Workstream M3.
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL.
 *
 * Shows the structural blueprint of the one-brief-many-surfaces factory.
 *
 * HONESTY RULES:
 * - 0 briefs processed is an honest zero, not a placeholder.
 * - No fabricated content rows.
 * - AVA generates drafts only — nothing publishes without the owner gate.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  DERIVATIVE_OUTPUTS,
  RECURRING_FORMATS,
  OUTPUTS_PER_BRIEF,
  CATEGORY_LABELS,
  type OutputCategory,
  type DerivativeOutput,
} from "@/lib/revenue/content-factory";

export default function CockpitContentFactoryPage(): JSX.Element {
  // Group outputs by category for the UI
  const byCategory = groupByCategory(DERIVATIVE_OUTPUTS);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Monetization · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Content factory
            </h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            ← Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          One Galaxy Desk brief becomes{" "}
          <span className="text-ink-200 font-semibold">
            {OUTPUTS_PER_BRIEF} derivative outputs
          </span>{" "}
          across owned media, social, audio, conversion CTAs, and revenue
          placements. Create once. Convert everywhere.
        </p>
      </header>

      {/* ── Honest empty state ────────────────────────────────────────────── */}
      <HonestEmptyState />

      {/* ── Derivative output structure ───────────────────────────────────── */}
      <DerivativeStructureSection byCategory={byCategory} />

      {/* ── Recurring formats ─────────────────────────────────────────────── */}
      <RecurringFormatsSection />

      {/* ── Caveat footer ─────────────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. This is a
        structural blueprint. No content is generated or published from here.
        AVA drafts only; owner gate required before any publish. 0 briefs
        processed is an honest zero, not a placeholder.
      </p>
    </div>
  );
}

// ── Honest empty state ────────────────────────────────────────────────────────

function HonestEmptyState(): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          0 briefs processed
        </span>
        <span className="text-xs text-ink-500">honest zero</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
        No Galaxy Desk briefs have been processed through the factory yet.
        This is an honest empty state — no fabricated content rows.
        The structure below is the system blueprint, ready for the first brief.
      </p>
      <p className="mt-2 text-[11px] text-ink-600">
        To process the first brief: author the Galaxy Desk brief in{" "}
        <Link
          href="/cockpit/content"
          className="text-ink-400 underline underline-offset-2 hover:text-ink-200"
        >
          /cockpit/content
        </Link>{" "}
        (AVA draft), pass owner review, then generate derivative outputs from
        the committed brief.
      </p>
    </section>
  );
}

// ── Derivative output structure ───────────────────────────────────────────────

function DerivativeStructureSection({
  byCategory,
}: {
  readonly byCategory: Map<OutputCategory, readonly DerivativeOutput[]>;
}): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          Derivative output structure
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          {OUTPUTS_PER_BRIEF} outputs per brief across{" "}
          {byCategory.size} categories. Structure is fixed; content is
          generated per brief.
        </p>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {(
          Array.from(byCategory.entries()) as [
            OutputCategory,
            readonly DerivativeOutput[],
          ][]
        ).map(([category, outputs]) => (
          <CategoryBlock key={category} category={category} outputs={outputs} />
        ))}
      </div>
    </section>
  );
}

function CategoryBlock({
  category,
  outputs,
}: {
  readonly category: OutputCategory;
  readonly outputs: readonly DerivativeOutput[];
}): JSX.Element {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
        {CATEGORY_LABELS[category]}
      </p>
      <div className="flex flex-col gap-2">
        {outputs.map((output) => (
          <div
            key={output.label}
            className="rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{output.label}</p>
              <span className="font-mono text-[10px] text-ink-600">
                agent: {output.ownerAgent}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">{output.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recurring formats ─────────────────────────────────────────────────────────

function RecurringFormatsSection(): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Recurring formats</h2>
        <p className="mt-1 text-xs text-ink-500">
          These anchor the content cadence. Each Desk brief maps to one or more
          of these format templates.
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {RECURRING_FORMATS.map((fmt) => (
          <div
            key={fmt.name}
            className="px-4 py-3 hover:bg-white/[0.02]"
          >
            <p className="text-sm font-semibold text-white">{fmt.name}</p>
            <p className="mt-0.5 text-xs text-ink-500">{fmt.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByCategory(
  outputs: readonly DerivativeOutput[]
): Map<OutputCategory, readonly DerivativeOutput[]> {
  const map = new Map<OutputCategory, DerivativeOutput[]>();
  for (const output of outputs) {
    const existing = map.get(output.category);
    if (existing) {
      existing.push(output);
    } else {
      map.set(output.category, [output]);
    }
  }
  return map;
}
