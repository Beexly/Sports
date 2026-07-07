import type { ClaimEvidenceEntry } from "@/lib/fable/evidence/schemas";

export function formatLedgerDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

export function LayerCard({
  label,
  title,
  body,
  index,
}: {
  readonly label: string;
  readonly title: string;
  readonly body: string;
  readonly index: number;
}) {
  return (
    <article className="flex min-h-full flex-col rounded-2xl border border-mineral bg-eclipse/55 p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
          {label}
        </p>
        <span className="font-mono text-[10px] text-ion-3">{String(index).padStart(2, "0")}</span>
      </div>
      <h2 className="mt-4 text-xl font-bold leading-tight text-ion-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ion-1">{body}</p>
    </article>
  );
}

export function EvidenceMetric({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className="rounded-lg border border-titanium/60 bg-carbon/70 p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-3">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-ion-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ion-2">{detail}</p>
    </div>
  );
}

export function OwnerGatedClaimCard({
  claim,
}: {
  readonly claim: Pick<ClaimEvidenceEntry, "claim_id" | "status" | "next_action">;
}) {
  return (
    <article className="rounded-lg border border-caution/20 bg-carbon/55 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-caution">
          {claim.claim_id}
        </span>
        <span className="rounded-full border border-titanium px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ion-2">
          {claim.status}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-ion-1">{claim.next_action}</p>
    </article>
  );
}
