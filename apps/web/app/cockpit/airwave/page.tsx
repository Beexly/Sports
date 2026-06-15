import Link from "next/link";
import {
  DEMO_CLAIMS,
  DEMO_PUNDITS,
  readAirwaveControlPlane,
  readAirwaveIntakeReadiness,
  type AirwaveInputLane,
  type AirwaveIntakeStatus,
  type AirwaveLaneStatus,
  type ClaimVerdict,
} from "@/lib/airwave";
import { readIntelligenceControlPlane } from "@/lib/airwave/intelligence-control-plane";
import type { IntakeLaneState } from "@/lib/airwave/intake-contract";
import type { ClaimCandidateOperatorStatus } from "@/lib/airwave/claim-extraction-contract";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<AirwaveLaneStatus, string> = {
  open: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  held: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  "missing-config": "border-titanium/40 bg-eclipse/60 text-ion-1",
  "legal-hold": "border-red-500/30 bg-red-950/30 text-red-200",
  "manual-review": "border-violet-500/30 bg-violet-950/30 text-violet-200",
};

const VERDICT_TONE: Record<ClaimVerdict, string> = {
  HIT: "text-cyan-300",
  MISS: "text-pink-400",
  PUSH: "text-violet-300",
  UNFALSIFIABLE: "text-ion-2",
  PENDING: "text-yellow-300",
};

const INTAKE_TONE: Record<AirwaveIntakeStatus, string> = {
  "not-configured": "border-titanium/40 bg-eclipse/60 text-ion-1",
  unreachable: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  "invalid-contract": "border-red-500/30 bg-red-950/30 text-red-200",
  held: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  "review-ready": "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
};

function statusLabel(status: AirwaveLaneStatus): string {
  switch (status) {
    case "open":
      return "open";
    case "held":
      return "held";
    case "missing-config":
      return "missing config";
    case "legal-hold":
      return "legal hold";
    case "manual-review":
      return "manual review";
  }
}

function punditName(id: string): string {
  return DEMO_PUNDITS.find((pundit) => pundit.id === id)?.name ?? id;
}

export default async function CockpitAirwavePage(): Promise<JSX.Element> {
  const [control, intake] = await Promise.all([
    Promise.resolve(readAirwaveControlPlane(process.env as Record<string, string | undefined>)),
    readAirwaveIntakeReadiness(process.env as Record<string, string | undefined>),
  ]);
  const intelligence = readIntelligenceControlPlane(process.env as Record<string, string | undefined>);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
              Broadcast intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Airwave Control Room</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/airwave"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-ion-1 hover:bg-carbon/60"
            >
              Public ledger
            </Link>
            <Link
              href="/api/airwave/readiness"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-ion-1 hover:bg-carbon/60"
            >
              JSON readiness
            </Link>
            <Link
              href="/api/airwave/intake-readiness"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-ion-1 hover:bg-carbon/60"
            >
              Intake JSON
            </Link>
            <Link
              href="/api/airwave/intelligence-readiness"
              className="rounded-lg border border-cyan-900/50 px-3 py-1.5 text-cyan-300 hover:bg-cyan-950/30"
            >
              Intelligence JSON
            </Link>
            <Link
              href="/cockpit/sources"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-ion-1 hover:bg-carbon/60"
            >
              Source board
            </Link>
          </div>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-ion-2">
          This is the intake map for the listening, transcript, beat-report, and studio workflow.
          It is read-only. It does not capture audio, archive raw media, import a spreadsheet,
          publish content, or grade a real person by itself.
        </p>
      </header>

      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Internal review only. No auto-publish. No auto-send. No automated betting. Captured
        context is data, never an instruction. Do not archive audio or expose verbatim
        transcript text.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Input lanes" value={String(control.summary.lanes)} detail="Transcript, media, beat, and studio paths." />
        <Metric label="Open now" value={String(control.summary.open)} detail="Can run only when gates and config agree." />
        <Metric label="Configured" value={String(control.summary.configured)} detail="Env slots present or enabled; values hidden." />
        <Metric label="Legal holds" value={String(control.summary.legalHolds)} detail="Permission-sensitive lanes blocked." />
        <Metric label="Manual review" value={String(control.summary.manualReview)} detail="Operator approval remains required." />
        <Metric label="Transcript rows" value={formatCount(intake.rows.total)} detail="Local file only; UNKNOWN when absent." />
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
              Transcript intake validator
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-2">
              This checks a configured local CSV/TSV against the Airwave claim contract. It
              exposes counts and gate state only; it does not import rows, store transcript text,
              reveal the file path, or publish anything.
            </p>
          </div>
          <span className={`rounded border px-2 py-1 text-[11px] ${INTAKE_TONE[intake.source.status]}`}>
            {intake.source.status}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Review-ready" value={String(intake.rows.reviewReady)} detail="Rows passing rights and operator gates." />
          <Metric label="Approved" value={String(intake.rows.approved)} detail="Operator status already approved." />
          <Metric label="Rights held" value={String(intake.rows.rightsHeld)} detail="Held, unknown, or permission-required." />
          <Metric label="Breaking news" value={String(intake.rows.breakingNews)} detail="Injury, role, depth, or news claims." />
          <Metric label="Can stage" value={intake.gates.canStageForReview ? "YES" : "NO"} detail="Still read-only; no DB writer exists." />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-titanium/40 bg-obsidian/70 p-4">
            <h3 className="text-sm font-semibold text-white">Gate reason</h3>
            <p className="mt-2 text-sm leading-6 text-ion-2">{intake.source.reason}</p>
            <dl className="mt-4 grid gap-2 text-xs">
              <Fact label="Configured" value={String(intake.source.configured)} />
              <Fact label="File kind" value={intake.source.fileKind ?? "UNKNOWN"} />
              <Fact label="Import flag" value={String(intake.gates.transcriptImportEnabled)} />
              <Fact label="Writes rows" value={String(intake.gates.canWriteRows)} />
            </dl>
          </div>
          <div className="overflow-hidden rounded-xl border border-titanium/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian/60 text-[10px] uppercase tracking-widest text-ion-3">
                <tr>
                  <th className="px-3 py-2">Contract check</th>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-titanium/30">
                <tr>
                  <td className="px-3 py-2 text-ion-3">Required columns</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ion-1">
                    {intake.contract.requiredColumns.join(", ")}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-ion-3">Present columns</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ion-1">
                    {intake.contract.presentColumns.length > 0 ? intake.contract.presentColumns.join(", ") : "UNKNOWN"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-ion-3">Missing required</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ion-1">
                    {intake.contract.missingRequiredColumns.length > 0 ? intake.contract.missingRequiredColumns.join(", ") : "none"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
                Intake lanes
              </h2>
              <p className="mt-2 text-sm leading-6 text-ion-2">
                These are potential inputs, not proof of live data. A lane marked open still feeds
                draft review, not public publishing.
              </p>
            </div>
            <div className="rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 text-[11px] text-ion-2">
              master: <span className="text-ion-white">{String(control.env.enabled)}</span>
              <span className="mx-2 text-ion-3">/</span>
              legal ack: <span className="text-ion-white">{String(control.env.siriusxmLegalAck)}</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {control.lanes.map((lane) => (
              <LaneCard key={lane.key} lane={lane} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
            Spreadsheet contract
          </h2>
          <p className="mt-2 text-sm leading-6 text-ion-2">
            This is the minimum shape for a transcript or translated show sheet. Missing fields
            should hold the row in draft until an operator resolves them.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-titanium/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian/60 text-[10px] uppercase tracking-widest text-ion-3">
                <tr>
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Req</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-titanium/30">
                {control.spreadsheetContract.map((field) => (
                  <tr key={field.column} className="align-top">
                    <td className="px-3 py-2 font-mono text-[11px] text-cyan-300">{field.column}</td>
                    <td className="px-3 py-2 text-ion-2">{field.purpose}</td>
                    <td className="px-3 py-2 text-ion-3">{field.required ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-300">
            Do-not-automate boundary
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-red-100/80">
            <li>No raw audio archive.</li>
            <li>No verbatim transcript text on public surfaces.</li>
            <li>No satellite-radio automation without explicit legal acknowledgement.</li>
            <li>No named-person public scorecard until founder and counsel approve it.</li>
            <li>No external publishing path from this cockpit.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
            Adapter gate dry run
          </h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {control.adapters.map((adapter) => (
              <div key={adapter.kind} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ion-white">{adapter.label}</p>
                  <span className={adapter.held ? "text-xs font-semibold text-yellow-300" : "text-xs font-semibold text-emerald-300"}>
                    {adapter.held ? "held" : "open"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-ion-3">{adapter.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
          Draft claim queue - illustrative only
        </h2>
        <p className="mt-2 text-sm leading-6 text-ion-2">
          The rows below are fictional demo claims that exercise the review shape. They are not
          live named-broadcast data.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-titanium/40 text-ion-3">
                <th className="py-2 pr-3 font-medium">Aired</th>
                <th className="py-2 pr-3 font-medium">Pundit</th>
                <th className="py-2 pr-3 font-medium">Claim (paraphrased)</th>
                <th className="py-2 pr-3 font-medium">Proposed</th>
                <th className="py-2 pr-3 font-medium">Source ref (internal)</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_CLAIMS.map((claim) => (
                <tr key={claim.id} className="border-b border-titanium/40 align-top">
                  <td className="py-2 pr-3 font-mono text-[11px] text-ion-2">
                    {claim.airedAt.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="py-2 pr-3 text-ion-1">{punditName(claim.punditId)}</td>
                  <td className="py-2 pr-3 text-ion-1">
                    <span className="text-ion-3">
                      {claim.sport} / {claim.subject} -
                    </span>{" "}
                    {claim.assertion}
                  </td>
                  <td className={`py-2 pr-3 font-semibold ${VERDICT_TONE[claim.verdict]}`}>
                    {claim.verdict}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-ion-3">
                    {claim.sourceClipRef}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Claim Review Queue ── */}
      <section data-testid="claim-review-queue" className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
              Claim Review Queue
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-2">
              Operator-gated staging area for extracted claim candidates. Claims must pass
              rights check and operator review before reaching any public surface.
              No claim auto-advances. No claim is published from here.
            </p>
          </div>
          <Link
            href="/api/airwave/review-queue"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Queue JSON
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total claims" value="0" detail="Claims in queue (live import not yet active)." />
          <Metric label="DRAFT" value="0" detail="Awaiting operator first review." />
          <Metric label="IN REVIEW" value="0" detail="Operator has started review." />
          <Metric label="APPROVED" value="0" detail="Cleared for GSE/GSN output mapping." />
          <Metric label="GSE ready" value="0" detail="Approved + GSE-relevant claim type." />
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-titanium/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-obsidian/60 text-[10px] uppercase tracking-widest text-ion-3">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Claim (paraphrased)</th>
                <th className="px-3 py-2">Sport / Entity</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">GSE</th>
                <th className="px-3 py-2">GSN</th>
                <th className="px-3 py-2">Public safe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-ion-3">
                  No claims in queue. Import via{" "}
                  <span className="font-mono text-cyan-700">AIRWAVE_CLAIM_BATCH_FILE</span>
                  {" "}or the batch validator API once a source lane is active.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border border-titanium/40 bg-obsidian/70 p-4">
          <h3 className="text-sm font-semibold text-white">Review Gate — Status Machine</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {(["DRAFT", "REVIEW", "APPROVED", "REJECTED", "SETTLED"] as ClaimCandidateOperatorStatus[]).map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className={`rounded border px-2 py-1 font-mono ${REVIEW_STATUS_TONE[s]}`}>{s}</span>
                {i < arr.length - 1 && i !== 2 && <span className="text-ion-3">→</span>}
                {i === 2 && <span className="text-ion-3 mx-1">or</span>}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-ion-3">
            DRAFT → REVIEW requires operator opens the claim. REVIEW → APPROVED requires
            rights confirmed + paraphrase verified. APPROVED claims can map to GSE/GSN outputs.
            REJECTED claims are archived, never published. SETTLED = historically confirmed outcome.
          </p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Fact label="Can write status" value="NO — no DB writer active" />
            <Fact label="Can auto-approve" value="NO — operator gate required" />
            <Fact label="Can publish directly" value="NO — GSE/GSN mapping step required" />
            <Fact label="Batch validator env" value="AIRWAVE_CLAIM_BATCH_FILE" />
          </dl>
        </div>
      </section>

      {/* ── Intelligence Intake Posture ── */}
      <section data-testid="intelligence-intake-posture" className="rounded-2xl border border-cyan-900/40 bg-cyan-950/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
              Intelligence Intake Posture
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-2">
              GSE / GSN Airwave Intelligence — source policy map, CH87 lane status,
              legal hold state, and intake readiness across all 10 source categories.
              Read-only. No capture. No auto-publish.
            </p>
          </div>
          <span
            data-testid="ch87-lane-status"
            className={`rounded border px-2 py-1 text-[11px] ${
              intelligence.operatorSurface.legalAckGranted
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
                : "border-yellow-500/30 bg-yellow-950/30 text-yellow-200"
            }`}
          >
            CH87 {intelligence.operatorSurface.ch87LaneStatus.toLowerCase().replace(/_/g, "-")}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Source policies" value={String(intelligence.sourcePolicySummary.total)} detail="Typed source categories defined." />
          <Metric label="Policy active" value={String(intelligence.sourcePolicySummary.active)} detail="Sources currently in ACTIVE status." />
          <Metric label="Policy held" value={String(intelligence.sourcePolicySummary.held)} detail="Sources in HELD status." />
          <Metric label="Legal holds" value={String(intelligence.sourcePolicySummary.legalHolds)} detail="Sources requiring legal ACK." />
          <Metric label="Window" value={intelligence.operatorSurface.currentWindowOpen ? "OPEN" : "CLOSED"} detail="05:00–23:00 CT airing window." />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {/* CH87 Status Card */}
          <div className="rounded-xl border border-titanium/40 bg-obsidian/70 p-4">
            <h3 className="text-sm font-semibold text-white">Channel 87 — Status</h3>
            <dl className="mt-3 grid gap-2 text-xs">
              <Fact label="Lane status" value={intelligence.intakePlan.channel87.laneStatus} />
              <Fact label="Window (CT)" value={`${intelligence.intakePlan.channel87.windowStartHour}:00 – ${intelligence.intakePlan.channel87.windowEndHour}:00`} />
              <Fact label="Legal ACK" value={intelligence.operatorSurface.legalAckGranted ? "GRANTED" : "REQUIRED"} />
              <Fact label="Manual import" value={intelligence.operatorSurface.manualImportReady ? "READY" : "NOT CONFIGURED"} />
              <Fact label="Schedule shows" value={String(intelligence.channel87Summary.totalShows)} />
              <Fact label="Sample blocks" value={String(intelligence.channel87Summary.sampleOnlyShows)} />
            </dl>
            <p className="mt-3 text-xs leading-5 text-yellow-200/70">
              {intelligence.channel87Summary.operatorNote}
            </p>
          </div>

          {/* GSE / GSN Output Readiness */}
          <div data-testid="gse-gsn-output-readiness" className="rounded-xl border border-titanium/40 bg-obsidian/70 p-4">
            <h3 className="text-sm font-semibold text-white">GSE / GSN Output Readiness</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-3">GSE</p>
                <dl className="mt-2 grid gap-2 text-xs">
                  <Fact label="Pick evidence" value={intelligence.gseOutputReadiness.pickEvidenceCandidates ? "READY" : "HELD"} />
                  <Fact label="Injury alerts" value={intelligence.gseOutputReadiness.injuryAlerts ? "READY" : "HELD"} />
                  <Fact label="Market signals" value={intelligence.gseOutputReadiness.marketSignals ? "READY" : "HELD"} />
                  <Fact label="Usage alerts" value={intelligence.gseOutputReadiness.usageAlerts ? "READY" : "HELD"} />
                </dl>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-3">GSN</p>
                <dl className="mt-2 grid gap-2 text-xs">
                  <Fact label="Show briefs" value={intelligence.gsnOutputReadiness.showBriefs ? "READY" : "HELD"} />
                  <Fact label="Segment ideas" value={intelligence.gsnOutputReadiness.segmentIdeas ? "READY" : "HELD"} />
                  <Fact label="Editorial notes" value={intelligence.gsnOutputReadiness.editorialNotes ? "READY" : "HELD"} />
                  <Fact label="Hot take ledger" value={intelligence.gsnOutputReadiness.hotTakeLedger ? "READY" : "HELD"} />
                </dl>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-ion-3">
              {intelligence.gseOutputReadiness.summary}
            </p>
          </div>
        </div>
      </section>

      {/* ── Intelligence Intake Lanes ── */}
      <section data-testid="intelligence-intake-lanes" className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
          Intelligence Intake Lanes
        </h2>
        <p className="mt-2 text-sm leading-6 text-ion-2">
          All intelligence intake lanes and their current operational mode.
          No lane can auto-publish. Source pointer is private on every lane.
        </p>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {intelligence.intakePlan.lanes.map((lane) => (
            <IntakeLaneCard key={lane.laneId} lane={lane} />
          ))}
        </div>
      </section>

      {/* ── Next Operator Actions ── */}
      {intelligence.operatorSurface.nextOperatorActions.length > 0 && (
        <section data-testid="next-operator-actions" className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
            Next Operator Actions
          </h2>
          <ul className="mt-4 space-y-2">
            {intelligence.operatorSurface.nextOperatorActions.map((action, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-titanium/40 bg-obsidian/50 px-3 py-2 text-sm text-ion-1">
                <span className="mt-0.5 shrink-0 text-cyan-400">→</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/cockpit"
        className="w-fit rounded-lg border border-titanium/40 px-3 py-2 text-xs text-ion-1 hover:bg-carbon/60"
      >
        Back to Jarvis
      </Link>
    </div>
  );
}

function formatCount(value: number | "UNKNOWN"): string {
  return typeof value === "number" ? String(value) : value;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-titanium/40 bg-black/20 px-3 py-2">
      <dt className="text-ion-3">{label}</dt>
      <dd className="font-mono text-[11px] text-ion-1">{value}</dd>
    </div>
  );
}

const REVIEW_STATUS_TONE: Record<string, string> = {
  DRAFT: "border-titanium/40 bg-eclipse/60 text-ion-2",
  REVIEW: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  APPROVED: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  REJECTED: "border-red-500/30 bg-red-950/30 text-red-200",
  SETTLED: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
};

const INTAKE_MODE_TONE: Record<string, string> = {
  OFF: "border-titanium/40 bg-eclipse/60 text-ion-2",
  DRY_RUN: "border-blue-500/30 bg-blue-950/30 text-blue-200",
  MANUAL_IMPORT_READY: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  MANUAL_IMPORT_HELD: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  LOCAL_LISTENER_DESIGNED: "border-blue-500/30 bg-blue-950/30 text-blue-200",
  LOCAL_LISTENER_HELD: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  LOCAL_LISTENER_READY: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  ACTIVE: "border-emerald-400/50 bg-emerald-900/30 text-emerald-100",
};

function IntakeLaneCard({ lane }: { lane: IntakeLaneState }): JSX.Element {
  const tone = INTAKE_MODE_TONE[lane.mode] ?? INTAKE_MODE_TONE["OFF"]!;
  return (
    <article className="rounded-xl border border-titanium/40 bg-obsidian/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{lane.label}</h3>
        <span className={`rounded border px-2 py-1 text-[11px] ${tone}`}>
          {lane.mode.toLowerCase().replace(/_/g, "-")}
        </span>
      </div>
      {lane.blockedReasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {lane.blockedReasons.map((reason, i) => (
            <li key={i} className="text-xs leading-5 text-yellow-200/70">
              {reason}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs leading-5 text-ion-3">{lane.nextOperatorAction}</p>
    </article>
  );
}

function LaneCard({ lane }: { lane: AirwaveInputLane }): JSX.Element {
  return (
    <article className="rounded-xl border border-titanium/40 bg-obsidian/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{lane.name}</h3>
          <p className="mt-1 text-xs text-ion-3">{lane.source}</p>
        </div>
        <span className={`rounded border px-2 py-1 text-[11px] ${STATUS_TONE[lane.status]}`}>
          {statusLabel(lane.status)}
        </span>
      </div>
      <dl className="mt-3 grid gap-3 text-xs md:grid-cols-2">
        <div>
          <dt className="text-ion-3">Cadence</dt>
          <dd className="mt-1 text-ion-1">{lane.cadence}</dd>
        </div>
        <div>
          <dt className="text-ion-3">Output</dt>
          <dd className="mt-1 text-ion-1">{lane.output}</dd>
        </div>
        <div>
          <dt className="text-ion-3">Operator action</dt>
          <dd className="mt-1 text-ion-1">{lane.operatorAction}</dd>
        </div>
        <div>
          <dt className="text-ion-3">Env slots</dt>
          <dd className="mt-1 font-mono text-[11px] text-ion-3">{lane.envVars.join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-lg border border-titanium/40 bg-black/20 px-3 py-2 text-xs leading-5 text-ion-3">
        {lane.complianceNote}
      </p>
    </article>
  );
}
