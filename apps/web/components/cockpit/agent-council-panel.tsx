import {
  AGENT_COUNCIL,
  getCouncilSeatCounts,
  type AgentCouncilMember,
  type CouncilSeatStatus,
} from "@/lib/jarvis/agent-council";

/**
 * Agent Council Panel — the governed roster of intelligence roles.
 * Server component over static governance truth. Seats are roles with
 * charters, not running processes; the panel never implies autonomy.
 */

const SEAT_STATUS_STYLES: Readonly<Record<CouncilSeatStatus, string>> = {
  DRAFT_ONLY: "border-plasma/40 bg-plasma/10 text-plasma",
  MANUAL: "border-yellow-900/40 bg-yellow-950/20 text-yellow-300",
  NOT_WIRED: "border-titanium/40 bg-obsidian/60 text-ion-3",
};

export function AgentCouncilPanel() {
  const counts = getCouncilSeatCounts();
  const registered = AGENT_COUNCIL.filter((m) => m.isRegisteredCockpitAgent);
  const designed = AGENT_COUNCIL.filter((m) => !m.isRegisteredCockpitAgent);

  return (
    <section
      data-testid="agent-council-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-titanium/30 px-5 py-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
            Agent Council
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            {counts.total} seats · roles with charters, not running processes · no external
            actions without human approval
          </p>
        </div>
        <div className="flex gap-4 font-mono text-[9px] text-ion-3">
          <span>
            <span className="font-bold tabular-nums text-plasma">{counts.draftOnly}</span>{" "}
            draft-only
          </span>
          <span>
            <span className="font-bold tabular-nums text-yellow-300">{counts.manual}</span>{" "}
            manual
          </span>
          <span>
            <span className="font-bold tabular-nums text-ion-2">{counts.notWired}</span>{" "}
            not wired
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-ion-3">
          Registered cockpit agents · {registered.length}
        </p>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {registered.map((m) => (
            <CouncilSeatCard key={m.id} member={m} />
          ))}
        </div>

        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-ion-3">
          Designed seats — not registered agents · {designed.length}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {designed.map((m) => (
            <CouncilSeatCard key={m.id} member={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CouncilSeatCard({ member }: { member: AgentCouncilMember }) {
  return (
    <div
      data-testid={`council-seat-${member.id}`}
      className="rounded-lg border border-titanium/30 bg-obsidian/40 px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-bold tracking-wider text-ion-white">
          {member.codename}
        </p>
        <span
          className={[
            "flex-shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
            SEAT_STATUS_STYLES[member.status],
          ].join(" ")}
        >
          {member.status.replace("_", " ")}
        </span>
      </div>
      <p className="mt-0.5 text-[9px] font-semibold text-ion-2">{member.role}</p>
      <p className="mt-1 text-[9px] leading-snug text-ion-3">{member.charter}</p>
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
      <p className="mt-1.5 font-mono text-[8px] uppercase tracking-wider text-ion-3/50">
        escalates to {member.escalatesTo.toLowerCase()} · external actions: none
      </p>
    </div>
  );
}
