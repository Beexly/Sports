---
name: full-board-360-game-dossier-and-firewall-loop
description: Evaluates all 77+ DraftKings and sportsbook market types per NFL game across quarters, halves, QB/skill props, kicking, IDP, and TD scorers, enforces the -250/-300+ heavy-juice firewall and 5-Stage Conjunction Gate, and verifies paywall-redacted storefront copy. Use for Tuesday lookahead sweeps, TNF/Sunday/MNF full-board locks, or verified steam/injury moves.
metadata:
  source-workflow: workflows/full-board-360-game-dossier-and-firewall-loop.md
  loop-mode: loop-me
---


# 360-Degree Full-Board Market Review, Heavy-Juice Firewall & Storefront Publish Loop (`loop-me`)

## Loop Definition

A recurring pre-game workflow that evaluates every single DraftKings / sportsbook market (`~1,800+` items / `77+` market types per game across `1Q–4Q`, `1H/2H`, `QB/Skill Full-Game & Longest`, `Kicking`, `Defense/IDP Sacks & Tackles`, and `TD Scorers`), enforces the `-250` / `-300+` Heavy-Juice Sportsbook Firewall and 5-Stage Conjunction Gate (`PASS` discipline), and publishes human-readable, paywall-redacted call sheets to `origin/main` (`https://www.galaxysportsedge.com` & `apps/mobile`).

## Use this skill when

- Running scheduled full-board market locks on Tuesday (`14:00 America/Chicago`), Thursday (`17:00 America/Chicago`), Sunday (`09:30 America/Chicago`), or Monday (`17:00 America/Chicago`).
- Re-evaluating a game environment after a verified steam move (`>= 1.5 pts` on spread/total or `>= 25 cents` on prop juice) or key starter injury ruling.
- Auditing call-sheet tickets against the `-250` / `-300+` heavy-juice firewall, 5-Stage Conjunction Gate (`publishAllowed`), `node Beexly/Sports/scripts/trust-gate.mjs`, and `node apps/mobile/Beexly/Sports/scripts/lint-rules.js`.

## Do not use this skill when

- Ingesting new research repositories or PDFs into the mind corpus (use `continuous-corpus-ingestion-and-wiring-loop`).
- Grading post-game settled bets or recalibrating James-Stein metric weights after final whistle (use `continuous-post-game-learning-and-pathwise-calibration-loop`).
- Publishing any ticket where `independentEdge.decision == "PASS"` or exposing internal pipeline jargon on public storefront surfaces.

## Instructions

### 1. Trigger Conditions

- **Schedule Trigger:**
  - Tuesday `14:00 America/Chicago` (Early Lookahead & Soft Opener Sweep).
  - Thursday `17:00 America/Chicago` (TNF Full-Board 360 Lock).
  - Sunday `09:30 America/Chicago` (Main Slate Full-Board 360 Lock).
  - Monday `17:00 America/Chicago` (MNF Full-Board 360 Lock).
- **Event Trigger:** Verified steam move (`>= 1.5 pts` spread/total or `>= 25 cents` prop juice) or key starter injury ruling.

### 2. Push Right (Autonomous Pre-Checkpoint Execution)

1. **Stage 1 & Stage 2 (Situational-First Context & 80-Rule Firewall):** Ingest coaching tendencies (`PROE+`, `dc_pressure`, `pressure_answer`, `script_elasticity`, `tempo`), external charting (`statrankings`, `@SamHoppen`, `@FantasyPtsData`, `@PattonAnalytics`, `@KoalatyStats`, `@WideLeft`), weather, rest/elevation, and active injuries (`player_gp` denominator).
2. **Stage 3 & Stage 4 (Situational JEV + 10,000-World Trajectory & Conformal Calibration):** Execute snap-by-snap trajectory vectors (`10,000 sims x 175 snaps = 1,750,000 snaps`), Blown-Lead Pathwise Calibration (`arXiv:2602.10784v1`), and Barber weighted conformal / FWL market residualization (`market_calibration_heads_2026.json`).
3. **Stage 5 (De-Vig, `-300` Heavy-Juice Firewall & Conjunction Gate):**
   - Reject any straight bet or parlay leg priced worse than `-250` (and hard-block `-300+` heavy-juice traps), automatically evaluating alternate spreads, `1Q`/`1H` derivatives, or `PASS`.
   - Never publish any ticket where `independentEdge.decision == "PASS"` (`publishAllowed: false`).
4. **Storefront & Mobile Gate Verification:** Run `node Beexly/Sports/scripts/trust-gate.mjs`, `node apps/mobile/Beexly/Sports/scripts/lint-rules.js` (confirming `XX/100` confidence format and zero robotic math jargon on public copy), and server-side `FREE` vs. `PRO` paywall redaction (`intelligence/dfs/full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py`).

### 3. Checkpoint & Brief Delivery

- **Single Late Human Checkpoint:** Founder (`Garrett`) reviews the signed call-sheet brief before final `git push origin main` or social card release.
- **Brief Artifact:** `docs/engine/research/2026-11-07/full-stack-orchestration-200pt-dfs-and-projections-receipt.json`
- **Brief Contents:** Signed tickets clearing the conjunction gate across all 7 market families, heavy-juice traps blocked by the `-300` firewall, `PASS` count, and guardrail verification status (`trust-gate` + `lint-rules`).
