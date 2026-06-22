# GSE League Memory Graph + Voice Jarvis Design Specification

**Status:** Design specification document. Implementation-grade detail where possible.
Unverified platform API claims are labeled "source gap — verify before implementation."
**Branch:** claude/laughing-wozniak-gyryjx
**Date:** 2026-06-22

> This document specifies the League Memory Graph and Voice Jarvis Draft Co-Pilot
> as complementary first-of-kind systems. Neither duplicates the existing League Twin
> (spatial roster visualization), GM Ledger (process grade ledger), or Bias Mirror
> (behavioral self-awareness). These are the data infrastructure and live voice
> assistance layers those systems depend on.

---

## 1. Why League Memory Is a Moat

### What Generic Draft Tools Cannot See

A generic draft tool (FantasyPros, Underdog, Sleeper's draft assistant) has access
to market-wide data: consensus ADP, expert rankings, projected ownership, injury
news. It knows nothing about the ten people in your specific league.

It cannot answer:
- "Does Manager 7 always panic-draft an RB when one goes to another team in rounds
  3-4?"
- "Is Manager 3 going to drain the TE market early because that's what she does every
  year?"
- "In this league, do TEs go at 20% premium to market because the scoring is PPR
  with TE premium?"
- "Last year I reached for this exact same player type in round 5 — am I doing it
  again?"

None of this is in the market. All of it is in the history of your specific league.
The League Memory Graph is the only way to answer these questions programmatically.

### Manager Archetypes Vary by League

A manager who appears ADP-adherent in a redraft league may be aggressive in a keeper
league because their keeper calculus changes their available draft board. A manager
who looks like a safe drafter in one league may be a high-variance swinger in another.
The behavioral profile is league-specific, not person-specific in isolation.

The League Memory Graph stores both: per-manager behavior within a specific league,
and cross-league behavior for managers who participate in multiple tracked leagues.
The league-specific model always takes precedence when the league context is known.

### The Compounding Value of Year-over-Year History

Season 1: one draft upload. Manager Genome has low confidence. Regret Engine has
one reference point. No exploit map.

Season 2: two drafts. Manager Genome confidence improves. Regret Engine identifies
first repeating patterns. Exploit Map starts to show systematic deviations.

Season 3: Genome patterns are statistically robust. Regret Engine can distinguish
persistent bias from noise. Exploit Map shows actionable positional gaps.
The War Room opponent panel is genuinely useful.

Season 5: The League Memory Graph is a competitive moat. A new manager in the
league who does not have GSE faces a permanent information disadvantage. No new
product can replicate this history in less than five years.

### Data Network Effects

More seasons per user: the individual user's data becomes more valuable (Genome
confidence, Regret Engine accuracy, Bias Mirror precision).

More users in the same league: if multiple managers in the same league use GSE
independently, the League Memory Graph for that league gains multi-perspective data
(more detailed transaction data, more consistent draft board coverage).

Note: league data from one user is never merged with league data from another user
without explicit opt-in from the first user. Privacy is per-account by default.

---

## 2. Historical Draft Upload Specification

### Overview

The upload pipeline must take raw, messy historical data and produce canonical
FantasyDraft and FantasyDraftPick records with resolved player IDs, normalized
positions, and calculated ADP-at-time estimates. Every format has different reliability
characteristics.

---

### Supported Upload Formats

#### Format 1: CSV Draft Results (Standard Snake/Auction Export)

**What can be extracted:**
Pick number, round, pick within round, manager name/team name, player name, NFL team,
position, salary (auction), keeper flag (if platform exports it).

**What is typically missing:**
ADP at draft time (platform exports do not include ADP snapshots), projection at
draft time.

**Data quality:** High. CSV is structured and consistently formatted within a platform.
Parsing reliability is high once the column mapping is established. Different platforms
use different column names — require platform detection from headers.

**Legal posture:** User-generated data. The user owns their draft results. The platform
terms for exporting your own data are generally permissive. Verify per-platform before
automated processing (source gap: per-platform export terms not yet individually
reviewed). Storing and processing the user's own exported data is unambiguously
within user rights.

**GSE implementation complexity:** Low. CSV parsing with column detection and
player name resolution. Estimated effort: 3-5 engineering days.

---

#### Format 2: Copy-Pasted Draft Board Text

**What can be extracted:**
Same fields as CSV if the copy-paste preserves tabular structure. Quality degrades
significantly if the user pastes unformatted text or a screenshot-OCR attempt.

**Data quality:** Medium. Requires heuristic parsing to detect round boundaries, pick
numbers, and player names from semi-structured text. Errors expected; manual correction
UI required.

**Parsing reliability:** Medium. Works well for platform-generated formatted boards
(Sleeper draft board copy, ESPN pick log). Unreliable for freeform text.

**Legal posture:** Same as CSV — user's own data.

**GSE implementation complexity:** Medium. Heuristic text parser with validation
and user-confirmation step for uncertain parses. Estimated effort: 7-10 engineering
days.

---

#### Format 3: Screenshot (AI/OCR Processing)

**BETA/GATED: This feature is explicitly labeled as beta and requires founder
activation before it is available to users.**

**What can be extracted:**
Pick grid, player names, team names, round structure. OCR against draft board images.

**Data quality:** Variable. Dependent on screenshot resolution and OCR accuracy.
Player name OCR error rate in testing is unknown — must be benchmarked before
production use.

**Parsing reliability:** Low. Font rendering, color contrast, and partial screenshots
all degrade reliability. Every parse requires manual user confirmation.

**Legal posture:** User's own screenshot of their draft. No third-party data rights
issue. AI/OCR processing is internal computation.

**GSE implementation complexity:** High. Requires OCR pipeline (Tesseract or cloud
OCR service), Claude API for layout interpretation, validation UI for every parse.
Do not ship without benchmarked accuracy > 85% on pick name extraction.

---

#### Format 4: Yahoo Fantasy Export

**What can be extracted (source gap — verify before implementation):**
Yahoo provides a CSV export of draft results from the draft history page. Confirmed
fields in community reports: pick number, round, manager name, player name, position.
Source gap: whether Yahoo's export includes salary (auction), keeper year, or ADP
is not confirmed. Verify against current Yahoo export before implementation.

**Legal posture:** User's own league data. Yahoo's Terms of Service should be reviewed
for restrictions on automated processing of exported data. Source gap: specific
ToS language not yet reviewed. Manual export by user is the safe path — GSE does not
scrape Yahoo.

**GSE implementation complexity:** Low (once CSV format is mapped). Requires
Yahoo-specific column mapping.

---

#### Format 5: ESPN Fantasy Export

**What can be extracted (source gap — verify before implementation):**
ESPN does not prominently offer a draft results CSV export. Third-party tools access
ESPN data via an unofficial API. Source gap: ESPN's official export functionality for
draft results has not been confirmed. Do not rely on unofficial API access without
explicit legal review.

**Legal posture:** Source gap. ESPN terms must be reviewed. Do not build ESPN data
extraction that relies on unofficial API endpoints.

**GSE implementation complexity:** Unknown until legal review completes.
Conservative recommendation: support manual entry for ESPN drafts until a
permissible extraction method is confirmed.

---

#### Format 6: Sleeper League Export (API-Based, User-Authenticated)

**What can be extracted:**
Sleeper has a well-documented public API. With user authentication (they provide
their own Sleeper user ID or OAuth token), GSE can read:
- Draft picks (`GET /draft/{draft_id}/picks`)
- League info (`GET /league/{league_id}`)
- Rosters (`GET /league/{league_id}/rosters`)
- Transactions (`GET /league/{league_id}/transactions/{round}`)
- Players (via `/players/nfl`)

Source gap: Sleeper's Terms of Service for third-party application use of their API
should be reviewed. Their public API documentation does not require explicit
application registration for read access with user credentials. However, commercial
use of API data should be explicitly confirmed.

**Data quality:** High. Structured JSON. Player IDs are Sleeper-specific — require
mapping to GSE canonical player IDs.

**Legal posture:** User provides their own credentials. Reads their own data. 
Conditional on Sleeper API terms review.

**GSE implementation complexity:** Medium. OAuth-based (or API key) authentication,
API client implementation, player ID mapping. Estimated effort: 7-10 engineering days.

---

#### Format 7: CBS Fantasy Export

Source gap: CBS Sports Fantasy has historically provided league export capabilities.
Specific export format and available fields not confirmed. Source gap — requires
manual investigation of current CBS Fantasy export features before implementation.

**Legal posture:** Source gap. Review CBS Fantasy terms before implementation.

---

#### Format 8: Fleaflicker Export

Source gap: Fleaflicker has offered data export features. Specific format not
confirmed. Source gap — requires manual investigation.

---

#### Format 9: Manual Entry (Web Form)

**What can be extracted:**
All fields the user knows and enters. Most users know: player names, round, pick order,
managers. Few will know the exact ADP at draft time.

**Data quality:** User-dependent. Likely incomplete.

**Parsing reliability:** N/A — structured form input.

**Legal posture:** User's own information. No issue.

**GSE implementation complexity:** Low. Standard web form with player autocomplete
against GSE player database.

---

#### Format 10: JSON/Custom Format

**What can be extracted:**
GSE will publish a canonical JSON schema for draft uploads. Advanced users can
export data from any system into this format.

**Data quality:** High if the user correctly maps their data.

**Parsing reliability:** High. Schema-validated input.

**Legal posture:** User's own data in a GSE-defined schema. No issue.

**GSE implementation complexity:** Low. Schema validation + ingestion. Useful for
power users and developer integrations.

---

### Data Normalization

#### Player Name Resolution

Raw draft exports use varied player name formats: "P. Mahomes", "Patrick Mahomes",
"Mahomes", "Mahomes II". Resolution pipeline:

1. Tokenize raw name into first token, last token, suffix.
2. Query GSE player database by last name (fuzzy match with Levenshtein distance ≤ 2).
3. If single match returned, auto-resolve.
4. If multiple matches (common last names), use NFL team context from adjacent columns
   to disambiguate.
5. If still ambiguous, queue for manual user confirmation.
6. Store resolution mapping (raw_name → player_id) in LeaguePlayerAlias table for
   future uploads.

Target: > 95% auto-resolution rate on standard platform CSV exports.

#### Position Normalization

Platform positions map to GSE canonical positions:
- "WR", "Wide Receiver", "WR/TE" (flex eligible) → WR
- "RB", "Running Back", "RB/WR" (flex eligible) → RB
- "QB", "Quarterback" → QB
- "TE", "Tight End" → TE
- "K", "PK", "Kicker" → K
- "DST", "DEF", "D/ST", "Defense" → DST
- "FLEX", "FLX", "W/R/T" → FLEX (position unknown, try player lookup to resolve)
- "IDP", "DB", "LB", "DL" → IDP (if IDP enabled in league settings)

#### Pick Number → Round/Pick Within Round

Given total teams N and total rounds R:
- Snake draft: round = ceil(pick / N). Pick within round = pick - ((round-1) * N)
  if odd round, or N - (pick - ((round-1) * N)) + 1 if even round.
- Linear draft: round = ceil(pick / N). Pick within round = pick - ((round-1) * N).
- Third-round reversal: standard snake except round 3 reverses. Handle as special
  case.

#### Auction Dollar Amounts

Store raw dollar amount as integer. Normalize to fraction of total auction budget
(pct_of_budget = amount / total_budget) for cross-league comparison.

#### Keeper Compensation Calculations

For keeper drafts: keeper_year is the year the player was originally drafted or
acquired. keeper_cost is the pick or salary given up. Store raw values — do not
attempt to calculate "true value" of a keeper (this depends on league rules and is
the user's judgment).

#### Handling Missing Data

Mandatory fields for a valid FantasyDraftPick record: overall_pick, manager_id,
player_name. All other fields are nullable. Missing ADP-at-time is expected —
it will be backfilled from historical ADP data if an approved historical ADP source
is available. Missing projection-at-time cannot be reliably backfilled and should
remain null.

---

## 3. Canonical Data Schema

The following schema defines all entities in the League Memory Graph. For
implementation, these map to Prisma models in `packages/db/prisma/schema.prisma`.

---

```
FantasyLeague {
  id                  String    // UUID
  name                String
  platform            String    // "sleeper" | "yahoo" | "espn" | "cbs" | "fantrax"
                                // | "nfl" | "mfl" | "fleaflicker" | "manual" | "other"
  leagueSize          Int       // Number of teams (2-32)
  scoringType         String    // "standard" | "ppr" | "half_ppr" | "custom"
  pprAmount           Float?    // PPR value if custom
  flexRules           String    // "WR/RB" | "WR/RB/TE" | "WR/RB/TE/QB"
  superflexEnabled    Boolean
  idpEnabled          Boolean
  auctionBudget       Int?      // null if snake draft
  benchSize           Int
  irSpots             Int
  waiverType          String    // "rolling" | "faab" | "lifo" | "commissioner"
  faabBudget          Int?      // null if non-FAAB
  isPublic            Boolean   // public league or private
  ownerId             String    // User ID who uploaded/owns this league
  createdAt           DateTime
  updatedAt           DateTime
  seasons             FantasySeason[]
  managers            FantasyManager[]
}

FantasySeason {
  id                  String    // UUID
  leagueId            String    // FK → FantasyLeague
  year                Int       // NFL season year (2019, 2020, ...)
  draftDate           DateTime?
  draftType           String    // "snake" | "auction" | "linear" | "third_reversal"
                                // | "best_ball" | "keeper_snake" | "keeper_auction"
  keeperRules         Json?     // Structured keeper rules (slots, cost calculation, etc.)
  finalStandings      Json?     // Map of manager_id → final_rank
  playoffStructure    Json?     // Number of teams, weeks, bracket format
  regularSeasonWeeks  Int       // Typically 13-14
  playoffWeeks        Int       // Typically 3
  lockedAt            DateTime? // Season lock date — records immutable after this
  createdAt           DateTime
  drafts              FantasyDraft[]
  standings           FantasyStanding[]
  playoffResults      FantasyPlayoffResult[]
  transactions        FantasyTransaction[]
}

FantasyManager {
  id                  String    // UUID
  leagueId            String    // FK → FantasyLeague
  userId              String?   // FK → User (null if manager is not a GSE user)
  managerName         String    // Display name (from platform or manual entry)
  teamName            String?   // Team name if available
  isCurrentUser       Boolean   // True if this manager is the GSE account owner
  externalId          String?   // Platform-specific manager ID for sync
  createdAt           DateTime
  seasons             FantasyManagerSeason[]
  draftPicks          FantasyDraftPick[]
  transactions        FantasyTransaction[]
  tradesAsManager1    FantasyTrade[]
  tradesAsManager2    FantasyTrade[]
  standings           FantasyStanding[]
  playoffResults      FantasyPlayoffResult[]
  profile             FantasyManagerProfile?
}

FantasyManagerSeason {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  seasonId            String    // FK → FantasySeason
  finalRank           Int?
  regularSeasonWins   Int?
  regularSeasonLosses Int?
  regularSeasonTies   Int?
  pointsFor           Float?
  pointsAgainst       Float?
  playoffResult       String?   // "champion" | "runner_up" | "semi" | "miss" | "none"
  createdAt           DateTime
}

FantasyDraft {
  id                  String    // UUID
  seasonId            String    // FK → FantasySeason
  draftDate           DateTime?
  draftType           String    // "snake" | "auction" | "linear" | etc.
  totalRounds         Int
  totalPicks          Int       // leagueSize × totalRounds
  auctionBudget       Int?
  sourceFormat        String    // How it was uploaded (for audit trail)
  uploadedAt          DateTime
  createdAt           DateTime
  picks               FantasyDraftPick[]
}

FantasyDraftPick {
  id                  String    // UUID
  draftId             String    // FK → FantasyDraft
  overallPick         Int       // 1-indexed overall pick number
  round               Int
  pickWithinRound     Int
  managerId           String    // FK → FantasyManager
  playerId            String?   // FK → canonical player (null if unresolved)
  playerName          String    // Raw name from upload (preserved for audit)
  playerNameResolved  Boolean   // True if playerId has been resolved
  position            String    // Canonical position
  nflTeam             String?
  salary              Int?      // Auction salary in dollars (null for snake)
  keeperYear          Int?      // Year originally drafted (keeper leagues)
  keeperCost          Json?     // Cost to keep (pick or salary)
  adpAtTime           Float?    // ADP at draft time — may be backfilled or null
  projAtTime          Float?    // Projection at draft time — usually null
  actualPointsSeason  Float?    // Actual fantasy points scored (populated at season end)
  gamesPlayed         Int?      // Games played (populated at season end)
  createdAt           DateTime
}

FantasyRosterSnapshot {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  seasonId            String    // FK → FantasySeason
  week                Int
  players             Json      // Array of player_id + roster_slot
  totalProjected      Float?    // Projected points for the week
  actualPoints        Float?    // Actual points scored
  recordedAt          DateTime
  createdAt           DateTime
}

FantasyTransaction {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  seasonId            String    // FK → FantasySeason
  week                Int
  type                String    // "WAIVER_ADD" | "WAIVER_DROP" | "FAAB_BID"
                                // | "TRADE" | "FREE_AGENT"
  playersAdded        Json?     // Array of player_id
  playersDropped      Json?     // Array of player_id
  faabBid             Int?      // FAAB bid amount in dollars
  faabResult          String?   // "won" | "lost"
  processingPriority  Int?      // Waiver priority if applicable
  externalId          String?   // Platform transaction ID
  transactionDate     DateTime?
  createdAt           DateTime
}

FantasyTrade {
  id                  String    // UUID
  seasonId            String    // FK → FantasySeason
  week                Int
  manager1Id          String    // FK → FantasyManager
  manager2Id          String    // FK → FantasyManager
  playersTo1          Json      // Array of player_id going to manager1
  playersTo2          Json      // Array of player_id going to manager2
  picksTo1            Json?     // Array of pick descriptors going to manager1
  picksTo2            Json?     // Array of pick descriptors going to manager2
  tradeDate           DateTime?
  externalId          String?   // Platform trade ID
  createdAt           DateTime
}

FantasyStanding {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  seasonId            String    // FK → FantasySeason
  week                Int
  wins                Int
  losses              Int
  ties                Int
  pointsFor           Float
  pointsAgainst       Float
  rank                Int
  playoffEligible     Boolean
  createdAt           DateTime
}

FantasyPlayoffResult {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  seasonId            String    // FK → FantasySeason
  result              String    // "CHAMPION" | "RUNNER_UP" | "SEMI" | "QUARTERFINAL"
                                // | "FIRST_ROUND_EXIT" | "MISSED_PLAYOFFS"
  playoffRound        Int?      // Round reached before elimination
  pointsInPlayoffs    Float?
  createdAt           DateTime
}

FantasyManagerProfile {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager (unique)
  updatedAt           DateTime
  tendencies          FantasyDraftTendency[]
  genome              Json      // ManagerGenome serialized (see Section 4)
  regretScore         Float?    // Overall regret score (0 = perfect, higher = more regret)
  exploitability      Float?    // How exploitable this manager's patterns are (0-100)
  genomeConfidence    String    // "low" | "medium" | "high" (based on sample size)
  createdAt           DateTime
}

FantasyDraftTendency {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  category            String    // Tendency category (ADP_ADHERENCE, RB_BIAS, etc.)
  observedValue       Float     // Observed metric value
  adpAverage          Float?    // Market benchmark for comparison
  deviation           Float?    // Observed - Expected
  confidence          Float     // 0.0 to 1.0 based on sample size
  sampleSize          Int       // Number of observations
  lastUpdated         DateTime
  createdAt           DateTime
}

FantasyRegretAnalysis {
  id                  String    // UUID
  managerId           String    // FK → FantasyManager
  seasonId            String    // FK → FantasySeason
  draftPickId         String    // FK → FantasyDraftPick
  category            String    // See regret categories in Section 5
  actualValue         Float?    // Actual fantasy points of taken player
  bestAvailableValue  Float?    // Actual fantasy points of best available at that pick
  opportunityCost     Float?    // bestAvailableValue - actualValue
  processGrade        String    // "GOOD" | "BAD" | "NEUTRAL"
  outcomeGrade        String    // "GOOD" | "BAD" | "NEUTRAL"
  outcomeCategory     String    // GOOD_PROCESS_GOOD_OUTCOME | etc.
  adpDeviationPicks   Float?    // Reach amount in picks (negative = reach, positive = value)
  lessonLearned       String?   // Human-readable lesson
  createdAt           DateTime
}
```

---

## 4. Manager Genome Specification

The Manager Genome is a multi-dimensional behavioral profile stored as a JSON object
in `FantasyManagerProfile.genome`. Each dimension has a score, confidence, and
minimum sample size enforcement.

---

### Genome Dimensions

#### 1. ADP Adherence Score

**What it measures:** How closely this manager follows market ADP in their draft picks.

**Formula:**
For each pick, calculate ADP deviation = (actual pick number) - (ADP at draft time).
Negative = reach (picked earlier than ADP). Positive = value pick (picked later).
ADP Adherence Score = percentage of picks within ±1.5 rounds of ADP.

**Data required:** FantasyDraftPick records with adpAtTime populated.

**Minimum sample size:** 30 picks (approximately 2 full drafts).

**Display:** 0-100 score. 0 = never follows ADP (high reach/value frequency).
100 = always within 1.5 rounds of ADP. Displayed as "ADP Follower" vs. "ADP Deviator"
with magnitude.

---

#### 2. Position Bias (RB/WR/QB/TE Priority)

**What it measures:** Whether this manager consistently drafts specific positions
earlier or later than their ADP suggests.

**Formula:**
For each position, calculate positional ADP deviation = mean ADP deviation for picks
of that position. Values significantly negative indicate position is drafted early.
Store separate bias score per position.

**Data required:** FantasyDraftPick records with adpAtTime and position populated.

**Minimum sample size:** 10 picks per position for that position's bias score.

**Display:** Spider chart showing relative prioritization by position vs. market.
"Drafts RBs 1.2 rounds early vs. market. Drafts QBs 2.1 rounds late vs. market."

---

#### 3. Risk Appetite Index

**What it measures:** Preference for high-upside/high-variance players vs.
high-floor/safe players within the same tier.

**Formula:**
Source gap: requires floor/ceiling data at draft time, which is not typically in
historical exports. Approximation: use injury history of drafted players (players
with >1 missed game in prior season as "risky"), bye-week stack rate, and first-
pick deviation to estimate risk tolerance. Full version requires paired pick
comparison data.

**Minimum sample size:** 20 comparable pick situations.

**Display:** "Conservative" to "High-Variance" spectrum with examples.

---

#### 4. Rookie Enthusiasm Score

**What it measures:** How early this manager drafts rookies relative to market ADP.

**Formula:**
For each pick of a player in their NFL rookie year: ADP deviation for that pick.
Rookie Enthusiasm Score = mean ADP deviation for rookie picks. Significantly negative
= drafts rookies early.

**Data required:** FantasyDraftPick with player_id resolved to know NFL entry year.

**Minimum sample size:** 10 rookie picks.

**Display:** "Drafts rookies 1.8 rounds early on average (N=12)."

---

#### 5. Veteran Safety Bias

**What it measures:** Whether this manager over-drafts proven veterans late in drafts.

**Formula:**
For picks in rounds 8+, calculate frequency of drafting players with 5+ NFL years vs.
players with ≤3 NFL years. Compare to market distribution.

**Minimum sample size:** 30 late-round picks.

**Display:** "Late rounds: 68% veterans vs. 45% market average."

---

#### 6. Injury Avoidance Score

**What it measures:** Whether this manager systematically avoids players with injury
history.

**Formula:**
For each available player at a given pick who had a significant injury (missed ≥4
games) in the prior season: was this player drafted by this manager at market ADP,
reached for, or avoided? Injury avoidance score = how much later this manager drafts
injury-history players vs. their market ADP.

**Data required:** Injury history data for players (from nflverse or cleared source).

**Minimum sample size:** 15 situations where an injury-history player was available.

**Display:** "Drafts players with prior-year injuries 1.4 rounds later than market."

---

#### 7. Favorite Team Bias

**What it measures:** Whether this manager over-drafts players from their NFL
favorite team.

**Formula:**
Source gap: requires knowing the manager's NFL team preference, which is not
available from draft data alone. If the user declares their NFL team in their
profile, compare draft rate of players from that team to market draft rate.
Alternatively, detect implicit favorite team from draft patterns (position:
player team is drafted earliest/most frequently).

**Display:** "You draft [Team] players 1.7 rounds earlier than market consensus."
Explicit: only show if user has self-declared their team preference or the implicit
signal is strong.

---

#### 8. Panic Draft Detector

**What it measures:** Whether this manager reaches for a player after seeing similar
players drafted by others in the previous 2-3 picks.

**Formula:**
For each pick, check if the previous 2 picks by other managers were of the same
position. If yes, did this manager reach for the same position earlier than their
typical ADP deviation for that position? Panic Draft Score = frequency of above-
market reaches immediately following a positional run by other managers.

**Minimum sample size:** 15 "run trigger" situations.

**Display:** "Panic drafted in 6 of 15 situations where others triggered a run (40%)."

---

#### 9. Auction Strategy (Price vs. Value) — Auction Leagues Only

**What it measures:** Whether this manager consistently overpays or underpays relative
to player auction value.

**Formula:**
Source gap: requires auction value benchmarks at draft time. If available: for each
auction pick, calculate (salary paid - market value) / market value. Distribution
centered at 0 = fair market. Positive = overpays. Negative = bargain hunter.

**Display:** "Overpays by an average of 14% vs. auction market benchmarks."

---

#### 10. Waiver Aggression Index

**What it measures:** How aggressively this manager uses the waiver wire relative
to their available resources (FAAB budget, priority).

**Formula:**
Waiver adds per season vs. league average. FAAB bids per dollar in budget (bid
rate vs. budget). Top FAAB bids as percentage of total budget.

**Data required:** FantasyTransaction records.

**Minimum sample size:** One full season of transaction data.

**Display:** "Waiver wire adds: 2.4× league average. Uses FAAB aggressively (3+
bids > $40 per season)."

---

#### 11. Trade Activity Score

**What it measures:** How frequently this manager trades relative to league average.

**Formula:**
Trades per season vs. league average. Trade acceptance rate (if offer and response
data are available). Player type traded away vs. acquired (RB seller, WR buyer, etc.)

**Data required:** FantasyTrade records.

**Display:** "Trades 2.1× per season (league average: 1.2)."

---

#### 12. Manager Success Delta

**What it measures:** The gap between draft quality grade and final standing. High
positive delta = manager drafts better than their final standing suggests. High
negative delta = manager's draft quality is better than their results.

**Formula:**
Draft quality grade = sum of (actualPointsSeason / expectedPointsAtADP) for all
picks. Normalize to league average. Final standing = final rank normalized. Success
Delta = normalized draft quality - normalized final standing.

**Data required:** actualPointsSeason for all FantasyDraftPick records, plus
FantasyManagerSeason.finalRank.

**Display:** "Draft grade: top-3 in league. Final standing: 7th. High negative
delta — likely waiver/lineup management gap, not draft quality."

---

## 5. Historical Regret Engine Design

For each FantasyDraftPick in the user's history, the Regret Engine calculates
the following:

---

### Step 1: What Was the Actual Value?

`actualPointsSeason` from FantasyDraftPick (populated at season end from nflverse
or cleared stats source). If player had season-ending injury in week 1, actual value
reflects that.

---

### Step 2: What Was Available at That Pick Position?

Reconstruct the available player pool at that pick: all players not yet drafted
(picks 1 through overallPick - 1 are known from FantasyDraft). The available pool
is the full player universe minus previously picked players.

---

### Step 3: What Was the Optimal Available Pick?

Among all available players at that pick, which had the highest actualPointsSeason
in the same season? Store as bestAvailablePick and bestAvailableValue.

---

### Step 4: What Was the Opportunity Cost?

opportunityCost = bestAvailableValue - actualValue.

If opportunityCost ≤ 0, the manager's pick was at least as good as the best
alternative. No regret.

If opportunityCost > 0, the manager left value on the board.

Important: opportunity cost is an outcome measure. It does not by itself determine
process grade.

---

### Step 5: What Process Led to This Pick?

Process classification uses adpAtTime (if available) and pick context:

- **REACH:** overallPick < adpAtTime - 12 (picked more than 1 round earlier than ADP)
- **VALUE_PICK:** overallPick > adpAtTime + 12 (picked more than 1 round later than ADP)
- **ADP_FOLLOWER:** |overallPick - adpAtTime| ≤ 12 (within 1 round of ADP)
- **POSITIONAL_RUN_PANIC:** Panic Draft Detector triggered for this pick
- **ROSTER_NEED:** Pick deviates from ADP in a direction consistent with roster
  construction need (e.g., taking TE in round 5 when no TE on roster)

If adpAtTime is null, process classification defaults to UNKNOWN_PROCESS.

---

### Step 6: Process Grade

```
GOOD_PROCESS: VALUE_PICK | ADP_FOLLOWER | ROSTER_NEED (when position was needed)
BAD_PROCESS: REACH | POSITIONAL_RUN_PANIC | ROSTER_NEED (when position was not needed)
```

---

### Step 7: Outcome Grade

```
GOOD_OUTCOME: actualPointsSeason >= P50 for position at draft round
BAD_OUTCOME: actualPointsSeason < P25 for position at draft round
NEUTRAL_OUTCOME: between P25 and P50
INJURY_OUTCOME: player missed >= 8 games due to injury (special case)
```

P50/P25 benchmarks are calculated from the historical distribution of actualPointsSeason
for all players drafted in the same round range and position in the same season.

---

### Step 8: Outcome Category

```
GOOD_PROCESS_GOOD_OUTCOME    — Earned: good decision, good result
GOOD_PROCESS_BAD_OUTCOME     — Respected: good decision, bad luck or injury
GOOD_PROCESS_INJURY_OUTCOME  — Injury Variance: good process, unforeseeable injury
BAD_PROCESS_GOOD_OUTCOME     — Lucky: bad decision that worked out anyway
BAD_PROCESS_BAD_OUTCOME      — Corrected: bad decision, deserved bad result
UNKNOWN_PROCESS_GOOD_OUTCOME — Cannot evaluate process (missing ADP data)
UNKNOWN_PROCESS_BAD_OUTCOME  — Cannot evaluate process (missing ADP data)
KNOWN_RISK_IGNORED           — Special: injury-history player drafted despite signal
MODEL_MISS                   — Special: ADP-consensus was wrong, not just the user
SOURCE_MISS                  — Special: real role change was not in any data source
USER_BIAS                    — Special: Bias Mirror flags this as a recurring pattern
```

**MODEL_MISS** requires that the ADP consensus was also wrong (player's ADP was in the
same range as the user's pick, and the player still underperformed). This
distinguishes "the market was wrong" from "the user was wrong."

**USER_BIAS** is flagged only when the Bias Mirror has detected a pattern with N ≥ 10
and this pick matches that pattern.

---

## 6. Voice Jarvis Draft Co-Pilot Design

### Architecture

**Voice Input Layer:**
- Browser: Web Speech API (`SpeechRecognition`) for voice capture
- Fallback: Text input for browsers without Web Speech API support (currently: Firefox
  requires explicit flag, most mobile Chrome/Safari support it)
- Voice active only during an active draft session (isJarvisActive flag)
- No background listening outside of draft sessions

**Communication Layer:**
- WebSocket connection (`/ws/draft/[draftId]`) maintained for the duration of the
  draft session
- Draft state updates pushed server-side via WebSocket as picks are entered
- Jarvis query messages sent over WebSocket; responses streamed back

**Response Generation:**
- Claude API (claude-sonnet-4-6) with streaming enabled
- Structured system prompt (see below) injected at session start
- Draft state context updated with each new pick before each Jarvis query
- Maximum response length: 150 words (enforced via max_tokens)
- Target latency: < 3 seconds from query receipt to first token

**Audio Output:**
- Web Speech Synthesis API for TTS (browser-native, no server-side TTS)
- Voice selection: user preference, default to OS default voice
- Simultaneous: text card displayed while audio plays (accessibility)

**Privacy by Default:**
- Voice audio is transcribed browser-side via Web Speech API (no audio sent to server)
- Only the transcribed text is sent to the GSE server
- Draft session transcript (text only) stored for 24 hours by default
- User can enable persistent voice transcript storage with explicit opt-in

---

### System Prompt Structure for Jarvis

The Jarvis system prompt is constructed at session start and updated with each
new pick. It must be structured, not freeform, to maintain consistent response
quality.

```
SYSTEM CONTEXT:

You are Jarvis, the GSE Draft Co-Pilot. You give fast, honest, evidence-backed
draft guidance. You do not fabricate statistics. If you don't have reliable data
for a question, say so. Keep answers under 50 words for tactical questions.

CURRENT DRAFT STATE:
- League: {league.name} ({league.leagueSize} teams, {league.scoringType},
  flex: {league.flexRules}, superflex: {league.superflexEnabled})
- Pick on clock: Overall pick #{currentPick}
- Manager on clock: {userTeamName} (YOU)
- User's current roster:
  {roster.map(p => `  - ${p.position}: ${p.name} (proj: ${p.projection})`).join('\n')}
- Positions still needed:
  {needsSummary}

AVAILABLE PLAYERS (top 15 by GSE ranking):
{availablePlayers.slice(0, 15).map(p =>
  `  ${p.rank}. ${p.name} (${p.position}, ${p.team}) | proj: ${p.projection} | ADP: ${p.adp} | GSE rank: ${p.gseRank}`
).join('\n')}

TIER SURVIVAL PROBABILITIES:
{tierSurvival.map(t =>
  `  ${t.position} Tier ${t.tier}: ${t.survivalPct}% chance ≥1 player survives to pick #${t.userNextPick}`
).join('\n')}

MANAGER PROFILES (THIS DRAFT ROOM):
{managers.map(m =>
  `  ${m.name}: ADP adherence ${m.adpAdherence}/100. Top tendency: ${m.topTendency}.`
).join('\n')}

USER STRATEGY PLAN:
{userStrategyPlan || "No strategy plan set for this draft."}

USER BIAS PROFILE:
{biasProfile || "No bias profile available (insufficient history)."}

CURRENT POSITION RUNS ACTIVE:
{positionRuns.length > 0 ?
  positionRuns.map(r => `  ${r.position}: ${r.pickCount} of ${r.totalPicks} teams have drafted in last ${r.window} picks`).join('\n')
  : "  None detected."}

DOCTRINE REMINDER:
- If you don't have reliable data for a question, say: "I don't have reliable data
  on that right now."
- Never fabricate injury reports, projections, or beat reporter claims.
- Always note when a recommendation is uncertain.
- You do not auto-draft. You advise only.
```

---

### Voice Commands and Response Templates

The following specifies the expected response for each query type. Templates are
illustrative of format, not verbatim content (actual player names and numbers will
vary). All responses must be backed by structured context — no fabrication.

---

#### 1. "Who should I take?"

**Response format (target: ≤ 50 words):**
Take [Player Name]. [One-sentence reason based on tier position, roster need, or
value]. [Tier survival note: "Tier [N] [Position]s survive to your next pick [X]% of
the time" or "This tier breaks here."]

**Example format:**
"Take Nico Collins. He's WR12 with WR2 upside, and this WR1 tier breaks at pick 42.
Your next pick is 47 — 23% chance a WR1 is there. Take him now."

---

#### 2. "Give me the safe pick"

**Response format:**
[Player Name]. [Position], [Team]. [Current projection range, format: proj X–Y points].
Safe because: [one-sentence floor justification]. ADP: [X]. GSE: [Y].

---

#### 3. "Give me the upside pick"

**Response format:**
[Player Name]. Ceiling: [projection ceiling]. Risk: [one-sentence downside]. Confidence:
[low/medium/high]. This is a swing — if you need a safe roster, take [alternative] instead.

---

#### 4. "Compare [A] and [B]"

**Response format:**
[A]: proj [X], floor [Y], ceiling [Z]. Risk: [one-sentence risk].
[B]: proj [X], floor [Y], ceiling [Z]. Risk: [one-sentence risk].
Take [A/B] because [one sentence]. [If similar value: "Coin flip — take the one your
roster needs more."]

---

#### 5. "Will [player] make it back to me?"

**Response format:**
[X]% based on [N] picks between your turns and [player]'s current ADP ([Y]). [If
high risk: "You'd likely need to take them now or accept a replacement."] [If low risk:
"You should be fine waiting."]

**Calculation:** survival probability from Draft Futures Engine (System 3). If Draft
Futures Engine has not been run for this player, say: "I don't have a survival
estimate — taking them now removes the risk."

---

#### 6. "Is this [position] run real?"

**Response format:**
[Yes/No/Uncertain]. [N] teams have drafted [position] in the last [M] picks.
[Analysis: "You need [position] in [round X] — this run affects your plan" or
"You have [rounds] before you must address [position] — let it run."]

---

#### 7. "What do I need next?"

**Response format:**
Priority 1: [Position]. Why: [one sentence]. Target round: [N].
Priority 2: [Position]. Why: [one sentence]. Target round: [N].
Priority 3: [Position]. Why: [one sentence]. Target round: [N].

---

#### 8. "What's my next two-round plan?"

**Response format:**
Round [N]: Take [Player/Position]. [Why — one sentence].
Round [N+1]: Take [Player/Position] if [player at N] is gone, take [backup].
Backup plan: [scenario description].

---

#### 9. "Am I panicking?"

**Response format:**
[Yes/No/Maybe].
[If yes: "Your last [N] picks went [positions in order] — you're chasing a run.
Disciplined move: [what to do instead]."]
[If no: "Last [N] picks were consistent with your plan. Stay the course."]
[If maybe: "Pick [N-1] was ADP-correct. Pick [N-2] was [X] rounds early. Watch your
next pick."]

---

#### 10. "What did [manager] do last year?"

**Response format:**
[Manager name] historically: [tendency 1], [tendency 2], [tendency 3].
Watch for: [specific pattern most likely to affect the current draft].

[If no history available: "[Manager name] has no GSE League Memory data. No profile
available."]

---

#### 11. "Are we repeating last year's mistake?"

**Response format:**
Checking... [Last year's comparable situation description]. Your pattern: [what you
did then]. This draft: [similarity to last year's situation].
Signal: [SAME / DIFFERENT / UNCERTAIN]. [If SAME: "This looks like that mistake.
Consider [alternative]."]

---

#### 12. "Best auction bid for [player]?"

**Response format:**
Fair value: $[X] (GSE projection-based). Market bid median: $[Y] (historical for
this player type). Bid up to $[Z] — above that, you're paying for ownership, not value.
Your remaining budget: $[B]. This is [X]% of your budget.

[If auction data unavailable: "I don't have auction value benchmarks — use your own
budget and projected points as guide."]

---

### Privacy and Data Handling

1. **League memory is user-owned.** The user who uploads their league data is the
   sole owner. It is not used to train models, improve recommendations for other users,
   or shared with any third party.

2. **Manager profiles are private by default.** Manager Genome profiles derived from
   a user's upload are visible only to that user's account. They cannot be viewed by
   the profiled manager unless that manager independently uploads the same league.

3. **Platform sync requires explicit user OAuth consent.** No platform data is
   accessed without a visible, user-initiated authentication flow with clear scope
   disclosure.

4. **Voice data is ephemeral by default.** Voice audio is transcribed client-side.
   No audio is transmitted to GSE servers. Text transcripts are retained for 24
   hours (for draft session review) unless the user enables persistent storage.

5. **Deletion applies to all derived data.** If a user deletes their league data,
   all derived Manager Genome records, Regret Analysis records, and Bias Mirror
   patterns derived from that league are also deleted.

---

## 7. Live Draft Sync Design (Gated)

**This section is FOUNDER-GATED.**

Live draft sync reads draft picks from a fantasy platform as they happen, feeding
the Fantasy War Room (System 2) without manual pick entry. This section documents
the technical and legal posture for each platform.

No live sync feature may be activated for any platform without:
1. Legal review confirming the sync method is permitted under platform terms
2. Founder activation of the feature flag
3. User-initiated OAuth consent with specific scope disclosure

---

### Sleeper

**API documentation:** Sleeper publishes a public REST API at `https://api.sleeper.app/v1/`.

**Draft data access:**
- `GET /draft/{draft_id}` — draft metadata
- `GET /draft/{draft_id}/picks` — all picks in a draft (appears to be available
  without authentication for public drafts)
- `GET /league/{league_id}/drafts` — drafts in a league

**Auth model:** Sleeper's public API documentation does not require API keys for
read access to league and draft data. Source gap: whether commercial use of their
API for a third-party subscription product is permitted by Sleeper's terms of
service has not been confirmed. Sleeper's terms must be reviewed before production
use.

**Rate limits:** Source gap — not confirmed in public documentation.

**Terms posture:** UNDER_REVIEW. Must confirm commercial use permission before
activation.

**GSE recommendation:** CONDITIONAL_PERMISSION. Technical implementation is feasible.
Legal confirmation required. This is the highest-priority platform for live sync.

---

### Yahoo Fantasy

**API documentation:** Yahoo has an official Fantasy Sports API as part of the Yahoo
Developer Network (YDN): `https://developer.yahoo.com/fantasysports/guide/`.

**Draft data access (source gap — verify current status):**
- Yahoo's API covers league, roster, and player endpoints
- Draft results endpoint: `GET /fantasy/v2/league/{league_key}/draftresults`
  appears to be documented. Live draft room access (real-time picks during the draft)
  is not confirmed in public documentation.
- Source gap: whether real-time draft pick access is available via Yahoo's API
  needs confirmation against current API documentation.

**Auth model:** Yahoo OAuth 2.0. User must authorize GSE as an application.
Application registration required (Yahoo Developer Network).

**Rate limits:** Source gap — not confirmed.

**Terms posture:** UNDER_REVIEW. Yahoo requires application registration for API access.
Commercial use terms and data licensing must be confirmed.

**GSE recommendation:** UNDER_REVIEW. Historical draft results likely accessible with
OAuth. Real-time live sync requires further research.

---

### ESPN Fantasy

**API documentation:** ESPN does not publish an official third-party fantasy API.
Access is possible via their internal APIs (observed and used by third-party tools),
but these are not officially documented or supported.

**Source gap:** ESPN's ToS explicitly restricts automated access to their services.
Third-party tools using ESPN's undocumented API do so at their own legal risk.

**Terms posture:** NOT_PERMITTED under current ToS without explicit written permission.

**GSE recommendation:** NOT_PERMITTED. Do not build ESPN live sync without explicit
written permission from ESPN. Support manual entry as the only path for ESPN leagues.

---

### Fantrax

**API documentation:** Source gap — Fantrax has offered API access to developers in
the past, but the current status and terms are not confirmed.

**Terms posture:** UNKNOWN. Must contact Fantrax developer relations before
implementation.

**GSE recommendation:** UNDER_REVIEW. Contact developer@fantrax.com to clarify
API availability and terms.

---

### MyFantasyLeague (MFL)

**API documentation:** MFL has a documented XML/JSON API. Source gap — the current
terms for third-party commercial use are not confirmed.

**Terms posture:** UNKNOWN.

**GSE recommendation:** UNDER_REVIEW. Low priority relative to Sleeper and Yahoo.

---

### Compliance Status Summary Table

| Platform | API Available | Live Draft | Auth | Terms | GSE Status |
|---|---|---|---|---|---|
| Sleeper | Yes (public) | Yes (read) | None/implicit | UNDER_REVIEW | UNDER_REVIEW |
| Yahoo | Yes (official) | Uncertain | OAuth 2.0 | UNDER_REVIEW | UNDER_REVIEW |
| ESPN | Unofficial only | Unknown | Not offered | NOT_PERMITTED | NOT_PERMITTED |
| Fantrax | Unknown | Unknown | Unknown | UNKNOWN | UNDER_REVIEW |
| MFL | Yes (documented) | Unknown | API key | UNKNOWN | UNDER_REVIEW |
| CBS | Unknown | Unknown | Unknown | UNKNOWN | UNDER_REVIEW |

All entries with status other than NOT_PERMITTED require founder review before any
code is written that reads from that platform's data.

---

*End of GSE League Memory Graph + Voice Jarvis Design Specification*
