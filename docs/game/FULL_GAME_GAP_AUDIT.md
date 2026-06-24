# Full Game Gap Audit

Date: 2026-06-20

| Area | Status | Evidence | Remaining Work |
| --- | --- | --- | --- |
| First town floor | Shipped playable slice, visually hardened | `/galaxy/campus/rookie-plaza`, `packages/galaxy-spatial/src/world-builder.ts`, `reports/game-qa/rookie-plaza-idle.png` | Authored final GLB environment art and texture pass |
| Avatar movement | Shipped, second-pass desktop/mobile split | Keyboard movement plus coarse-pointer touch joystick in `rookie-plaza-client.tsx` | Real-device mobile QA, safe-area tuning, optional haptics |
| NPCs | Shipped v1 | 12+ NPCs surfaced from `NPCS`, procedural multi-part NPC meshes | Final character art and animation set |
| Quests | Shipped v1 | 20 quests and quest event rules in game kernel; first six completable in Rookie Plaza | Deeper quest scripting and persistence UI |
| Inventory | Shipped v1 | 25 rights-safe items surfaced and claimable | Final item art and richer item inspection |
| Skills/progression | Shipped v1 | 10 skills, First Signal reward path, quest rewards | More repeatable grind loops |
| PvM bosses | Shipped v1 | Public Trap route plus five boss definitions | Spatial boss arena |
| Blacktop | Shipped v1 | Phaser Signal Sprint court | Timed score submit and reward wiring |
| Ghost presence | Live locally, not websocket-hosted | Disclosed ghost routes, Colyseus room contract, local live-room adapter, room roster | Deploy websocket server and connect client SDK before marketing as multiplayer |
| Beat Broadcast Wall | Built as spatial instrument | Babylon spatial instrument with backplane, rings, towers, ticks, route trails, ledger controls; current browser screenshot is green | Final authored wall art, audio bed, and higher-order interaction scoring |
| Mobile movement | Second pass implemented | Touch joystick appears only on coarse-pointer devices; keyboard remains desktop primary | Full real-device QA and safe-area tuning |
| Engine choices | Decided and integrated | Babylon, Phaser, Colyseus installed, routed, tested, and documented | Production hosting, bundle budget tuning, and websocket ops |
| Cinematic direction | Shipped as kernel contract | IP-safe shot rules and launch teaser beats | Generate owner-approved teaser assets |
| External repo reuse | Safe pattern reuse only | `REPO_TO_FEATURE_TRACE.md`, `REPO_ORACLE.md` | License verification before copying any code/assets |

## Main Forecast Risks

- Windows file locks can block Prisma generation and Next cache writes; stop stale Node processes before treating these as app regressions.
- Next dev may attempt remote font fetches and log abort noise during interrupted probes; production build with `NODE_OPTIONS=--use-system-ca` is the stronger evidence.
- Procedural Babylon assets are now strong enough for playable-slice QA, but the launch art target still needs final authored GLB/texture assets before a polished public trailer or store page.
- Presence should be described as local room simulation/ghost disclosure until the Colyseus websocket service is deployed and browser-connected.
- Expanded quest/inventory drawers are useful for operator proof, but future passes should continue moving dense progression information into diegetic prompts, map markers, and pause/journal surfaces.
