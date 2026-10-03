# Full-session leverage atlas — 2026-08-09

**Directive:** ALL domains. No hyperfixation. R&D from this session is inventoried
and mapped to **code already on main**, **PRs open**, and **founder clicks**.

## Production truth (live probe)

| Field | Value | Leverage |
| --- | --- | --- |
| Production SHA | lagging (`56cbdc6…` earlier) | **Redeploy main** so 398–408 land |
| Settlement | HEALTHY, 0 overdue | Free settle path ready |
| Canonical settled | 1017 (≥100 floor) | Sample OK; PROVEN still RED |
| Calibration | RED (Brier 0.27, ECE 0.11, RES≈0.002) | Ranking path shipped; maps OFF |
| Odds insert | stale since ~2026-07-25 | Market board dark; **signal board** OK |
| Free-spine | present, SLA stale | Re-run free-spine-health |
| Money path | ready | Waitlist/public OK when gate off |
| Credit stack | free-lane + Azure/Vertex | Keep cash Anthropic last |
| Autonomy | EXECUTE on safe crons | free-spine, settle, odds, drafts, cal |

## What this session already shipped (main)

| PR | Domain | Value |
| --- | --- | --- |
| #391–#401 | Founding / cal R&D / proven path | Floors, selective, Murphy explainers |
| #398–#408 | Independents + ranking law | Kalshi/FPI/ClubElo/DC; no edge-as-p |
| Open #409 | Surfaces sort by rankingP | User-visible demotions |

## Open PRs (multi-domain — merge carefully)

| PR | Domain | Action |
| --- | --- | --- |
| #409 | Ranking surfaces | Merge after CI |
| #402 | Ranking Power Control Plane UI | Review; optional instrument |
| #370 | Jynx prompt-cache + max_tokens | **High leverage** cost — land if green |
| #371 | Honesty soft-land /live + odds cron | Review honesty copy |
| #372 | Honesty real edits | Review |
| #258 | APEX OS | Founder YES only |

## Founder P0 clicks (code ready — not agent-doable)

1. **Redeploy Production → main HEAD** (SHA lag kills every ship).
2. **Odds:** restore `THE_ODDS_API_KEY` quota **or** keep `PUBLIC_BOARD_SURFACE=signal` (never invent lines / never lower SLA).
3. **Waitlist:** `GSE_WAITLIST_GATE_ENABLED=false` if still gated.
4. **Credits:** keep free-lane + cloud maps; claim Action Packs (Neon/Vercel/AI/Azure).
5. **Machina:** `machina login` on your machine → paste org/project JSON (see `docs/ops/machina/MACHINA_CLI_FOUNDER.md`).
6. **Never:** claim PROVEN / ROI while RED; never enable maps / AUTO_PUBLISH until GREEN×K.

## Multi-domain code leverage map (this wave + next)

### A. Free spine / quiet board / odds honesty
- Quiet board + signal surface already coded; public dark-reason taxonomy unified (`PublicDarkReason`).
- Free-spine re-probe via autonomy or cron.
- WS-B free **game creation** still open (scores update only) — next free-spine PR.

### B. Content / distribution
- RSS wire dark until `NEWS_RSS_FEEDS` **or** `NEWS_RSS_USE_CURATED_DEFAULTS=true`.
- Curated ESPN/BBC/Sky catalog from sports-skills harvest.
- Twitter post-mortem thread templates exist; content engine templates for slate/promo.
- Thin archives (2 podcast / 3 newsletter) — free-lane generate + human review.

### C. Tools / B2B / embed
- `/tools` betting math + line-movement CLV helpers.
- Free embed: `/embed/edge-index/[gameId]`.
- B2B `/api/v1/signals` + `/probabilities` — experimental posture; rankingP on signals.

### D. Calibration (beyond ranking math)
- Murphy/RES/conformal inventory on ops truth.
- Maps offline-only; AUTO_PUBLISH false.
- Next: real `export:settled-picks` + offline artifact SHA, not more maps.

### E. LLM cost
- Prompt cache on many surfaces; free-lane content $0.
- Land #370 for observability ceilings.
- Secondary free lane env optional.

### F. Research harvest (ported or bookmarked)
| Source | Status |
| --- | --- |
| sports-skills Kalshi series | Live config saved; GSE maps aligned |
| sports-skills news RSS | Curated defaults + docs |
| sports-skills betting line_movement | Ported to public tools math |
| machina-cli | Installed agent-side; founder login needed |
| sportsclaw MCP/clipper | Bookmarked for next media/MCP PR |
| Awesome PM tools | `docs/research/prediction-market-tool-bookmarks.md` |
| Oddpool full catalog triage | `docs/research/prediction-market-ecosystem-triage-2026-08-09.md` |
| polymarket | Internal hold unchanged |

### G. Product brands (StatKing / Helm / PickPilot / Clubhouse)
- StatKing: keep STATS_PUBLIC dark until rights+live.
- Helm/PickPilot: design-preview only — not production routes.
- Clubhouse: not a live product surface.

## Hard non-goals (session integrity)

- No Polymarket product / no arb bots  
- No floor relax / no edge-as-p  
- No free-path wipe / no invent odds  
- No LIVE_BOARD / PERFORMANCE_STATS marketing while RED  

## Success = all levers moving

| Lever | Owner | Proof |
| --- | --- | --- |
| Redeploy main | Founder | ops truth SHA matches main |
| Signal board live | Founder env + code | Picks not 503 stale when signal surface |
| Free settle path | Founder key posture | settle `path:free` when key absent |
| Content free-lane | Env already OK | free-lane smoke |
| Ranking RES | Code + time | v5.2.2 slate settles |
| B2B / tools | Code | public tools + API experimental |
| Machina | Founder login | org/project selected |
| Credits | Founder claims | Action Pack status in CREDITS.md |
