import type { Metadata } from "next";
import Link from "next/link";
import { BraidVisualizationMesh } from "@/components/cockpit/braid-visualization-mesh";

export const metadata: Metadata = {
  title: "GSI Telemetry Flight Deck · Cockpit",
  robots: { index: false, follow: false },
};

export default function GsiTelemetryPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-titanium/80 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ion-white">
              GSI Frontier Telemetry Command Center
            </h1>
            <span className="rounded-md border border-orbital-cyan/40 bg-orbital-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ion-1">
              GSI Sovereign v4.0
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-ion-2">
            Real-time Thermodynamic Ergodic Braiding (TEB), $(d+1)$ spacetime worldline tracking, and
            asynchronous organ-subsystem time-slippage monitoring. Evaluated across 138 real ICU stays
            from the Beth Israel Deaconess Medical Center MIMIC-IV cohort.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-ion-3">
            <span>Galaxy Science Institute</span>
            <span>·</span>
            <span>Texas SOS #15043440630001</span>
            <span>·</span>
            <span>IRS EIN 43-2804773</span>
            <span>·</span>
            <span className="text-verify">Production Engine Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cockpit/integrity"
            className="rounded-lg border border-titanium bg-carbon/60 px-3 py-1.5 font-mono text-xs text-ion-2 transition-colors hover:bg-titanium/50 hover:text-ion-white"
          >
            Integrity Ledger →
          </Link>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium bg-carbon/60 px-3 py-1.5 font-mono text-xs text-ion-2 transition-colors hover:bg-titanium/50 hover:text-ion-white"
          >
            Cockpit Home
          </Link>
        </div>
      </div>

      {/* 2. Interactive Braid Visualization Mesh (Client Component) */}
      <section>
        <BraidVisualizationMesh />
      </section>

      {/* 3. Verified Empirical Scoreboard */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-ion-3">
            MIMIC-IV v3.0 / v4.0 Empirical Scoreboard (N = 138 Evaluated Real Stays)
          </h2>
          <span className="font-mono text-[10px] text-ion-3">
            Benchmark: GSI-WP-05 v3.0 · Zero-Leakage Split Calibrated
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">Full-Stay AUC</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">0.8545</p>
            <p className="mt-1 text-[10px] text-verify font-mono">+8.24 pp vs baseline</p>
          </div>

          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">24h Early AUC</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">0.8387</p>
            <p className="mt-1 text-[10px] text-verify font-mono">+12.53 pp vs baseline</p>
          </div>

          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">12h Early AUC</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">0.8118</p>
            <p className="mt-1 text-[10px] text-verify font-mono">+13.72 pp vs baseline</p>
          </div>

          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">Time-Warp Drift</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">0.212%</p>
            <p className="mt-1 text-[10px] text-ion-3 font-mono">at γ = 3.0 (vs 37.68%)</p>
          </div>

          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">Dropout Drift</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">1.20%</p>
            <p className="mt-1 text-[10px] text-ion-3 font-mono">at 60% loss (vs 24.28%)</p>
          </div>

          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">Early Lead Time</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">7.08h</p>
            <p className="mt-1 text-[10px] text-ion-3 font-mono">before MAP &lt; 65 mmHg</p>
          </div>

          <div className="rounded-xl border border-titanium bg-carbon/40 p-3">
            <span className="font-mono text-[10px] text-ion-3 uppercase">Conformal Horizon</span>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ion-white">100.0%</p>
            <p className="mt-1 text-[10px] text-verify font-mono">Decisive horizon acc</p>
          </div>
        </div>
      </section>

      {/* 4. Three-Pillar Falsifiable Verification Breakdown */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pillar 1 */}
        <div className="rounded-2xl border border-titanium bg-carbon/30 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-titanium px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ion-1">
              Pillar 1
            </span>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ion-white">
              Asynchronous Time-Slippage
            </h3>
          </div>
          <p className="mt-2 text-xs text-ion-2">
            Falsifiable test of organ-clock divergence ($\phi_i \neq \phi_j$) on real MIMIC-IV stays:
          </p>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Clock Dispersion (Δφ)</span>
              <span className="font-mono text-ion-1">5.4756 vs 2.8308 (d=0.4425)</span>
            </div>
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">DTW Slippage (τ_DTW)</span>
              <span className="font-mono text-ion-1">0.9083 vs 0.2898 (d=0.5093)</span>
            </div>
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Seifert Entropy (S_irr)</span>
              <span className="font-mono text-ion-1">2.8933 vs 1.4972 (d=1.2375)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ion-3">Chen Lévy Area (A_ij)</span>
              <span className="font-mono text-ion-1">2.2688 vs 0.4042 (d=0.4368)</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-verify font-mono">
            All 4 metrics clear H_1 (p &lt; 0.01, d &gt; 0.40)
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="rounded-2xl border border-titanium bg-carbon/30 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-titanium px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ion-1">
              Pillar 2
            </span>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ion-white">
              Mathematical Invariance
            </h3>
          </div>
          <p className="mt-2 text-xs text-ion-2">
            Stress-testing topological invariance under nonlinear warping &amp; telemetry loss:
          </p>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Warping γ = 1.5</span>
              <span className="font-mono text-ion-1">Braid 0.029% vs Flat 7.44%</span>
            </div>
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Warping γ = 3.0</span>
              <span className="font-mono text-ion-1">Braid 0.212% vs Flat 37.68%</span>
            </div>
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Packet Loss 20%</span>
              <span className="font-mono text-ion-1">Braid 0.11% vs Flat 10.03%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ion-3">Packet Loss 60%</span>
              <span className="font-mono text-ion-1">Braid 1.20% vs Flat 24.28%</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ion-3 font-mono">
            Noise boundary at σ=0.50 confirms honest physical limits
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="rounded-2xl border border-titanium bg-carbon/30 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-titanium px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ion-1">
              Pillar 3
            </span>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ion-white">
              Ergodicity Breaking &amp; Lead Time
            </h3>
          </div>
          <p className="mt-2 text-xs text-ion-2">
            Early bifurcation warning prior to scalar arterial collapse:
          </p>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Van der Pol Lead</span>
              <span className="font-mono text-ion-1">58.32 steps (median 56.5)</span>
            </div>
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">MIMIC-IV Shock Lead</span>
              <span className="font-mono text-ion-1">7.08 hours mean early warning</span>
            </div>
            <div className="flex items-center justify-between border-b border-titanium/50 pb-1.5">
              <span className="text-ion-3">Positive Lead Share</span>
              <span className="font-mono text-ion-1">39.5% of positive shock stays</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ion-3">Ergodicity Index</span>
              <span className="font-mono text-ion-1">EB = 0.6890 (Thirumalai-Mountain)</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-verify font-mono">
            Hopf bifurcation &amp; FTBE exponent active
          </p>
        </div>
      </section>

      {/* 5. Footer Architecture Notes */}
      <div className="rounded-xl border border-titanium/60 bg-obsidian p-4 text-[11px] text-ion-3">
        <p className="font-mono font-semibold text-ion-2">
          GSI Sovereign Architecture &amp; Calibration Notes:
        </p>
        <p className="mt-1 leading-relaxed">
          The GSE-GSI Conformal-OT Engine v3.0 unites localized Cholesky whitening, Split Conformal
          Quantile Regression (SplitCQR), one-sided pathological strain cones, De Domenico–Biamonte
          quantum density operators (&rho;<sub>&beta;</sub>), and Chen&apos;s second-level stochastic iterated
          integrals (A_ij). No scalar assumption is made regarding organ synchronization.
        </p>
      </div>
    </div>
  );
}
