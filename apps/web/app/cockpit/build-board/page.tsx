/**
 * Cockpit — Build Board. The actionable "what to build / adopt next" surface:
 * ranked feature gaps + free resources we can adopt now + modeling gaps. Pure/
 * static, admin-gated; re-ranks itself from the contracts.
 */

import { prioritizeGaps, adoptableNow, methodsByMaturity } from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Build Board · Cockpit" };

const TOP_GAPS = prioritizeGaps().slice(0, 8);
const ADOPT = adoptableNow();
const GAP_METHODS = methodsByMaturity("gap");

export default function BuildBoardPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Build Board"
      title="Highest-value, easiest-to-take next moves"
      intro="Computed from the scored research contracts, not vibes. The single highest-leverage move: close the devig → bet-log → CLV → calibration loop and make the calibration receipt the product's face — the white space nobody else owns."
    >
      <Section title="Top feature gaps to build" blurb="Ranked build opportunity. Trust-eroding mechanics are hard-gated to the bottom.">
        <Table
          columns={["Feature", "Opportunity", "Status", "Build sketch"]}
          rows={TOP_GAPS.map(({ gap, opportunity }) => [
            <span key="f" className="font-medium text-ion-1">{gap.feature}</span>,
            <ScoreBadge key="o" score={opportunity} />,
            <Pill key="s" tone={gap.gseStatus === "gap" ? "warn" : "info"}>{gap.gseStatus}</Pill>,
            <span key="b" className="text-ion-3">{gap.buildSketch}</span>,
          ])}
        />
      </Section>

      <Section title="Free leverage to adopt now" blurb="Commercial-OK, not yet integrated, ranked by adoption value. Non-commercial / unverified resources (StatsBomb, Understat, ESPN endpoints) are gated out automatically.">
        <Table
          columns={["Resource", "Adoption", "License", "What it gives"]}
          rows={ADOPT.map(({ resource, adoption }) => [
            <span key="n" className="font-medium text-ion-1">{resource.name}</span>,
            <ScoreBadge key="a" score={adoption} />,
            <Pill key="l" tone={resource.licenseClass === "share_alike" ? "warn" : "good"}>{resource.licenseClass}</Pill>,
            <span key="w" className="text-ion-3">{resource.whatItGives}</span>,
          ])}
        />
      </Section>

      <Section title={`Modeling gaps (${GAP_METHODS.length})`} blurb="Methods the repo does not yet have. The four dependency-free primitives (log opinion pool, extremize, conformal half-width, isotonic calibration) already ship in analytics-methods.ts.">
        <Table
          columns={["Method", "Domain", "Improves", "Difficulty"]}
          rows={GAP_METHODS.map((m) => [
            <span key="n" className="font-medium text-ion-1">{m.name}</span>,
            <Pill key="d" tone="neutral">{m.domain.replace(/_/g, " ")}</Pill>,
            <span key="g" className="text-ion-3">{m.gseTranslation}</span>,
            <Pill key="x" tone={m.difficulty === "hard" ? "bad" : m.difficulty === "medium" ? "warn" : "good"}>{m.difficulty}</Pill>,
          ])}
        />
      </Section>
    </SystemShell>
  );
}
