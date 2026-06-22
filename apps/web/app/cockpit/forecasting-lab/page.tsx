/**
 * Cockpit — Forecasting Lab. Demonstrates the calibration/scoring/selection
 * toolkit + the Dixon-Coles scoreline model on illustrative inputs. Pure/static,
 * admin-gated.
 */

import {
  crpsGaussian,
  brierDecomposition,
  plattScale,
  applyPlatt,
  kalmanFilterSeries,
  ucb1Select,
  dixonColesMatch,
} from "@/lib/gse";
import { SystemShell, Section, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Forecasting Lab · Cockpit" };

const match = dixonColesMatch(1.7, 1.0);
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

const calScores = [-2, -1, 0, 1, 2];
const calOuts: (0 | 1)[] = [0, 0, 0, 1, 1];
const platt = plattScale([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2], [0, 0, 0, 0, 1, 1, 1, 1]);

const form = kalmanFilterSeries([6, 14, 9, 22, 18, 25, 21, 28], { processVar: 1.5, obsVar: 6, init: { mean: 10, variance: 10 } });

const arms = [
  { name: "Model A", pulls: 120, totalReward: 78 },
  { name: "Model B", pulls: 120, totalReward: 61 },
  { name: "Model C (new)", pulls: 8, totalReward: 6 },
];
const pick = ucb1Select(arms);

const brier = brierDecomposition([0.1, 0.2, 0.8, 0.9, 0.6, 0.55, 0.3, 0.7], [0, 0, 1, 1, 1, 0, 0, 1], 10);

export default function ForecastingLabPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Forecasting Lab"
      title="Deepening the calibration moat"
      intro="The competitive field markets accuracy but does not expose calibration. These are the scoring, recalibration, and selection methods that make honest probability the product's edge — plus a Dixon-Coles soccer scoreline model. All numbers are illustrative computations."
    >
      <Section title="Dixon-Coles match model" blurb="1X2 / over-under 2.5 / BTTS / correct score from expected goals (home 1.7, away 1.0).">
        <div className="flex flex-wrap gap-2">
          <Pill tone="good">Home {pct(match.outcome.homeWin)}</Pill>
          <Pill tone="neutral">Draw {pct(match.outcome.draw)}</Pill>
          <Pill tone="warn">Away {pct(match.outcome.awayWin)}</Pill>
          <Pill tone="info">Over 2.5 {pct(match.totals2_5.over)}</Pill>
          <Pill tone="info">Under 2.5 {pct(match.totals2_5.under)}</Pill>
          <Pill tone="info">BTTS {pct(match.btts.yes)}</Pill>
        </div>
        <Table
          columns={["Most likely scoreline", "Probability"]}
          rows={match.topScores.map((s) => [<span key="s" className="font-mono text-ion-1">{s.home}–{s.away}</span>, pct(s.prob)])}
        />
      </Section>

      <Section title="Platt recalibration" blurb="Raw scores → calibrated probabilities (monotone logistic fit).">
        <Table
          columns={["Raw score", "Calibrated probability"]}
          rows={calScores.map((s, i) => [
            <span key="s" className="font-mono text-ion-1">{s.toFixed(1)} <span className="text-ion-3">(outcome {calOuts[i]})</span></span>,
            pct(applyPlatt(platt, s)),
          ])}
        />
      </Section>

      <Section title="Kalman 'form' tracking" blurb="Latent form reacts to results without overreacting to noise.">
        <p className="font-mono text-[11px] text-ion-2">
          obs:  6 · 14 · 9 · 22 · 18 · 25 · 21 · 28
          <br />
          form: {form.map((s) => s.mean.toFixed(1)).join(" · ")}
        </p>
      </Section>

      <Section title="Model selection (UCB1)" blurb="Deterministic bandit: explore new models, then exploit the best as evidence accrues.">
        <Table
          columns={["Model", "Pulls", "Mean reward", "Selected"]}
          rows={arms.map((a, i) => [
            <span key="n" className="font-medium text-ion-1">{a.name}</span>,
            String(a.pulls),
            (a.totalReward / a.pulls).toFixed(3),
            i === pick ? <Pill key="p" tone="good">← UCB1 pick</Pill> : <span key="p" className="text-ion-3">—</span>,
          ])}
        />
      </Section>

      <Section title="Brier decomposition" blurb="reliability − resolution + uncertainty = Brier. Low reliability = well-calibrated; high resolution = discriminating.">
        <div className="flex flex-wrap gap-2 text-xs text-ion-2">
          <Pill tone="neutral">Brier {brier.brier.toFixed(3)}</Pill>
          <Pill tone="good">Reliability {brier.reliability.toFixed(3)}</Pill>
          <Pill tone="info">Resolution {brier.resolution.toFixed(3)}</Pill>
          <Pill tone="neutral">Uncertainty {brier.uncertainty.toFixed(3)}</Pill>
          <span className="text-ion-3">CRPS(N(0,1)@0) = {crpsGaussian(0, 1, 0).toFixed(4)}</span>
        </div>
      </Section>
    </SystemShell>
  );
}
