# 360-Degree Full-Board Market Review, Heavy-Juice Firewall & Storefront Publish Loop (`loop-me`)

## Loop Definition
A recurring pre-game workflow that evaluates every single DraftKings / sportsbook market (`~1,800+` items / `77+` market types per game across `1Q–4Q`, `1H/2H`, `QB/Skill Full-Game & Longest`, `Kicking`, `Defense/IDP Sacks & Tackles`, and `TD Scorers`), enforces the `-250` / `-300+` Heavy-Juice Sportsbook Firewall and 5-Stage Conjunction Gate (`PASS` discipline), and publishes human-readable, paywall-redacted call sheets to `origin/main` (`https://www.galaxysportsedge.com` & `apps/mobile`).

## Trigger
- **Schedule Trigger:**
  - Tuesday `14:00 America/Chicago` (Early Lookahead & Soft Opener Sweep).
  - Thursday `17:00 America/Chicago` (TNF Full-Board 360 Lock).
  - Sunday `09:30 America/Chicago` (Main Slate Full-Board 360 Lock).
  - Monday `17:00 America/Chicago` (MNF Full-Board 360 Lock).
- **Event Trigger:** Verified steam move (`>= 1.5 pts` spread/total or `>= 25 cents` prop juice) or key starter injury ruling.

## Push Right (Autonomous Pre-Checkpoint Execution)
1. **Stage 1 & Stage 2 (Situational-First Context & 80-Rule Firewall):** Ingest coaching tendencies (`PROE+`, `dc_pressure`, `pressure_answer`, `script_elasticity`, `tempo`), external charting (`statrankings`, `@SamHoppen`, `@FantasyPtsData`, `@PattonAnalytics`, `@KoalatyStats`, `@WideLeft`), weather, rest/elevation, and active injuries (`player_gp` denominator).
2. **Stage 3 & Stage 4 (Situational JEV + 10,000-World Trajectory & Conformal Calibration):** Execute snap-by-snap trajectory vectors (`10,000 sims x 175 snaps = 1,750,000 snaps`), Blown-Lead Pathwise Calibration (`arXiv:2602.10784v1`), and Barber weighted conformal / FWL market residualization (`market_calibration_heads_2026.json`).
3. **Stage 5 (De-Vig, `-300` Heavy-Juice Firewall & Conjunction Gate):**
   - Reject any straight bet or parlay leg priced worse than `-250` (and hard-block `-300+` heavy-juice traps), automatically evaluating alternate spreads, `1Q`/`1H` derivatives, or `PASS`.
   - Never publish any ticket where `independentEdge.decision == "PASS"` (`publishAllowed: false`).
4. **Storefront & Mobile Gate Verification:** Run `node scripts/trust-gate.mjs`, `node apps/mobile/scripts/lint-rules.js` (confirming `XX/100` confidence format and zero robotic math jargon on public copy), and server-side `FREE` vs. `PRO` paywall redaction (`intelligence/dfs/full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py`).

## Checkpoint
- **Single Late Human Checkpoint:** Founder (`Garrett`) reviews the signed call-sheet brief before final `git push origin main` / social card release.

## Brief
- **Brief Artifact:** `docs/engine/research/2026-11-07/full-stack-orchestration-200pt-dfs-and-projections-receipt.json`
- **Contents:** Signed tickets clearing the conjunction gate across all 7 market families, heavy-juice traps blocked by the `-300` firewall, `PASS` count, and guardrail verification status (`trust-gate` + `lint-rules`).
