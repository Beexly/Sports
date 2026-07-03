/**
 * Cockpit — Moderation Queue
 *
 * Shows open reports, the action ladder reference, and appeals awaiting
 * a decision. Renders real DB rows when available; shows honest empty /
 * not-connected state on DB error (probe pattern, same as other cockpit pages).
 *
 * The rooms are not live yet. This surface is the armed machinery.
 * Policy: docs/legal/COMMUNITY_MODERATION_POLICY.md
 */

import Link from "next/link";
import { db } from "@sports/db";
import { LADDER_REFERENCE } from "@/lib/community/moderation";
import type {
  ModerationActionKind,
  ModerationAppealStatus,
  ModerationReasonCode,
  ModerationReportStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

// ── Data shapes ───────────────────────────────────────────────────────────────

interface ReportRow {
  readonly id: string;
  readonly surface: string;
  readonly reason: ModerationReasonCode;
  readonly status: ModerationReportStatus;
  readonly targetUserId: string;
  readonly createdAt: Date;
}

interface AppealRow {
  readonly id: string;
  readonly appellantId: string;
  readonly status: ModerationAppealStatus;
  readonly slaDeadline: Date;
  readonly actionKind: ModerationActionKind;
  readonly createdAt: Date;
}

// ── DB probe ──────────────────────────────────────────────────────────────────

async function loadReports(): Promise<ReportRow[] | null> {
  try {
    const rows = await db.moderationReport.findMany({
      where: { status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      surface: r.surface,
      reason: r.reason,
      status: r.status,
      targetUserId: r.targetUserId,
      createdAt: r.createdAt,
    }));
  } catch {
    return null;
  }
}

async function loadAppeals(): Promise<AppealRow[] | null> {
  try {
    const rows = await db.moderationAppeal.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      orderBy: { slaDeadline: "asc" },
      take: 50,
      include: { action: { select: { action: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      appellantId: r.appellantId,
      status: r.status,
      slaDeadline: r.slaDeadline,
      actionKind: r.action.action,
      createdAt: r.createdAt,
    }));
  } catch {
    return null;
  }
}

// ── Styling helpers ───────────────────────────────────────────────────────────

function reportStatusClass(status: ModerationReportStatus): string {
  switch (status) {
    case "ESCALATED":
      return "border-alert/40 bg-alert/10 text-alert";
    case "UNDER_REVIEW":
      return "border-caution/40 bg-caution/10 text-caution";
    case "OPEN":
    default:
      return "border-titanium/50 bg-obsidian/40 text-ion-1";
  }
}

function appealStatusClass(status: ModerationAppealStatus): string {
  switch (status) {
    case "UNDER_REVIEW":
      return "border-caution/40 bg-caution/10 text-caution";
    case "PENDING":
    default:
      return "border-ion-blue/40 bg-ion-blue/10 text-ion-blue";
  }
}

function slaClass(deadline: Date): string {
  const hoursLeft = (deadline.getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < 24) return "text-alert";
  if (hoursLeft < 72) return "text-caution";
  return "text-ion-2";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CockpitModerationPage(): Promise<JSX.Element> {
  const [reports, appeals] = await Promise.all([loadReports(), loadAppeals()]);

  const dbUnavailable = reports === null || appeals === null;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ion-white">Moderation Queue</h1>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Back to Cockpit
          </Link>
        </div>
        <p className="text-sm text-ion-2">
          Stage-2 community room moderation. Rooms are not live yet — the machinery is armed and
          waiting.
        </p>
        {dbUnavailable && (
          <p
            data-testid="moderation-db-unavailable"
            className="rounded-md border border-caution/40 bg-caution/10 px-3 py-2 text-xs text-caution"
          >
            Database unavailable. Showing structure only — no live data.
          </p>
        )}
      </header>

      {/* Open reports */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ion-white">Open Reports</h2>
        {dbUnavailable || reports === null ? (
          <p
            data-testid="reports-db-unavailable"
            className="rounded-lg border border-titanium/40 bg-obsidian/50 p-5 text-sm text-ion-3"
          >
            No database connection — reports will appear here when rooms are live.
          </p>
        ) : reports.length === 0 ? (
          <p
            data-testid="reports-empty"
            className="rounded-lg border border-titanium/40 bg-obsidian/50 p-5 text-sm text-ion-3"
          >
            No rooms are live; the machinery is armed. Reports will appear here once UGC surfaces
            open.
          </p>
        ) : (
          <ul
            data-testid="reports-list"
            className="flex flex-col gap-2"
          >
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-titanium/40 bg-obsidian/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-label uppercase tracking-wide text-ion-3">
                      <span>{r.surface.replace(/_/g, " ")}</span>
                      <span>{r.createdAt.toISOString().slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-ion-1">
                      {r.reason.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-label-lg text-ion-3">
                      target: {r.targetUserId} · report id: {r.id.slice(0, 8)}…
                    </p>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-1 text-label font-semibold uppercase tracking-wide ${reportStatusClass(r.status)}`}
                  >
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Appeal queue */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ion-white">Appeal Queue</h2>
        <p className="text-xs text-ion-3">
          Only SUSPEND and BAN may be appealed. Each action may be appealed once. A different
          reviewer than the original actor must decide. Decision within 7 days.
        </p>
        {dbUnavailable || appeals === null ? (
          <p
            data-testid="appeals-db-unavailable"
            className="rounded-lg border border-titanium/40 bg-obsidian/50 p-5 text-sm text-ion-3"
          >
            No database connection.
          </p>
        ) : appeals.length === 0 ? (
          <p
            data-testid="appeals-empty"
            className="rounded-lg border border-titanium/40 bg-obsidian/50 p-5 text-sm text-ion-3"
          >
            No pending appeals.
          </p>
        ) : (
          <ul
            data-testid="appeals-list"
            className="flex flex-col gap-2"
          >
            {appeals.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-titanium/40 bg-obsidian/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-label uppercase tracking-wide text-ion-3">
                      <span>{a.actionKind}</span>
                      <span>filed {a.createdAt.toISOString().slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-ion-1">
                      Appellant: {a.appellantId}
                    </p>
                    <p className={`mt-0.5 text-label-lg ${slaClass(a.slaDeadline)}`}>
                      SLA deadline: {a.slaDeadline.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-1 text-label font-semibold uppercase tracking-wide ${appealStatusClass(a.status)}`}
                  >
                    {a.status.replace(/_/g, " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Action ladder reference */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ion-white">Action Ladder Reference</h2>
        <p className="text-xs text-ion-3">
          Graduated actions from policy. Hate speech, threats, doxxing, and self-exclusion
          circumvention may jump straight to BAN. Every action requires actor + reason — this is
          law.
        </p>
        <ul
          data-testid="ladder-reference"
          className="flex flex-col divide-y divide-titanium/30 rounded-xl border border-titanium/40"
        >
          {LADDER_REFERENCE.map((entry) => (
            <li
              key={entry.action}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ion-white">{entry.action}</p>
                <p className="mt-0.5 text-xs text-ion-3">{entry.description}</p>
                {entry.expiryLabel && (
                  <p className="mt-0.5 text-label-lg text-ion-3">
                    Expires: {entry.expiryLabel}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {entry.appealable && (
                  <span className="rounded bg-ion-blue/10 px-1.5 py-0.5 text-label font-semibold text-ion-blue">
                    appealable
                  </span>
                )}
                {entry.straightToBan && (
                  <span className="rounded bg-alert/10 px-1.5 py-0.5 text-label font-semibold text-alert">
                    straight-to-ban
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
