/**
 * Public record line — the single set of record numbers any crawlable or
 * marketing surface is allowed to print.
 *
 * Why this module exists (2026-11-15): `/llms.txt`, `/llms-full.txt`,
 * `/.well-known/ai-plugin.json`, `/props` and `/research` all advertised
 * "47-19-1 (71.2% ...)" as the *official verified* record. That snapshot was
 * the 2026-11-02 all-in view; the recomputed ledger supersedes it and files it
 * under `secondary_views`. Worse, those surfaces published a win-rate
 * percentage while the calibration law locks the rate until 200 CLV-backed
 * settled plays exist.
 *
 * Every value below is derived from `verified-ledger.json`, which is generated
 * from Neon by `scripts/verify-ledger.ts`. Nothing here is hand-typed, so a
 * stale record cannot survive a ledger refresh.
 */

import { formatUnits, formatWlp, verifiedLedger } from "./verified-ledger-view";

const gate = verifiedLedger.official.gate;

/** Artifact generation date, YYYY-MM-DD. */
export const PUBLIC_RECORD_AS_OF = verifiedLedger.generatedAt.slice(0, 10);

/** "79-46-0" — counts only. */
export const PUBLIC_RECORD_COUNTS = formatWlp(verifiedLedger.official.wlp);

/** "+81.47u" — signed units at flat 1u staking. */
export const PUBLIC_RECORD_UNITS = formatUnits(verifiedLedger.official.units.total);

/** "53/200" — CLV-backed settled plays against the calibration gate. */
export const PUBLIC_CALIBRATION_PROGRESS = `${gate.clvBackedSettled}/${gate.target}`;

/**
 * One line, no percentage, gate state included.
 * Example: "79-46-0 +81.47u verified · win rate locked until 200 CLV-backed
 * settled plays (53/200) · as of 2026-11-13".
 */
export const PUBLIC_RECORD_LINE = `${PUBLIC_RECORD_COUNTS} ${PUBLIC_RECORD_UNITS} verified · win rate locked until ${gate.target} CLV-backed settled plays (${PUBLIC_CALIBRATION_PROGRESS}) · as of ${PUBLIC_RECORD_AS_OF}`;

/** The sentence that must accompany the line wherever the record is claimed. */
export const PUBLIC_RECORD_POLICY = `No win-rate percentage is published until ${gate.target} official plays are settled and graded against the closing line. Every number is recomputed from the settlement database at /record.`;

/**
 * The superseded snapshot may only ever appear with this label attached.
 * Guarded by `public-record-manifests.test.ts`.
 */
export const SUPERSEDED_RECORD_NOTE = `47-19-1 (+24.92u) is the audited 2026-11-02 all-in snapshot (route-gated props included). It is superseded by the recomputed ledger above and kept only as a historical anchor.`;

/** Every pick with an official settlement event, including non-premium tiers. */
export const PUBLIC_PIPELINE_SETTLED = verifiedLedger.pipeline.wlp.settled;