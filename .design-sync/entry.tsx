import "./shims/process-env";
// design-sync entry: the curated, presentational surface of apps/web that Claude Design builds with.
// Server-only components (auth, Prisma, gates) are deliberately excluded. Next.js imports resolve to
// .design-sync/shims via .design-sync/tsconfig.json.

// ui
export { KpiCard } from "@/components/ui/kpi-card";
export type { KpiCardProps, KpiVariant } from "@/components/ui/kpi-card";
export { PageHero } from "@/components/ui/page-hero";
export type { PageHeroProps, HeroVariant } from "@/components/ui/page-hero";
export { Tabs, FilterBar } from "@/components/ui/tabs";
export type { TabsProps, TabItem, FilterBarProps } from "@/components/ui/tabs";
export { DataTable, ToneCell } from "@/components/ui/data-table";
export type { DataTableProps, Column, FilterOption, SortState } from "@/components/ui/data-table";
export { MetricExplainer } from "@/components/ui/metric-explainer";
export type { MetricExplainerProps } from "@/components/ui/metric-explainer";
export { MetricHonesty } from "@/components/ui/metric-honesty";
export type { MetricHonestyProps } from "@/components/ui/metric-honesty";
export { Term } from "@/components/ui/term";
export { Ticker } from "@/components/ui/ticker";
export { CountUp } from "@/components/ui/count-up";
export { RiskDisclosure } from "@/components/ui/risk-disclosure";
export type { RiskDisclosureProps } from "@/components/ui/risk-disclosure";
export { SourceError } from "@/components/ui/source-error";
export type { SourceErrorProps } from "@/components/ui/source-error";
export { MethodologySection } from "@/components/ui/methodology-section";
export { ToolPageSkeleton } from "@/components/ui/tool-page-skeleton";
export { NavMenu } from "@/components/ui/nav-menu";
export { MobileNav } from "@/components/ui/mobile-nav";
export { Footer } from "@/components/ui/footer";

// picks
export { PickCard } from "@/components/picks/pick-card";
export { LineFreshnessBadge } from "@/components/picks/line-freshness-badge";
export { ValueGapBadge } from "@/components/picks/value-gap";
export { DevigMethodDisclosure } from "@/components/picks/devig-method-disclosure";
export { VerifyPickButton } from "@/components/picks/verify-pick-button";
export { EvidenceAuditDrawer } from "@/components/picks/evidence-audit-drawer";

// cards
export { ResultCard } from "@/components/cards/result-card";
export type { ResultCardProps, CardResult } from "@/components/cards/result-card";
export { PlayerCard } from "@/components/cards/player-card";
export type { PlayerCardProps, PlayerCardStat } from "@/components/cards/player-card";

// cockpit
export { StatusTile } from "@/components/cockpit/status-tile";
export type { StatusTileProps } from "@/components/cockpit/status-tile";
export { ChecklistRow } from "@/components/cockpit/checklist-row";
export type { ChecklistRowProps } from "@/components/cockpit/checklist-row";
export { JarvisDiffBadge } from "@/components/cockpit/jarvis-diff-badge";
export type { JarvisDiffBadgeProps } from "@/components/cockpit/jarvis-diff-badge";
export { JarvisTrend } from "@/components/cockpit/jarvis-trend";
export type { JarvisTrendProps } from "@/components/cockpit/jarvis-trend";

// motion
export { HealthRing } from "@/components/motion/health-ring";
export { Reveal, Stagger } from "@/components/motion/reveal";
export type { RevealProps } from "@/components/motion/reveal";
export { Marquee } from "@/components/motion/marquee";
export type { MarqueeProps } from "@/components/motion/marquee";
export { SignalRule } from "@/components/motion/signal-rule";
export { HoloTilt } from "@/components/motion/holo-tilt";

// tools
export { HonestyNote } from "@/components/tools/honesty-note";
export type { HonestyNoteProps } from "@/components/tools/honesty-note";
export { FormulaPlaque } from "@/components/tools/formula-plaque";
export type { FormulaPlaqueProps } from "@/components/tools/formula-plaque";
export { OddsFormatToggle } from "@/components/tools/odds-format-toggle";
export type { OddsFormatToggleProps } from "@/components/tools/odds-format-toggle";

// board
export { BoardHealthBadge } from "@/components/board/board-health-badge";
export { BoardSurfaceChip } from "@/components/board/board-surface-chip";

// brand
export { LogoMarkInline } from "@/components/brand/logo-mark-inline";
export { BrandLockup } from "@/components/brand/brand-lockup";
export { GsnLockup } from "@/components/brand/gsn-lockup";

// pricing
export { PricingPlans } from "@/components/pricing/pricing-plans";
export type { PlanView } from "@/components/pricing/pricing-plans";
export { TierGatePanel } from "@/components/pricing/tier-gate-panel";

// home / landing / world
export { CalibrationCurve } from "@/components/home/calibration-curve";
export { ToutComparison } from "@/components/home/tout-comparison";
export { StartInSixty } from "@/components/home/start-in-sixty";
export { DoorCard } from "@/components/landing/door-card";
export { WorldSection } from "@/components/world/world-section";

// calibration / performance
export { ReliabilityChart } from "@/components/calibration/reliability-chart";
export { HonestBand } from "@/components/performance/honest-band";
export type { HonestBandProps } from "@/components/performance/honest-band";
