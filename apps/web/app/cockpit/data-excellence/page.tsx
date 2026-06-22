/**
 * Cockpit — Data Excellence browser. Renders the data-quality / source-integrity
 * / calibration scorers over illustrative inputs. Pure/static, admin-gated.
 */

import {
  scoreDataQuality,
  scoreSourceIntegrity,
  scoreCalibrationHealth,
  type DataSourceRecord,
} from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Data Excellence · Cockpit" };

const FRESH = scoreDataQuality({
  completeness: 1, ageMins: 2, freshnessExpectationMins: 60, consistency: 1,
  sourceReliability: 90, confirmations: 2, contradictions: 0, lineageDepth: 4, rightsSafe: true,
});
const STALE = scoreDataQuality({
  completeness: 0.4, ageMins: 600, freshnessExpectationMins: 60, consistency: 0.5,
  sourceReliability: 40, confirmations: 0, contradictions: 2, lineageDepth: 0, rightsSafe: true,
});
const UNSAFE = scoreDataQuality({
  completeness: 1, ageMins: 2, freshnessExpectationMins: 60, consistency: 1,
  sourceReliability: 90, confirmations: 2, contradictions: 0, lineageDepth: 4, rightsSafe: false,
});

const APPROVED_SRC: DataSourceRecord = {
  sourceId: "odds-api", name: "Licensed odds API", domain: "odds", sourceType: "sports_data_api",
  rightsStatus: "approved_api", allowedUsage: ["commercial display"], prohibitedUsage: [],
  freshnessExpectationMins: 5, updateFrequencyMins: 1, reliabilityScore: 88,
  historicalAccuracy: 86, cost: "licensed", dependencyRisk: 40, fallbackSourceId: "odds-api-2",
  publicDisplayAllowed: true,
};
const FRAGILE_SRC: DataSourceRecord = {
  ...APPROVED_SRC, sourceId: "single-feed", name: "Single permission-required feed",
  rightsStatus: "permission_required", historicalAccuracy: null, dependencyRisk: 85, fallbackSourceId: null,
};

const CAL_SMALL = scoreCalibrationHealth({ settledSampleSize: 20, calibrationError: 0.05, drift: 0.02, coveredBins: 5 });
const CAL_OK = scoreCalibrationHealth({ settledSampleSize: 320, calibrationError: 0.04, drift: 0.03, coveredBins: 6 });

export default function DataExcellencePage(): JSX.Element {
  return (
    <SystemShell
      kicker="Data Excellence"
      title="Impeccable data — source-aware, never overstated"
      intro="Impeccable does not mean perfect. It means every item is source-aware, timestamped, rights-aware, confidence-scored, freshness-scored, contradiction-aware, and auditable. Fitness is not correctness — a perfect-fitness item can still be wrong, which is why the Evidence Engine layers contradiction and falsifiers on top."
    >
      <Section title="Data Quality Score" blurb="Fitness of one item to drive a decision (higher is better).">
        <Table
          columns={["Example", "Score", "Why"]}
          rows={[
            [<strong key="a" className="text-ion-1">Fresh · complete · confirmed</strong>, <ScoreBadge key="s" score={FRESH} />, FRESH.rationale.join(" · ")],
            [<strong key="b" className="text-ion-1">Stale · incomplete · contradicted</strong>, <ScoreBadge key="s" score={STALE} />, STALE.flags.join(" · ")],
            [<strong key="c" className="text-ion-1">Otherwise perfect, rights unsafe</strong>, <ScoreBadge key="s" score={UNSAFE} />, "Rights doubt caps fitness ≤ 49 — never 'fit' if we cannot use it"],
          ]}
        />
      </Section>

      <Section title="Source Integrity Score" blurb="How much a source deserves trust over time (higher is better).">
        <Table
          columns={["Source", "Rights", "Integrity", "Flags"]}
          rows={[
            [APPROVED_SRC.name, <Pill key="p" tone="good">{APPROVED_SRC.rightsStatus}</Pill>, <ScoreBadge key="s" score={scoreSourceIntegrity(APPROVED_SRC)} />, scoreSourceIntegrity(APPROVED_SRC).flags.join("; ") || "—"],
            [FRAGILE_SRC.name, <Pill key="p" tone="bad">{FRAGILE_SRC.rightsStatus}</Pill>, <ScoreBadge key="s" score={scoreSourceIntegrity(FRAGILE_SRC)} />, scoreSourceIntegrity(FRAGILE_SRC).flags.join("; ")],
          ]}
        />
      </Section>

      <Section title="Calibration Health Score" blurb="Does stated confidence match outcomes? Small samples are capped — never published before they are honest.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-ion-2">
            <span>n=20 sample:</span> <ScoreBadge score={CAL_SMALL} /> <span className="text-ion-3">{CAL_SMALL.flags.join(" · ")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ion-2">
            <span>n=320 sample:</span> <ScoreBadge score={CAL_OK} />
          </div>
        </div>
      </Section>
    </SystemShell>
  );
}
