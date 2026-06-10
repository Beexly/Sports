# GSN Deep R&D Packet — reconciliation vs the built system (2026-06-10)

Verified against the deploy trunk at commit `29239d2`+ (2,139-test green baseline). Boundary honored: Lumera docs untouched here (they belong to the Lumera repo's context).

## Already built — the packet validates the existing system
| Packet item | Status in the trunk |
|---|---|
| **Publish Gate** (block stale/unreviewed/risky language) — backlog P0 | ✅ EXISTS: readiness gates + 60-min freshness fail-closed + draft-only contract (engine never publishes) + banned-phrase compliance BLOCKER + trust-gate CI |
| **Stale-data blocking / freshness** | ✅ EXISTS: the truth contract (200/207/502 classified), `/api/ready`, decay of trust on stale — the *clock* refinement is net-new (below) |
| **No-Bet taxonomy** — backlog P0 | �одному PARTIAL: `GateDecision` rows + reasonCodes + the public Pass List exist; the packet's richer `NoBetReason` enum + radar state = extension ticket |
| **Post-Game Autopsy** — backlog P2 | ✅ EXISTS: the Loss Room (`LossAutopsy` model, public pages, snapshot receipts) |
| **Source-quality DESIGN** | ✅ DESIGNED: data-mesh 20–22 (registry, roles, license/TOS triage, honest limits) — the packet's `Source`/`SourceClaim` schema is the implementable model for it |
| **Podcast + voice system** — backlog P2 | ✅ BUILT TODAY (POD-01): draft generator (banned-phrase-scanned, DRAFT-only), render runner (own-voice only), **consent record gate** + **verbatim AI-voice disclosure** (both packet requirements, implemented), gated RSS + /podcast |
| **Risk register** | ✅ ALIGNED: FakeDetail avoid-verdict already on file; voice-consent + disclosure implemented; no-paywall-bypass/no-temp-SMS = standing doctrine; "no-bet is quality control, not failure" = the Pass List's exact framing |

## Genuinely net-new — ticketed
| ID | From packet | What it is | Effort |
|---|---|---|---|
| FR-01 | Flight Recorder (P1, "IP spine") | Append-only event log unifying the EXISTING audit fragments (GateDecision, IngestionRun, calibration regen, publish/review actions) into one `FlightRecorderEvent` timeline + public game-detail drawer + admin diff view. Events are append-only; corrections are new events. | L |
| SRC-01 | Source Quality Ledger + Rumor Quarantine (P0+P1) | `Source`/`SourceClaim`/`SourceScore` models (authority, licensing, accuracy, conflict rate, TTL) + rumor states (observed→…→official_confirmed) with publish locks: unconfirmed never grounds a public rec; contradiction auto-blocks the related candidate. Public copy model: "availability unresolved → watch/No-Bet," never "insider says X." | L |
| DEC-01 | Confidence Decay Clock (P1) | TTL-driven decay: source expiry + odds age + injury uncertainty decay confidence between refreshes (extends the 60-min binary gate into a curve). Shadow-first. | M |
| NBR-01 | No-Bet taxonomy extension (P0) | Richer `NoBetReason` enum on GateDecision + the radar state + admin explanation fields. | S-M |
| MR-01 | Market Radar (P1) | Slate-level cards: freshness, volatility, disagreement, no-bet status — "10-second comprehension." Builds on board/state + currentEdgeIndex. | M |
| POD-02 | Podcast upgrades (P2) | The 8-segment episode structure (Market Radar / No-Bet Lab / Source Check / Injury Volatility / Sharp-Public / Autopsy segments), per-episode source packet, clip pack. Several segments depend on SRC-01/FR-01 data existing. | M |

## Sequencing call (director)
SRC-01 → FR-01 → DEC-01/NBR-01 → MR-01 → POD-02. Rationale: sources-as-entities is the foundation the recorder's events cite; the recorder is the spine the radar and podcast segments read. **None of it blocks launch** — the launch gate remains GA-01/GA-02 + the calibration sample; this stack is the post-launch moat (and the shadow season runs fine without it).
