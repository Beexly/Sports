# MySportsFeeds/mysportsfeeds-node — Dossier

**Stars:** 65 (verified 2026-10-02) · **Language:** JavaScript · **Pushed:** 2023-04-18 (stale; 9 open issues) · **Created:** 2017-06-20

## 1. Vision
The official Node.js wrapper for the MySportsFeeds sports-data API: developer-friendly multi-league feeds (NFL, NBA, MLB, NHL) with league/season/feed/params as the only calling convention. "Free for non-commercial use."

## 2. The Ask
A MySportsFeeds account (free tier non-commercial; v2.0 needs a donation). API key + account password auth. Version 1.2 vs 2.0 feed semantics.

## 3. Constraints
- **License: MIT** (wrapper) — but the *data* is a paid/donated commercial API. Wrapper license ≠ data license.
- Garrett already holds an account on this service (2026-09-18 API-account inventory: baxley.garrett@gmail.com on MySportsFeeds). Free tier is non-commercial only; GSE is commercial — check the actual tier and terms before piping it into production signals.
- Stale wrapper (2023); the company may have changed feed versions since.

## 4. GSE lens
The useful question here isn't the wrapper — it's whether MySportsFeeds fills any GSE producer gap (schedule, injuries, odds, DFS salaries). Garrett already has the account, and the 47-signal registry needs producers. But the trap is the license: **free-for-non-commercial data cannot feed a commercial prediction engine without a paid tier**, and GSE is a commercial engine. The blunt read: MySportsFeeds is only interesting if the paid tier is bought and the terms allow redistribution-adjacent use in model features (data used as features, not redistributed — GSE's public site shows projections only, which helps). As of now it's an unused account, not an asset.

## 5. Verdict
**IGNORE** (for now) — Wrapper is stale, data tier is non-commercial-free, and nflverse/ESPN keyless sources cover the same ground. Revisit only if a specific GSE producer needs a feed nflverse lacks and the commercial tier is funded.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/MySportsFeeds/mysportsfeeds-node
- Gitdiagram: https://gitdiagram.com/MySportsFeeds/mysportsfeeds-node
- Star history (65 stars): https://star-history.com/#MySportsFeeds/mysportsfeeds-node
- github.dev: https://github.dev/MySportsFeeds/mysportsfeeds-node
