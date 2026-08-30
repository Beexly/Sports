/**
 * Mission Control — the one-glance briefing across the whole platform.
 *
 * A feature-rich product needs a front door that answers "what matters right
 * now?" in one look. This composes a PRIORITIZED briefing from the live engines —
 * breaking news, the scheme move re-pricing an offense, your roster's risk, the
 * sharpest DFS and pick'em edges, and a CLV discipline nudge — each as an
 * actionable card that deep-links to the tool. Pure, deterministic, illustrative.
 */

import { rankWireCorroborated } from "../news/impact";
import { DEMO_WIRE } from "../news/wire";
import { SCHEME_SCENARIOS, applyScheme } from "../fantasy/scheme";
import { DFS_SLATE, leverage } from "../fantasy/dfs-slate";
import { PROPS, readProp } from "../fantasy/props";
import { buildLeagueTwin } from "../fantasy/league-twin";
import { TIER_WEIGHT } from "../news/impact";

export type BriefingKind = "breaking" | "scheme" | "roster" | "dfs" | "props" | "discipline";

export type BriefingCard = {
  readonly id: string;
  readonly kind: BriefingKind;
  readonly priority: number; // 0..100
  readonly eyebrow: string;
  readonly headline: string;
  readonly detail: string;
  readonly action: string;
  readonly href: string;
  readonly accent: string;
  /**
   * True when the card's headline/detail numbers come from an illustrative,
   * fictional engine (DEMO_WIRE, sample slates, illustrative props) rather than
   * a live licensed feed. Provenance travels with the card so the surface can
   * badge it "Sample" and fabricated demo data is never mistaken for a live,
   * sourced alert. The eyebrow of a sample card is also prefixed "Sample · ".
   * See lib/news/wire.ts (WIRE_DISCLAIMER). Non-negotiables #1/#4.
   * Optional at the type level (absent ⇒ treat as non-sample), but buildBriefing
   * always sets it explicitly on every card it composes.
   */
  readonly sample?: boolean;
};

/** Prefix applied to a sample card's eyebrow so provenance shows per-card. */
const SAMPLE_TAG = "Sample · ";

const HEX = { cyan: "#00E5FF", magenta: "#FF38C7", uv: "#7B61FF", amber: "#E0A800", white: "#F5F7FF" };

/** Compose the prioritized, cross-product briefing from the live engines. */
export function buildBriefing(): BriefingCard[] {
  const cards: BriefingCard[] = [];

  // Breaking — top of the wire by urgency (corroboration-aware).
  // DEMO_WIRE is fictional (see wire.ts): the eyebrow must NOT assert a
  // real-world "confirmed by N sources" corroboration over invented reports.
  // Label by source tier only and mark the card a sample.
  const top = rankWireCorroborated(DEMO_WIRE)[0];
  if (top) {
    cards.push({
      id: "brief-breaking", kind: "breaking", priority: Math.min(100, top.urgency + 20),
      eyebrow: `${SAMPLE_TAG}Breaking · ${top.item.tier}`,
      headline: top.item.headline,
      detail: top.action, action: "Open The Beat", href: "/the-beat", accent: HEX.cyan,
      sample: true,
    });
  }

  // Scheme — most reliable change
  const sc = [...SCHEME_SCENARIOS].sort((a, b) => TIER_WEIGHT[b.tier] - TIER_WEIGHT[a.tier])[0];
  if (sc) {
    const cascade = applyScheme(sc);
    cards.push({
      id: "brief-scheme", kind: "scheme", priority: Math.round(cascade.confidence * 70),
      eyebrow: `${SAMPLE_TAG}Scheme shift · ${sc.team}`, headline: sc.headline,
      detail: `${cascade.gainers} rise, ${cascade.faders} fade — see the full ripple.`,
      action: "Open Scheme Intel", href: "/fantasy/scheme", accent: HEX.uv,
      sample: true,
    });
  }

  // Roster risk — from the League Twin
  const twin = buildLeagueTwin();
  const risk = twin.riskCount + twin.byeExposure;
  if (risk > 0) {
    cards.push({
      id: "brief-roster", kind: "roster", priority: Math.min(85, 35 + risk * 8),
      eyebrow: `${SAMPLE_TAG}Roster risk`, headline: `${twin.riskCount} shock${twin.riskCount === 1 ? "" : "s"} and ${twin.byeExposure} bye-eclipse${twin.byeExposure === 1 ? "" : "s"} on your roster`,
      detail: `Week ${twin.currentWeek} is your biggest blackout — plan the holes before they cost you.`,
      action: "Open the League Twin", href: "/fantasy/league-twin", accent: HEX.magenta,
      sample: true,
    });
  }

  // DFS leverage play
  const dfs = [...DFS_SLATE].sort((a, b) => leverage(b) - leverage(a))[0];
  if (dfs) {
    cards.push({
      id: "brief-dfs", kind: "dfs", priority: Math.min(70, Math.round(leverage(dfs) * 5)),
      eyebrow: `${SAMPLE_TAG}DFS leverage`, headline: `${dfs.name} — the contrarian ceiling of the slate`,
      detail: `${Math.round(dfs.own * 100)}% owned with a ${dfs.ceiling} ceiling. Leverage ${leverage(dfs).toFixed(1)}.`,
      action: "Open the optimizer", href: "/fantasy/dfs", accent: HEX.cyan,
      sample: true,
    });
  }

  // Pick'em edge
  const prop = PROPS.map(readProp).sort((a, b) => b.edge - a.edge)[0];
  if (prop) {
    cards.push({
      id: "brief-props", kind: "props", priority: Math.round(prop.edge * 65),
      eyebrow: `${SAMPLE_TAG}Pick'em edge`, headline: `${prop.prop.player} ${prop.side.toUpperCase()} ${prop.prop.market} ${prop.prop.line}`,
      detail: `${Math.round(prop.pSide * 100)}% on our number. ${prop.note}`,
      action: "Open Pick'em Edge", href: "/fantasy/props", accent: HEX.uv,
      sample: true,
    });
  }

  // CLV discipline — always-on nudge. Generic guidance with no fabricated
  // stats, so it is not marked a sample.
  cards.push({
    id: "brief-discipline", kind: "discipline", priority: 45,
    eyebrow: "Discipline", headline: "Log yesterday's bets and grade your CLV",
    detail: "Beating the close is your real scoreboard — the record follows the CLV.",
    action: "Open the CLV Tracker", href: "/track", accent: HEX.amber,
    sample: false,
  });

  return cards.sort((a, b) => b.priority - a.priority);
}
