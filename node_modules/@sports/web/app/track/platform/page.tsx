import type { Metadata } from "next";
import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { BRAND_COLORS } from "@/lib/brand";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";
import { loadUserClvLedger, type ClvLedgerRow } from "@/lib/clv/user-clv-ledger";
import { formatDateTime } from "@/lib/utils";
import { STAT_PLACEHOLDER, NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

export const metadata: Metadata = {
  title: "Platform CLV Ledger: Our Own Graded Picks",
  description:
    "Every published pick's realized closing-line value, as graded by the platform at settlement. A view of Galaxy Sports Edge's own record — Elite tier.",
  alternates: { canonical: "/track/platform" },
};

/** clvValue → a signed, unit-correct string. Null renders as "not yet graded". */
function formatClv(row: ClvLedgerRow): string {
  if (row.clvValue === null) return "not yet graded";
  const sign = row.clvValue >= 0 ? "+" : "";
  if (row.clvKind === "PROBABILITY") return `${sign}${(row.clvValue * 100).toFixed(1)}%`;
  return `${sign}${row.clvValue.toFixed(1)} pts`;
}

function verdictLabel(verdict: string | null): string {
  if (verdict === null) return "—";
  return verdict.replace(/_/g, " ").toLowerCase();
}

export default async function TrackPlatformPage() {
  const viewer = await getViewerEntitlements();

  if (!viewer.canUseClvLedger) {
    return (
      <div className="flex min-h-screen flex-col bg-obsidian">
        <Atmosphere />
        <Nav />
        <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-28 sm:px-6">
          <div className="text-center">
            <p className="eyebrow justify-center text-ultraviolet">Platform CLV Ledger</p>
            <h1
              className="mt-4 max-w-3xl font-display text-balance text-ion-white"
              style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", lineHeight: 1 }}
            >
              Our own record, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>graded honestly</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ion-1">
              Every published pick&apos;s realized CLV, exactly as our own settlement grades it.
            </p>
          </div>
          <TierGatePanel
            need="ELITE"
            surface="The Platform CLV Ledger"
            blurb="A view of every published pick's realized closing-line value, graded by the platform at settlement — not a personal log. Reserved for Elite members."
          />
        </main>
        <Footer />
      </div>
    );
  }

  const ledger = await loadUserClvLedger(db, viewer.canUseClvLedger);
  const rows = ledger.locked ? [] : ledger.rows;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
            style={{ background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}16, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-ultraviolet">
                <span className="live-dot" /> Platform CLV Ledger
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-ion-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
              >
                Our own record, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>graded honestly</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                This is a view of the platform&apos;s OWN published picks, exactly as our settlement pipeline grades
                them against the closing line — not a personal bet log. Your Elite full-board access already covers
                every pick shown here; this is that same record with the CLV numbers made visible.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {rows.length === 0 ? (
              <div
                data-testid="clv-ledger-empty"
                className="rounded-2xl border border-titanium bg-eclipse/40 px-6 py-12 text-center text-ion-1"
              >
                No settled published picks yet.
              </div>
            ) : (
              <div
                data-testid="clv-ledger-table"
                className="overflow-x-auto rounded-2xl border border-titanium bg-eclipse/40"
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-titanium text-[11px] uppercase tracking-widest text-ion-2">
                      <th className="px-4 py-3">Sport</th>
                      <th className="px-4 py-3">Pick</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Settled</th>
                      <th className="px-4 py-3">CLV</th>
                      <th className="px-4 py-3">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-titanium/60">
                    {rows.map((row) => (
                      <tr key={row.id} data-testid="clv-ledger-row">
                        <td className="px-4 py-3 text-ion-1">{row.sport}</td>
                        <td className="px-4 py-3 text-ion-white">
                          {row.selection} ({row.pickType})
                        </td>
                        <td className="px-4 py-3 text-ion-1">{row.result}</td>
                        <td className={`px-4 py-3 text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
                          {row.settledAt ? formatDateTime(row.settledAt) : STAT_PLACEHOLDER}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${row.clvValue === null ? "text-ion-2" : "text-ion-white"} ${NUMERIC_TEXT_CLASS}`}
                        >
                          {formatClv(row)}
                        </td>
                        <td className="px-4 py-3 text-ion-2">{verdictLabel(row.clvVerdict)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ion-2">
                Every value above already exists on the pick as published — nothing here is recomputed. See your{" "}
                <a href="/track" className="font-semibold text-ultraviolet hover:text-ion-white">
                  personal bet ledger
                </a>{" "}
                or the public{" "}
                <a href="/clv" className="font-semibold text-ultraviolet hover:text-ion-white">
                  CLV report
                </a>
                .
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
