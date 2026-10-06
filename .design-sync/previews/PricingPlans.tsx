// Authored design-sync preview for PricingPlans.
// FIXTURE: the plan data below mirrors the live Founding-phase ladder
// (apps/web/lib/pricing/pricing-phases.ts) so copy matches the product;
// it is still a layout fixture for the design tool, not a live pricing feed.
import type { CSSProperties } from "react";
import { PricingPlans } from "sports-prediction-platform";

interface Feature {
  readonly label: string;
  readonly included: boolean;
}

interface PlanView {
  readonly id: "FREE" | "FANTASY" | "PRO" | "ELITE";
  readonly name: string;
  readonly monthly: number | null;
  readonly annual: number | null;
  readonly annualSavingsPct: number | null;
  readonly annualMonthly: number | null;
  readonly description: string;
  readonly badge: string | null;
  readonly cta: string;
  readonly features: ReadonlyArray<Feature>;
}

const freePlan: PlanView = {
  id: "FREE",
  name: "Free",
  monthly: null,
  annual: null,
  annualSavingsPct: null,
  annualMonthly: null,
  description: "A daily teaser, no card required.",
  badge: null,
  cta: "Start free",
  features: [
    { label: "2 picks a day", included: true },
    { label: "Public Edge Index", included: true },
    { label: "Confidence scores", included: false },
    { label: "Full factor trail", included: false },
  ],
};

const fantasyPlan: PlanView = {
  id: "FANTASY",
  name: "Fantasy",
  monthly: 4.99,
  annual: 49,
  annualSavingsPct: 18,
  annualMonthly: 4.08,
  description: "Unlocks the fantasy suite only — the betting board stays on the free teaser.",
  badge: null,
  cta: "Unlock Fantasy",
  features: [
    { label: "Full fantasy suite", included: true },
    { label: "Lineup and waiver tools", included: true },
    { label: "Full picks board", included: false },
    { label: "Confidence scores", included: false },
  ],
};

const proPlan: PlanView = {
  id: "PRO",
  name: "Pro",
  monthly: 14.99,
  annual: 99,
  annualSavingsPct: 45,
  annualMonthly: 8.25,
  description: "The full board with the reasoning behind every signal.",
  badge: "Most popular",
  cta: "Go Pro",
  features: [
    { label: "Full board, all picks", included: true },
    { label: "Confidence scores", included: true },
    { label: "Full factor trail", included: true },
    { label: "Line movement + Trend Lab", included: true },
    { label: "Real-time alerts", included: false },
  ],
};

const elitePlan: PlanView = {
  id: "ELITE",
  name: "Elite",
  monthly: 24.99,
  annual: 179,
  annualSavingsPct: 40,
  annualMonthly: 14.92,
  description: "Everything in Pro, plus alerts the moment a line moves.",
  badge: "Founding rate",
  cta: "Go Elite",
  features: [
    { label: "Everything in Pro", included: true },
    { label: "Real-time email & push alerts", included: true },
    { label: "CLV / line-value ledger", included: true },
    { label: "7 sports covered", included: true },
  ],
};

const grandfatherNote =
  "Founding-member rate, locked for the life of your subscription. You back us before the record exists; we never raise your price.";

const frame: CSSProperties = { width: 900, height: 700, overflow: "hidden", background: "var(--carbon)" };

// The product grid is Tailwind's "md:grid-cols-2 lg:grid-cols-4", which
// depends on the actual browser viewport width, not a wrapper's maxWidth.
// The design tool's capture viewport (900px) sits at "md" but under "lg", so
// two plans per story keeps every card's full body (features, date-of-birth
// field, CTA, billing disclosure) inside one row. The two-card row plus the
// billing toggle and the grandfather-note footer run slightly past 700px
// tall at 1:1, so the content is scaled down a touch to keep the footer note
// fully in frame instead of clipping it.
const scaled: CSSProperties = { width: 1000, padding: 24, transform: "scale(0.88)", transformOrigin: "top left" };

export const PaidTiers = () => (
  <div style={frame}>
    <div style={scaled}>
      <PricingPlans plans={[proPlan, elitePlan]} grandfatherNote={grandfatherNote} />
    </div>
  </div>
);

export const FreeAndFantasy = () => (
  <div style={frame}>
    <div style={scaled}>
      <PricingPlans plans={[freePlan, fantasyPlan]} grandfatherNote={grandfatherNote} />
    </div>
  </div>
);
