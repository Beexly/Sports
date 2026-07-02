/**
 * GmLedgerView — server-rendered display of the GM Ledger.
 *
 * The GM Rating, the process × outcome 2×2, the committed decision ledger, and
 * the live Merkle commitment (published root, inclusion proof, tamper detection).
 * No client state — it's a proof, rendered.
 */

import type { GmLedger, GmDecision, ProcessVerdict, GmQuadrant } from "@/lib/fantasy/gm-ledger";
import { quadrant } from "@/lib/fantasy/gm-ledger";
import { BRAND_COLORS } from "@/lib/brand";

const PROCESS_HEX: Record<ProcessVerdict, string> = {
  sound: BRAND_COLORS.orbitalCyan,
  thin: BRAND_COLORS.softUltraviolet,
  unsound: BRAND_COLORS.ionMagenta,
};

const QUAD_HEX: Record<GmQuadrant, string> = {
  earned: BRAND_COLORS.orbitalCyan,
  "bad-beat": BRAND_COLORS.softUltraviolet,
  "got-lucky": "#E0A800",
  deserved: "#7b8794",
};

export function GmLedgerView({ data }: { data: GmLedger }) {
  const r = data.rating;
  return (
    <div className="space-y-6">
      {/* rating + 2x2 */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* GM Rating */}
        <div className="surface-card relative overflow-hidden p-6">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.orbitalCyan}, transparent)` }} />
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">GM Rating</p>
          <div className="mt-3 flex items-end gap-4">
            <span className="font-display leading-none text-white" style={{ fontSize: "4rem" }}>{r.grade}</span>
            <span className="mb-2 font-mono text-2xl" style={{ color: BRAND_COLORS.orbitalCyan }}>{r.composite}</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">Process-weighted, calibration-checked, luck-adjusted.</p>
          <div className="mt-5 space-y-3">
            <Bar label="Process" value={r.processScore} hex={BRAND_COLORS.orbitalCyan} />
            <Bar label="Calibration" value={r.calibration} hex={BRAND_COLORS.softUltraviolet} />
            <Bar label="Luck-adjusted" value={r.luckAdjusted} hex={BRAND_COLORS.ionMagenta} />
          </div>
        </div>

        {/* process x outcome 2x2 */}
        <div className="surface-card p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Process × outcome</p>
          <p className="mt-1 text-xs text-ink-500">Where skill and luck separate. The ledger rewards the left column.</p>
          <div className="mt-4 grid grid-cols-[auto_1fr_1fr] grid-rows-[auto_1fr_1fr] gap-2 text-center text-xs">
            <span />
            <span className="self-end pb-1 text-[10px] uppercase tracking-wider text-ink-600">Outcome hit</span>
            <span className="self-end pb-1 text-[10px] uppercase tracking-wider text-ink-600">Outcome miss</span>
            <span className="self-center text-[10px] uppercase tracking-wider text-ink-600" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Good process</span>
            <Quad q="earned" n={r.counts.earned} />
            <Quad q="bad-beat" n={r.counts["bad-beat"]} />
            <span className="self-center text-[10px] uppercase tracking-wider text-ink-600" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Poor process</span>
            <Quad q="got-lucky" n={r.counts["got-lucky"]} />
            <Quad q="deserved" n={r.counts.deserved} />
          </div>
        </div>
      </div>

      {/* committed decisions */}
      <div className="space-y-2.5">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">The committed ledger</p>
        {data.decisions.map((d) => <DecisionRow key={d.id} d={d} />)}
      </div>

      {/* merkle commitment */}
      <div className="surface-card p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Tamper-evident commitment</p>
        <p className="mt-2 text-sm text-ink-300">
          All {data.decisions.length} decisions are leaves of a SHA-256 Merkle tree. The root is published
          before outcomes, so the record can be proven, not edited.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <p className="text-[10px] uppercase tracking-wider text-ink-600">Published root</p>
            <p className="mt-1 break-all font-mono text-xs" style={{ color: BRAND_COLORS.orbitalCyan }}>{data.publishedRootShort}</p>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <p className="text-[10px] uppercase tracking-wider text-ink-600">Inclusion proof · {data.proof.recordId}</p>
            <p className="mt-1 font-mono text-xs text-ink-300">leaf {data.proof.leafShort}</p>
            <p className="mt-1 text-xs" style={{ color: data.proof.verified ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>
              {data.proof.verified ? `✓ verified through ${data.proof.siblings.length} siblings` : "✗ failed"}
            </p>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <p className="text-[10px] uppercase tracking-wider text-ink-600">Tamper test</p>
            <p className="mt-1 text-xs text-ink-300">Rewrite {data.tamper.changedId}&apos;s rationale →</p>
            <p className="mt-1 font-mono text-xs text-ink-500">{data.tamper.recomputedRootShort}</p>
            <p className="mt-1 text-xs" style={{ color: BRAND_COLORS.ionMagenta }}>
              {data.tamper.matches ? "matches (bad)" : "✓ root breaks: tamper caught"}
            </p>
          </div>
        </div>
      </div>

      {/* teaching / GM Academy hook */}
      <div className="surface-card p-6" style={{ background: `linear-gradient(180deg, ${BRAND_COLORS.softUltraviolet}0c, transparent)` }}>
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.softUltraviolet }}>GM Academy</p>
        <h3 className="mt-2 font-display text-xl text-white">Train the process, not the box score.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
          A &quot;bad beat&quot; is a decision you&apos;d make again; &quot;got lucky&quot; is one you shouldn&apos;t. Most managers
          grade themselves on the result and learn the wrong lesson. The GM Ledger commits the reasoning first,
          then grades the call against what was knowable, so your rating reflects how you decide, and the
          Academy drills the patterns the ledger says you keep getting wrong.
        </p>
        <a href="/fantasy/academy" className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: BRAND_COLORS.softUltraviolet }}>
          Enter the GM Academy →
        </a>
      </div>
    </div>
  );
}

function Bar({ label, value, hex }: { label: string; value: number; hex: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-400">{label}</span>
        <span className="font-mono" style={{ color: hex }}>{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hex }} />
      </div>
    </div>
  );
}

function Quad({ q, n }: { q: GmQuadrant; n: number }) {
  const hex = QUAD_HEX[q];
  const label = { earned: "Earned it", "bad-beat": "Bad beat", "got-lucky": "Got lucky", deserved: "Deserved miss" }[q];
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: `${hex}55`, background: `${hex}10` }}>
      <p className="font-display text-2xl" style={{ color: hex }}>{n}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: hex }}>{label}</p>
    </div>
  );
}

function DecisionRow({ d }: { d: GmDecision }) {
  const q = quadrant(d);
  const phex = PROCESS_HEX[d.process];
  const qhex = QUAD_HEX[q.key];
  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND_COLORS.ionWhite, background: "rgba(255,255,255,0.06)" }}>W{d.week} · {d.type}</span>
        <span className="text-sm font-semibold text-white">{d.decision}</span>
        <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: qhex, background: `${qhex}18` }}>{q.label}</span>
      </div>
      <div className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <p className="text-ink-400"><span className="text-ink-600">Committed reasoning:</span> {d.rationale}</p>
        <p className="text-ink-400"><span className="text-ink-600">Knowable at commit:</span> {d.infoAtCommit}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
        <span style={{ color: phex }}>Process: {d.process} · <span className="text-ink-400">{d.processReason}</span></span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
        <span className="text-ink-500">Confidence <strong className="text-white">{d.confidence}</strong></span>
        <span className="text-ink-500">Outcome <strong style={{ color: d.outcome === "hit" ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{d.outcome}</strong> · {d.outcomeNote}</span>
      </div>
    </div>
  );
}
