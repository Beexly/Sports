import {
  getCouncilSeatCounts,
  getCouncilByDepartment,
  type AgentSeat,
  type CouncilSeatStatus,
} from "@/lib/jarvis/agent-council";
import type { LedgerStatus } from "@/lib/jarvis/ledger-types";

/**
 * Agent Council Panel — department-oriented view of the governed council.
 * Server component over static governance truth. Seats are roles with
 * charters, not running processes; the panel never implies autonomy.
 */

// ─── Status styles ────────────────────────────────────────────────────────────

const SEAT_STATUS_STYLES: Readonly<Record<CouncilSeatStatus, string>> = {
  DRAFT_ONLY: "border-plasma/40 bg-plasma/10 text-plasma",
  MANUAL: "border-caution/40 bg-caution/20 text-caution",
  NOT_WIRED: "border-titanium/40 bg-obsidian/60 text-ion-3",
};

const SEAT_STATUS_LABEL: Readonly<Record<CouncilSeatStatus, string>> = {
  DRAFT_ONLY: "DRAFT ONLY",
  MANUAL: "MANUAL",
  NOT_WIRED: "NOT WIRED",
};

// ─── Panel ────────────────────────────────────────────────────────────────────

export function AgentCouncilPanel({ ledger }: { ledger: LedgerStatus }) {
  const counts = getCouncilSeatCounts();
  const byDepartment = getCouncilByDepartment();

  return (
    <section
      data-testid="agent-council-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-titanium/30 px-5 py-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
            Agent Council
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            {counts.total} seats across 6 departments · roles with charters, not running
            processes · no external actions without human approval
          </p>
        </div>
        <div className="flex gap-4 font-mono text-[9px] text-ion-3">
          <span>
            <span className="font-bold tabular-nums text-plasma">{counts.draftOnly}</span>{" "}
            draft-only
          </span>
          <span>
            <span className="font-bold tabular-nums text-caution">{counts.manual}</span>{" "}
            manual
          </span>
          <span>
            <span className="font-bold tabular-nums text-ion-2">{counts.notWired}</span>{" "}
            not wired
          </span>
        </div>
      </div>

      {/* Department cards */}
      <div className="p-4 space-y-6">
        {Array.from(byDepartment.entries()).map(([dept, seats]) => (
          <DepartmentCard key={dept} department={dept} seats={seats} />
        ))}
      </div>

      {/* Ledger posture — honest: shows real counts when connected */}
      <div
        data-testid="council-ledger-posture"
        className="border-t border-titanium/30 px-5 py-3"
      >
        {ledger.storeAvailable ? (
          <p className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
            Handoff ledger:{" "}
            <span className="text-plasma font-bold tabular-nums">{ledger.handoffCount}</span>{" "}
            entries · Subagent run ledger:{" "}
            <span className="text-plasma font-bold tabular-nums">{ledger.subagentRunCount}</span>{" "}
            runs ·{" "}
            <span className="text-caution font-bold tabular-nums">{ledger.pendingReviewCount}</span>{" "}
            pending parent review
          </p>
        ) : (
          <p className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
            Handoff ledger · Subagent run ledger:{" "}
            <span className="text-caution">Not connected</span> — entry types
            are defined; the store lands with a later migration. Nothing is
            logged yet and nothing pretends to be.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Department card ──────────────────────────────────────────────────────────

function DepartmentCard({
  department,
  seats,
}: {
  department: string;
  seats: readonly AgentSeat[];
}) {
  const draftSeats = seats.filter((s) => s.status === "DRAFT_ONLY");
  const manualSeats = seats.filter((s) => s.status === "MANUAL");
  const notWiredSeats = seats.filter((s) => s.status === "NOT_WIRED");
  const leadSeat = draftSeats[0] ?? manualSeats[0] ?? seats[0];
  const hasOwnerApproval = seats.some((s) => s.ownerApprovalRequired);

  return (
    <div className="rounded-xl border border-titanium/30 bg-obsidian/20 p-3">
      {/* Department header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ion-2">
            {department}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-ion-3">
            Lead: <span className="text-ion-white">{leadSeat?.codename ?? "—"}</span>
            {" · "}
            <span className="text-plasma">{draftSeats.length} draft-only</span>
            {manualSeats.length > 0 && (
              <>{" · "}<span className="text-caution">{manualSeats.length} manual</span></>
            )}
            {notWiredSeats.length > 0 && (
              <>{" · "}<span className="text-ion-3">{notWiredSeats.length} not wired</span></>
            )}
          </p>
        </div>
        {hasOwnerApproval && (
          <span className="rounded border border-caution/40 bg-caution/20 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-caution">
            owner approval
          </span>
        )}
      </div>

      {/* Seat cards grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {seats.map((seat) => (
          <CouncilSeatCard key={seat.id} member={seat} />
        ))}
      </div>
    </div>
  );
}

// ─── Seat card ────────────────────────────────────────────────────────────────

function CouncilSeatCard({ member }: { member: AgentSeat }) {
  return (
    <div
      data-testid={`council-seat-${member.id}`}
      className="rounded-lg border border-titanium/30 bg-obsidian/40 px-3 py-2.5"
    >
      {/* Top row: codename + status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-mono text-[10px] font-bold tracking-wider text-ion-white truncate">
            {member.codename}
          </p>
          {member.standingSubagent && (
            <span className="flex-shrink-0 rounded border border-plasma/60 bg-plasma/20 px-1 py-0.5 font-mono text-[7px] font-bold uppercase tracking-widest text-plasma">
              standing subagent
            </span>
          )}
        </div>
        <span
          className={[
            "flex-shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
            SEAT_STATUS_STYLES[member.status],
          ].join(" ")}
        >
          {SEAT_STATUS_LABEL[member.status]}
        </span>
      </div>

      {/* Role */}
      <p className="mt-0.5 text-[9px] font-semibold text-ion-2">{member.role}</p>

      {/* Charter */}
      <p className="mt-1 text-[9px] leading-snug text-ion-3">{member.charter}</p>

      {/* Capability badges */}
      {member.ownsCapabilities.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {member.ownsCapabilities.map((id) => (
            <span
              key={id}
              className="rounded bg-titanium/40 px-1.5 py-0.5 font-mono text-[8px] text-ion-3"
            >
              {id}
            </span>
          ))}
        </div>
      )}

      {/* Governance metadata row */}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        <p className="font-mono text-[8px] uppercase tracking-wider text-ion-3/50">
          tier {member.authorityTier}
        </p>
        <p className="font-mono text-[8px] uppercase tracking-wider text-ion-3/50">
          reports to {member.reportsTo.join(", ")}
        </p>
        <p className="font-mono text-[8px] uppercase tracking-wider text-ion-3/50">
          escalates to {member.escalatesTo.join(", ")}
        </p>
        <p className="font-mono text-[8px] uppercase tracking-wider text-ion-3/50">
          external actions: never
        </p>
        {member.canSpawnSubagents && (
          <p className="font-mono text-[8px] uppercase tracking-wider text-plasma/70">
            can spawn subagents
          </p>
        )}
        {member.ownerApprovalRequired && (
          <p className="font-mono text-[8px] uppercase tracking-wider text-caution/70">
            requires owner approval
          </p>
        )}
      </div>

      {/* Review gates for not-wired seats */}
      {member.status === "NOT_WIRED" && member.reviewGates.length > 0 && (
        <p className="mt-1 font-mono text-[8px] text-ion-3/40">
          review gates: {member.reviewGates.join(", ")}
        </p>
      )}
    </div>
  );
}
