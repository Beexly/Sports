import { BRAND_COLORS } from "@/lib/brand";

/**
 * Single source of truth for the Intelligence Stack capability taxonomy and
 * status-badge styling. Consumed by both /stack (StackPage) and the
 * CapabilityMatrix component so the two can never drift.
 *
 * GATED text uses a lighter ultraviolet (#9D86FF) so the label clears WCAG AA
 * on its own tint; the border/bg keep the base ultraviolet identity. SOON uses
 * a lightened neutral for the same reason.
 */

export type StatusKey = "LIVE" | "ACCRUING" | "GATED" | "SOON";

export const STATUS_STYLE: Record<StatusKey, { color: string; bg: string; border: string }> = {
  LIVE:     { color: BRAND_COLORS.orbitalCyan, bg: "rgba(0,229,255,0.10)",   border: "rgba(0,229,255,0.25)"  },
  ACCRUING: { color: "#FFB454",                bg: "rgba(255,180,84,0.10)",  border: "rgba(255,180,84,0.25)" },
  GATED:    { color: "#9D86FF",                bg: "rgba(122,92,255,0.10)",  border: "rgba(122,92,255,0.28)" },
  SOON:     { color: "#AEB6C2",                bg: "rgba(154,163,178,0.08)", border: "rgba(154,163,178,0.18)" },
};

export interface CapabilityItem {
  readonly name: string;
  readonly note: string;
  readonly status: StatusKey;
}

export interface CapabilityColumn {
  readonly label: string;
  readonly color: string;
  readonly items: readonly CapabilityItem[];
}

export const CAPABILITY_COLUMNS: readonly CapabilityColumn[] = [
  {
    label: "Data Layer",
    color: BRAND_COLORS.orbitalCyan,
    items: [
      { name: "The Odds API",    note: "Live pricing",           status: "LIVE" },
      { name: "nflverse",        note: "Player & team data",     status: "LIVE" },
      { name: "Media Signal",    note: "Context intelligence",   status: "LIVE" },
      { name: "Market Movement", note: "Steam & sharp action",   status: "LIVE" },
    ],
  },
  {
    label: "Intelligence Engine",
    color: BRAND_COLORS.softUltraviolet,
    items: [
      { name: "Confidence Scoring", note: "0–100 calibrated",       status: "LIVE" },
      { name: "Factor Model",       note: "4-factor signal score",   status: "LIVE" },
      { name: "CLV Calibration",    note: "Closing-line alignment",  status: "ACCRUING" },
      { name: "Consensus Engine",   note: "Independent referees",    status: "LIVE" },
    ],
  },
  {
    label: "Decision Gates",
    color: "#FFB454",
    items: [
      { name: "Min Confidence ≥55", note: "Hard floor threshold",   status: "LIVE" },
      { name: "No-Bet Discipline",  note: "Silence is the default", status: "LIVE" },
      { name: "King Standard",      note: "Readiness scorecard",    status: "LIVE" },
      { name: "History Grading",    note: "Settled-pick scoring",   status: "ACCRUING" },
    ],
  },
  {
    label: "Output Layer",
    color: BRAND_COLORS.ionMagenta,
    items: [
      { name: "Published Picks",  note: "Tiered with factor trail", status: "LIVE" },
      { name: "Receipts Archive", note: "Tamper-evident ledger",    status: "LIVE" },
      { name: "Observatory",      note: "Live market monitoring",   status: "LIVE" },
      { name: "Accountability",   note: "Public settled record",    status: "LIVE" },
    ],
  },
];
