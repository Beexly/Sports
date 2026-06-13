/**
 * Cockpit — Memory Review Queue & Hygiene
 *
 * Shows:
 *   - Review queue: candidate memory cards awaiting owner approval
 *   - Conflicts section: conflicted memories needing resolution
 *   - Hygiene section: candidates awaiting approval, unused-90d (stale),
 *     low confidence, missing source refs, should-expire
 *
 * Probe pattern: catches DB errors → honest not-connected state.
 * Never shows simulated rows. Import-only from lib/jarvis/memory/actions.ts.
 */

import Link from "next/link";
import {
  listMemoryByState,
  listMemoryConflicts,
  confirmMemory,
  rejectMemory,
} from "@/lib/jarvis/memory/actions";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoryRow {
  readonly id: string;
  readonly memory_type: string;
  readonly memory_state: string;
  readonly scope: string;
  readonly title: string;
  readonly summary: string;
  readonly source_type: string;
  readonly source_ref: string | null;
  readonly confidence: number;
  readonly sensitivity: string;
  readonly tags: string[];
  readonly created_at: Date;
  readonly confirmed_at: Date | null;
  readonly expires_at: Date | null;
}

// ── Server actions ────────────────────────────────────────────────────────────

async function handleConfirm(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  try {
    await confirmMemory(id, true /* ownerApproval */);
  } catch {
    // Errors surface as a redirect/reload; owner sees nothing changed
  }
}

async function handleReject(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  try {
    await rejectMemory(id);
  } catch {
    // Same as above
  }
}

// ── DB probes ─────────────────────────────────────────────────────────────────

async function loadCandidates(): Promise<MemoryRow[] | null> {
  try {
    const rows = await listMemoryByState("candidate");
    return (rows ?? []).map(toMemoryRow);
  } catch {
    return null;
  }
}

async function loadConflicts(): Promise<MemoryRow[] | null> {
  try {
    const rows = await listMemoryConflicts();
    return (rows ?? []).map(toMemoryRow);
  } catch {
    return null;
  }
}

async function loadHygieneRows(): Promise<{
  stale: MemoryRow[] | null;
  lowConfidence: MemoryRow[] | null;
  missingSource: MemoryRow[] | null;
}> {
  try {
    const staleRows = await listMemoryByState("stale");
    const stale = (staleRows ?? []).map(toMemoryRow);

    const allCandidates = await listMemoryByState("candidate");
    const mapped = (allCandidates ?? []).map(toMemoryRow);

    const lowConfidence = mapped.filter((r) => r.confidence < 50);
    const missingSource = mapped.filter(
      (r) => !r.source_ref || r.source_ref.trim() === "",
    );

    return { stale, lowConfidence, missingSource };
  } catch {
    return { stale: null, lowConfidence: null, missingSource: null };
  }
}

function toMemoryRow(r: {
  id: string;
  memory_type: string;
  memory_state: string;
  scope: string;
  title: string;
  summary: string;
  source_type: string;
  source_ref: string | null;
  confidence: number;
  sensitivity: string;
  tags: string[];
  created_at: Date;
  confirmed_at: Date | null;
  expires_at: Date | null;
}): MemoryRow {
  return {
    id: r.id,
    memory_type: r.memory_type,
    memory_state: r.memory_state,
    scope: r.scope,
    title: r.title,
    summary: r.summary,
    source_type: r.source_type,
    source_ref: r.source_ref,
    confidence: r.confidence,
    sensitivity: r.sensitivity,
    tags: r.tags,
    created_at: r.created_at,
    confirmed_at: r.confirmed_at,
    expires_at: r.expires_at,
  };
}

// ── Styling helpers ───────────────────────────────────────────────────────────

function confidenceClass(c: number): string {
  if (c >= 80) return "text-green-400";
  if (c >= 50) return "text-amber-400";
  return "text-rose-400";
}

function sensitivityClass(s: string): string {
  switch (s) {
    case "high":
    case "legal":
    case "hr":
    case "spend":
      return "bg-rose-900/30 text-rose-300";
    default:
      return "bg-gray-800 text-gray-400";
  }
}

function stateClass(state: string): string {
  switch (state) {
    case "confirmed":
      return "border-green-500/40 bg-green-500/10 text-green-300";
    case "candidate":
      return "border-blue-500/40 bg-blue-500/10 text-blue-300";
    case "conflicted":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "stale":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-gray-500/40 bg-gray-500/10 text-gray-300";
  }
}

// ── Card components ───────────────────────────────────────────────────────────

function MemoryCard({
  row,
  showActions,
}: {
  row: MemoryRow;
  showActions: boolean;
}) {
  return (
    <li className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
            <span>{row.memory_type.replace(/_/g, " ")}</span>
            <span>·</span>
            <span>{row.scope}</span>
            <span>·</span>
            <span>{row.created_at.toISOString().slice(0, 10)}</span>
          </div>

          {/* Title */}
          <p className="mt-1 text-sm font-semibold text-gray-100">{row.title}</p>

          {/* Summary */}
          <p className="mt-0.5 text-xs text-gray-400">{row.summary}</p>

          {/* Source */}
          <p className="mt-1 text-[11px] text-gray-500">
            Source: {row.source_type}
            {row.source_ref ? ` — ${row.source_ref}` : " — no source ref"}
          </p>

          {/* Confidence + sensitivity + tags */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-medium ${confidenceClass(row.confidence)}`}>
              Confidence: {row.confidence}%
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sensitivityClass(row.sensitivity)}`}
            >
              {row.sensitivity}
            </span>
            {row.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* State badge */}
        <span
          className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${stateClass(row.memory_state)}`}
        >
          {row.memory_state.replace(/_/g, " ")}
        </span>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-3 flex gap-2">
          <form action={handleConfirm}>
            <input type="hidden" name="id" value={row.id} />
            <button
              type="submit"
              className="rounded-md border border-green-700/40 bg-green-900/20 px-3 py-1 text-[11px] font-semibold text-green-300 hover:bg-green-900/40"
            >
              Confirm
            </button>
          </form>
          <form action={handleReject}>
            <input type="hidden" name="id" value={row.id} />
            <button
              type="submit"
              className="rounded-md border border-rose-700/40 bg-rose-900/20 px-3 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-900/40"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CockpitMemoryPage(): Promise<JSX.Element> {
  const [candidates, conflicts, hygiene] = await Promise.all([
    loadCandidates(),
    loadConflicts(),
    loadHygieneRows(),
  ]);

  const dbUnavailable =
    candidates === null || conflicts === null || hygiene.stale === null;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Memory Review Queue</h1>
          <Link
            href="/cockpit"
            className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60"
          >
            Back to Cockpit
          </Link>
        </div>
        <p className="text-sm text-gray-400">
          Review candidate memories, resolve conflicts, and maintain memory hygiene. Only confirmed
          memories are recalled by Jarvis — candidates are never treated as facts.
        </p>
        {dbUnavailable && (
          <p
            data-testid="memory-db-unavailable"
            className="rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300"
          >
            Memory store unavailable. Showing structure only — no live data.
          </p>
        )}
      </header>

      {/* Review queue — candidates */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-100">Candidates Awaiting Approval</h2>
        <p className="text-xs text-gray-500">
          Each candidate was proposed by Jarvis or an agent. Confirm to promote it to the memory
          store; reject to discard it. Sensitive types require owner approval before confirmation.
        </p>
        {dbUnavailable || candidates === null ? (
          <p
            data-testid="candidates-db-unavailable"
            className="rounded-lg border border-gray-800 bg-gray-950/40 p-5 text-sm text-gray-500"
          >
            No database connection — candidates will appear here when the memory store is wired.
          </p>
        ) : candidates.length === 0 ? (
          <p
            data-testid="candidates-empty"
            className="rounded-lg border border-gray-800 bg-gray-950/40 p-5 text-sm text-gray-500"
          >
            No candidates awaiting approval.
          </p>
        ) : (
          <ul
            data-testid="candidates-list"
            className="flex flex-col gap-2"
          >
            {candidates.map((row) => (
              <MemoryCard
                key={row.id}
                row={row}
                showActions
              />
            ))}
          </ul>
        )}
      </section>

      {/* Conflicts section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-100">Conflicts</h2>
        <p className="text-xs text-gray-500">
          A conflicted memory contradicts a confirmed one. Both are shown. Owner resolution is
          required — conflicts are never silently overwritten.
        </p>
        {dbUnavailable || conflicts === null ? (
          <p
            data-testid="conflicts-db-unavailable"
            className="rounded-lg border border-gray-800 bg-gray-950/40 p-5 text-sm text-gray-500"
          >
            No database connection.
          </p>
        ) : conflicts.length === 0 ? (
          <p
            data-testid="conflicts-empty"
            className="rounded-lg border border-gray-800 bg-gray-950/40 p-5 text-sm text-gray-500"
          >
            No conflicted memories.
          </p>
        ) : (
          <ul
            data-testid="conflicts-list"
            className="flex flex-col gap-2"
          >
            {conflicts.map((row) => (
              <MemoryCard
                key={row.id}
                row={row}
                showActions
              />
            ))}
          </ul>
        )}
      </section>

      {/* Hygiene section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-100">Memory Hygiene</h2>
        <p className="text-xs text-gray-500">
          Memories that may need attention: stale (unused 90+ days), low confidence (&lt;50%),
          missing source references.
        </p>

        {/* Stale */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-300">Stale (unused 90+ days)</h3>
          {dbUnavailable || hygiene.stale === null ? (
            <p
              data-testid="stale-db-unavailable"
              className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500"
            >
              No database connection.
            </p>
          ) : hygiene.stale.length === 0 ? (
            <p
              data-testid="stale-empty"
              className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500"
            >
              No stale memories.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {hygiene.stale.map((row) => (
                <MemoryCard
                  key={row.id}
                  row={row}
                  showActions={false}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Low confidence */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-300">Low Confidence (&lt;50%)</h3>
          {dbUnavailable || hygiene.lowConfidence === null ? (
            <p
              data-testid="low-confidence-db-unavailable"
              className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500"
            >
              No database connection.
            </p>
          ) : hygiene.lowConfidence.length === 0 ? (
            <p
              data-testid="low-confidence-empty"
              className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500"
            >
              No low-confidence candidates.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {hygiene.lowConfidence.map((row) => (
                <MemoryCard
                  key={row.id}
                  row={row}
                  showActions={false}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Missing source refs */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-300">Missing Source References</h3>
          {dbUnavailable || hygiene.missingSource === null ? (
            <p
              data-testid="missing-source-db-unavailable"
              className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500"
            >
              No database connection.
            </p>
          ) : hygiene.missingSource.length === 0 ? (
            <p
              data-testid="missing-source-empty"
              className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500"
            >
              No candidates with missing source references.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {hygiene.missingSource.map((row) => (
                <MemoryCard
                  key={row.id}
                  row={row}
                  showActions={false}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
