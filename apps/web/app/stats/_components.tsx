import Link from "next/link";
import type { StatKingPlayer } from "@/lib/statking/product";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export function Shell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  // Wrap the stats surface in the site chrome. Without Nav + Footer every /stats
  // page was a dead-end (no way back into the app) and shipped without the footer's
  // risk-disclosure/helpline — an orphaned, chrome-less tree on a trust-first product.
  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />
      <main id="main-content" className="flex-1 px-6 py-10 text-ion">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-orbital-cyan">{eyebrow ?? "StatKing"}</p>
          <h1 className="mt-2 text-4xl font-bold text-ion-white">{title}</h1>
          <div className="mt-8 space-y-8">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
export function Cards({ items }: { items: Array<{label:string; value:string|number; note?:string}> }) { return <div className="grid gap-4 md:grid-cols-4">{items.map(i=><div key={i.label} className="border border-mineral bg-eclipse p-4"><p className="text-xs uppercase tracking-wide text-ion-2">{i.label}</p><p className="mt-2 text-3xl font-semibold text-ion-white">{i.value}</p>{i.note?<p className="mt-2 text-sm text-ion-1">{i.note}</p>:null}</div>)}</div>; }
export function Badge({ children, tone="neutral" }: { children: React.ReactNode; tone?: "good"|"warn"|"bad"|"neutral" }) { const c={good:"border-orbital-cyan text-orbital-cyan",warn:"border-caution text-caution",bad:"border-alert text-alert",neutral:"border-mineral text-ion-1"}[tone]; return <span className={`inline-flex rounded border px-2 py-1 text-xs ${c}`}>{children}</span>; }
export function PlayerTable({ players }: { players: StatKingPlayer[] }) { return <div className="overflow-x-auto border border-mineral"><table className="w-full text-left text-sm"><thead className="bg-eclipse text-xs uppercase text-ion-2"><tr><th scope="col" className="p-3">Player</th><th scope="col">Team</th><th scope="col">Pos</th><th scope="col">GPI</th><th scope="col">Usage</th><th scope="col">Eff</th><th scope="col">Fantasy</th><th scope="col">Vol</th><th scope="col">Confidence</th></tr></thead><tbody>{players.map(p=><tr key={p.player_id} className="border-t border-mineral"><td className="p-3 text-ion-white"><Link href={`/stats/player/${p.player_id}`}>{p.name}</Link></td><td>{p.team}</td><td>{p.position}</td><td>{p.galaxy_player_index}</td><td>{p.usage_score}</td><td>{p.efficiency_score}</td><td>{p.fantasy_edge}</td><td>{p.volatility_score}</td><td>{p.data_confidence}%</td></tr>)}</tbody></table></div>; }
export function SimpleTable({ rows }: { rows: Array<Record<string, unknown>> }) { const keys=Object.keys(rows[0]??{}).slice(0,8); return <div className="overflow-x-auto border border-mineral"><table className="w-full text-left text-sm"><thead className="bg-eclipse text-xs uppercase text-ion-2"><tr>{keys.map(k=><th key={k} scope="col" className="p-3">{k}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-mineral">{keys.map(k=>{const v=r[k];return <td key={k} className="p-3">{Array.isArray(v)?v.join(", "):String(v)}</td>;})}</tr>)}</tbody></table></div>; }

export function HeroStat({ label, value, delta, sublabel, tone = "cyan" }: { label: string; value: string | number; delta?: string; sublabel?: string; tone?: "cyan" | "amber" | "alert"; }) {
  const vc = { cyan: "text-orbital-cyan", amber: "text-caution", alert: "text-alert" }[tone];
  const dc = { cyan: "text-orbital-cyan/70", amber: "text-caution/70", alert: "text-alert/70" }[tone];
  return <div className="border border-mineral bg-eclipse p-6 flex flex-col gap-1"><p className="text-xs uppercase tracking-[0.2em] text-ion-2">{label}</p><p className={`text-5xl font-bold tabular-nums ${vc}`}>{value}</p>{delta && <p className={`text-sm font-medium ${dc}`}>{delta}</p>}{sublabel && <p className="mt-1 text-sm text-ion-1">{sublabel}</p>}</div>;
}

export function BarChart({ items }: { items: Array<{ label: string; value: number; max: number; tone?: "cyan" | "amber" | "alert" }> }) {
  return <div className="space-y-3">{items.map((item) => {
    const pct = item.max > 0 ? Math.min(100, Math.max(0, (item.value / item.max) * 100)) : 0;
    const fill = { cyan: "bg-orbital-cyan", amber: "bg-caution", alert: "bg-alert" }[item.tone ?? "cyan"];
    return <div key={item.label} className="flex items-center gap-3"><span className="w-36 shrink-0 truncate text-xs text-ion-1">{item.label}</span><div className="flex-1 h-1.5 rounded-full overflow-hidden bg-eclipse border border-mineral"><div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} /></div><span className="w-12 text-right text-xs font-mono text-ion-white tabular-nums">{item.value}</span></div>;
  })}</div>;
}

// `notMeasured` renders an explicit no-value treatment instead of a colored
// percentage ring: a neutral dashed outline, an em dash instead of a number,
// and no tone (a ring color at 0-100% would otherwise imply a real reading).
// Existing callers that only pass `score` are unaffected — this is additive.
export function ScoreRing({ score, label, size = 120, notMeasured = false }: { score: number; label?: string; size?: number; notMeasured?: boolean }) {
  const inner = Math.round(size * 0.74);
  if (notMeasured) {
    return <div className="flex flex-col items-center gap-2"><div className="relative flex items-center justify-center rounded-full border-2 border-dashed border-mineral" style={{ width: size, height: size }}><div className="absolute flex items-center justify-center rounded-full bg-carbon" style={{ width: inner, height: inner }}><span className="text-2xl font-bold text-ion-2" aria-hidden="true">—</span></div></div>{label && <p className="text-xs uppercase tracking-[0.2em] text-ion-2 text-center">{label} <span className="text-ion-3">(not yet measured)</span></p>}</div>;
  }
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "#00E5FF" : pct >= 40 ? "#FFB454" : "#FF6470";
  return <div className="flex flex-col items-center gap-2"><div className="relative flex items-center justify-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${color} ${pct}%, #3B3158 ${pct}%)` }}><div className="absolute flex items-center justify-center rounded-full bg-carbon" style={{ width: inner, height: inner }}><span className="text-2xl font-bold tabular-nums text-ion-white">{score}</span></div></div>{label && <p className="text-xs uppercase tracking-[0.2em] text-ion-2 text-center">{label}</p>}</div>;
}

export function InsightCard({ eyebrow, headline, body, tone = "neutral", children }: { eyebrow?: string; headline: string; body: string; tone?: "good" | "warn" | "bad" | "neutral"; children?: React.ReactNode; }) {
  const bdr = { good: "border-orbital-cyan", warn: "border-caution", bad: "border-alert", neutral: "border-mineral" }[tone];
  const ec = { good: "text-orbital-cyan", warn: "text-caution", bad: "text-alert", neutral: "text-ion-2" }[tone];
  return <div className={`border ${bdr} bg-eclipse p-5 space-y-2`}>{eyebrow && <p className={`text-xs uppercase tracking-[0.2em] ${ec}`}>{eyebrow}</p>}<p className="text-base font-semibold text-ion-white">{headline}</p><p className="text-sm text-ion-1 leading-relaxed">{body}</p>{children && <div className="mt-1">{children}</div>}</div>;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: { label: string; href: string } }) {
  return <div className="flex items-end justify-between border-b border-mineral pb-3"><div>{eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-1">{eyebrow}</p>}<h2 className="text-2xl font-semibold text-ion-white">{title}</h2></div>{action && <a href={action.href} className="text-sm text-orbital-cyan hover:text-ion-white transition-colors">{action.label} →</a>}</div>;
}

export function DataTable({ rows, maxRows = 200 }: { rows: Array<Record<string, unknown>>; maxRows?: number }) {
  const keys = Object.keys(rows[0] ?? {}).slice(0, 8);
  const isNum = (v: unknown) => typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)));
  const display = (v: unknown): string => {
    const s = Array.isArray(v) ? (v as unknown[]).join(", ") : String(v ?? "—");
    return s.length > 40 ? s.slice(0, 38) + "…" : s;
  };
  if (!rows.length) return <p className="text-sm text-ion-1 py-4">No data.</p>;
  return <div className="border border-mineral overflow-x-auto" style={{ maxHeight: "60vh", overflowY: "auto" }}><table className="w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-eclipse"><tr>{keys.map((k, i) => <th key={k} scope="col" className={`p-3 text-xs uppercase tracking-wide text-ion-2 font-medium whitespace-nowrap${i > 0 ? " border-l border-mineral" : ""}`}>{k.replace(/_/g, " ")}</th>)}</tr></thead><tbody>{rows.slice(0, maxRows).map((r, ri) => <tr key={ri} className="border-t border-mineral hover:bg-eclipse/60 transition-colors">{keys.map((k, ki) => { const v = r[k]; const num = ki > 0 && isNum(v); return <td key={k} className={`p-3${ki === 0 ? " font-semibold text-ion-white" : num ? " text-right font-mono text-ion-1 tabular-nums" : " text-ion-1"}${ki > 0 ? " border-l border-mineral" : ""}`} title={Array.isArray(v) ? (v as unknown[]).join(", ") : String(v ?? "")}>{display(v)}</td>; })}</tr>)}</tbody></table></div>;
}

export function StatusRibbon({ status, label }: { status: "active" | "fixture" | "blocked"; label: string }) {
  const cfg = { active: { dot: "bg-verify", bar: "border-verify/30 bg-verify/5", text: "text-verify" }, fixture: { dot: "bg-caution", bar: "border-caution/30 bg-caution/5", text: "text-caution" }, blocked: { dot: "bg-alert", bar: "border-alert/30 bg-alert/5", text: "text-alert" } }[status];
  return <div className={`flex items-center gap-2 border rounded px-3 py-2 text-xs ${cfg.bar}`}><span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot} animate-live-pulse`} /><span className={cfg.text}>{label}</span></div>;
}
