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

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<AirwaveLaneStatus, string> = {
  open: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  held: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  "missing-config": "border-gray-700 bg-gray-900/70 text-gray-300",
  "legal-hold": "border-red-500/30 bg-red-950/30 text-red-200",
  "manual-review": "border-violet-500/30 bg-violet-950/30 text-violet-200",
};

const VERDICT_TONE: Record<ClaimVerdict, string> = {
  HIT: "text-cyan-300",
  MISS: "text-pink-400",
  PUSH: "text-violet-300",
  UNFALSIFIABLE: "text-gray-400",
  PENDING: "text-yellow-300",
};

const INTAKE_TONE: Record<AirwaveIntakeStatus, string> = {
  "not-configured": "border-gray-700 bg-gray-900/70 text-gray-300",
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
              href="/intelligence/airwave"
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-gray-300 hover:bg-gray-900/60"
            >
              Public ledger
            </Link>
            <Link
              href="/api/airwave/readiness"
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-gray-300 hover:bg-gray-900/60"
            >
              JSON readiness
            </Link>
            <Link
              href="/api/airwave/intake-readiness"
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-gray-300 hover:bg-gray-900/60"
            >
              Intake JSON
            </Link>
            <Link
              href="/cockpit/sources"
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-gray-300 hover:bg-gray-900/60"
            >
              Source board
            </Link>
          </div>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-gray-400">
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

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Transcript intake validator
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
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
          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
            <h3 className="text-sm font-semibold text-white">Gate reason</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">{intake.source.reason}</p>
            <dl className="mt-4 grid gap-2 text-xs">
              <Fact label="Configured" value={String(intake.source.configured)} />
              <Fact label="File kind" value={intake.source.fileKind ?? "UNKNOWN"} />
              <Fact label="Import flag" value={String(intake.gates.transcriptImportEnabled)} />
              <Fact label="Writes rows" value={String(intake.gates.canWriteRows)} />
            </dl>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-[10px] uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Contract check</th>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="px-3 py-2 text-gray-500">Required columns</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-300">
                    {intake.contract.requiredColumns.join(", ")}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-500">Present columns</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-300">
                    {intake.contract.presentColumns.length > 0 ? intake.contract.presentColumns.join(", ") : "UNKNOWN"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-500">Missing required</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-300">
                    {intake.contract.missingRequiredColumns.length > 0 ? intake.contract.missingRequiredColumns.join(", ") : "none"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Intake lanes
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                These are potential inputs, not proof of live data. A lane marked open still feeds
                draft review, not public publishing.
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-[11px] text-gray-400">
              master: <span className="text-gray-100">{String(control.env.enabled)}</span>
              <span className="mx-2 text-gray-700">/</span>
              legal ack: <span className="text-gray-100">{String(control.env.siriusxmLegalAck)}</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {control.lanes.map((lane) => (
              <LaneCard key={lane.key} lane={lane} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Spreadsheet contract
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            This is the minimum shape for a transcript or translated show sheet. Missing fields
            should hold the row in draft until an operator resolves them.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-[10px] uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Req</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {control.spreadsheetContract.map((field) => (
                  <tr key={field.column} className="align-top">
                    <td className="px-3 py-2 font-mono text-[11px] text-cyan-300">{field.column}</td>
                    <td className="px-3 py-2 text-gray-400">{field.purpose}</td>
                    <td className="px-3 py-2 text-gray-500">{field.required ? "yes" : "no"}</td>
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

        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Adapter gate dry run
          </h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {control.adapters.map((adapter) => (
              <div key={adapter.kind} className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-100">{adapter.label}</p>
                  <span className={adapter.held ? "text-xs font-semibold text-yellow-300" : "text-xs font-semibold text-emerald-300"}>
                    {adapter.held ? "held" : "open"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-500">{adapter.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Draft claim queue - illustrative only
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          The rows below are fictional demo claims that exercise the review shape. They are not
          live named-broadcast data.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="py-2 pr-3 font-medium">Aired</th>
                <th className="py-2 pr-3 font-medium">Pundit</th>
                <th className="py-2 pr-3 font-medium">Claim (paraphrased)</th>
                <th className="py-2 pr-3 font-medium">Proposed</th>
                <th className="py-2 pr-3 font-medium">Source ref (internal)</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_CLAIMS.map((claim) => (
                <tr key={claim.id} className="border-b border-gray-800/60 align-top">
                  <td className="py-2 pr-3 font-mono text-[11px] text-gray-400">
                    {claim.airedAt.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="py-2 pr-3 text-gray-300">{punditName(claim.punditId)}</td>
                  <td className="py-2 pr-3 text-gray-200">
                    <span className="text-gray-500">
                      {claim.sport} / {claim.subject} -
                    </span>{" "}
                    {claim.assertion}
                  </td>
                  <td className={`py-2 pr-3 font-semibold ${VERDICT_TONE[claim.verdict]}`}>
                    {claim.verdict}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-600">
                    {claim.sourceClipRef}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Link
        href="/cockpit"
        className="w-fit rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60"
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
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-black/20 px-3 py-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-mono text-[11px] text-gray-300">{value}</dd>
    </div>
  );
}

function LaneCard({ lane }: { lane: AirwaveInputLane }): JSX.Element {
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{lane.name}</h3>
          <p className="mt-1 text-xs text-gray-500">{lane.source}</p>
        </div>
        <span className={`rounded border px-2 py-1 text-[11px] ${STATUS_TONE[lane.status]}`}>
          {statusLabel(lane.status)}
        </span>
      </div>
      <dl className="mt-3 grid gap-3 text-xs md:grid-cols-2">
        <div>
          <dt className="text-gray-600">Cadence</dt>
          <dd className="mt-1 text-gray-300">{lane.cadence}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Output</dt>
          <dd className="mt-1 text-gray-300">{lane.output}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Operator action</dt>
          <dd className="mt-1 text-gray-300">{lane.operatorAction}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Env slots</dt>
          <dd className="mt-1 font-mono text-[11px] text-gray-500">{lane.envVars.join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-lg border border-gray-800 bg-black/20 px-3 py-2 text-xs leading-5 text-gray-500">
        {lane.complianceNote}
      </p>
    </article>
  );
}
